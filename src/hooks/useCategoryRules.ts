import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { extractLearningToken, type CategoryRule } from "@/lib/imports/categorize";

export interface StoredCategoryRule extends CategoryRule {
  id: string;
  user_id: string;
  hit_count: number;
  auto_created: boolean;
  last_matched_at: string | null;
  created_at: string;
}

export function useCategoryRules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<StoredCategoryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const { data } = await (supabase as any)
      .from("category_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("hit_count", { ascending: false });
    setRules(((data as any) || []) as StoredCategoryRule[]);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createRule = async (data: Partial<CategoryRule>) => {
    if (!user?.id || !data.pattern || !data.category) return;
    const { error } = await (supabase as any).from("category_rules").insert({
      user_id: user.id,
      pattern: data.pattern.trim(),
      match_type: data.match_type || "contains",
      direction: data.direction || "any",
      category: data.category,
      auto_created: false,
      priority: data.priority ?? 100,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Regra criada" });
    fetchAll();
  };

  const updateRule = async (id: string, patch: Partial<CategoryRule>) => {
    const { error } = await (supabase as any).from("category_rules").update(patch as any).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const deleteRule = async (id: string) => {
    await (supabase as any).from("category_rules").delete().eq("id", id);
    fetchAll();
  };

  const promoteToManual = async (id: string) => {
    await updateRule(id, { auto_created: false } as any);
  };

  // Learn from a user confirmation. Upserts a learned rule using an extracted token.
  const learnFrom = async (
    description: string,
    direction: "in" | "out",
    category: string,
  ) => {
    if (!user?.id) return;
    const token = extractLearningToken(description);
    if (!token || token.length < 3) return;

    // Check existing rule for the same token
    const { data: existing } = await (supabase as any)
      .from("category_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("match_type", "contains")
      .eq("direction", direction === "in" ? "in" : "out")
      .ilike("pattern", token)
      .maybeSingle();

    if (existing) {
      // Don't override manual rules
      if (!existing.auto_created && existing.category !== category) return;
      await (supabase as any)
        .from("category_rules")
        .update({
          category,
          hit_count: (existing.hit_count || 0) + 1,
          last_matched_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await (supabase as any).from("category_rules").insert({
        user_id: user.id,
        pattern: token,
        match_type: "contains",
        direction: direction === "in" ? "in" : "out",
        category,
        auto_created: true,
        hit_count: 1,
        last_matched_at: new Date().toISOString(),
      });
    }
    fetchAll();
  };

  return { rules, isLoading, createRule, updateRule, deleteRule, promoteToManual, learnFrom, refetch: fetchAll };
}