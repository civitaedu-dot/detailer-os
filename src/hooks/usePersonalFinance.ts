import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  historyStart, type PersonalBudget, type PersonalGoal, type PersonalTx,
} from "@/lib/personalFinance";

const KEYS = {
  tx: ["personal", "transactions"],
  budgets: ["personal", "budgets"],
  goals: ["personal", "goals"],
};

export function useInvalidatePersonal() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["personal"] });
}

export function usePersonalTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.tx,
    enabled: !!user,
    queryFn: async (): Promise<PersonalTx[]> => {
      const { data, error } = await supabase
        .from("personal_transactions")
        .select("*")
        .gte("tx_date", historyStart())
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount), type: t.type as PersonalTx["type"] }));
    },
  });
}

export function useSaveTransaction() {
  const { user } = useAuth();
  const invalidate = useInvalidatePersonal();
  return useMutation({
    mutationFn: async (tx: Omit<PersonalTx, "id"> & { id?: string }) => {
      const { id, ...fields } = tx;
      const q = id
        ? supabase.from("personal_transactions").update(fields).eq("id", id)
        : supabase.from("personal_transactions").insert({ ...fields, user_id: user!.id });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidatePersonal();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useTogglePaid() {
  const invalidate = useInvalidatePersonal();
  return useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase.from("personal_transactions").update({ is_paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function usePersonalBudgets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.budgets,
    enabled: !!user,
    queryFn: async (): Promise<PersonalBudget[]> => {
      const { data, error } = await supabase.from("personal_budgets").select("*").order("category");
      if (error) throw error;
      return (data ?? []).map((b) => ({ id: b.id, category: b.category, monthly_limit: Number(b.monthly_limit) }));
    },
  });
}

export function useSaveBudget() {
  const { user } = useAuth();
  const invalidate = useInvalidatePersonal();
  return useMutation({
    mutationFn: async ({ category, monthly_limit }: { category: string; monthly_limit: number }) => {
      const { error } = await supabase
        .from("personal_budgets")
        .upsert({ user_id: user!.id, category, monthly_limit }, { onConflict: "user_id,category" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidatePersonal();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function usePersonalGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.goals,
    enabled: !!user,
    queryFn: async (): Promise<PersonalGoal[]> => {
      const { data, error } = await supabase.from("personal_goals").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map((g) => ({
        id: g.id, name: g.name, deadline: g.deadline,
        target_amount: Number(g.target_amount), current_amount: Number(g.current_amount),
      }));
    },
  });
}

export function useSaveGoal() {
  const { user } = useAuth();
  const invalidate = useInvalidatePersonal();
  return useMutation({
    mutationFn: async (g: Omit<PersonalGoal, "id"> & { id?: string }) => {
      const { id, ...fields } = g;
      const q = id
        ? supabase.from("personal_goals").update(fields).eq("id", id)
        : supabase.from("personal_goals").insert({ ...fields, user_id: user!.id });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidatePersonal();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
