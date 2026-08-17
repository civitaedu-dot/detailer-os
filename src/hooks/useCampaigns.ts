import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  message_template: string;
  filters: Record<string, any>;
  target_count: number;
  sent_count: number;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  sent_at: string | null;
  created_at: string;
  excluded_client_ids?: string[];
  manual_client_ids?: string[];
  selected_client_ids?: string[];
  is_draft?: boolean;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  message_sent: string;
  sent_at: string;
  returned: boolean;
  return_date: string | null;
}

export const useCampaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_draft", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const fetchDraft = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_draft", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setDraft((data as Campaign) || null);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => { fetchDraft(); }, [fetchDraft]);

  /** Creates or updates the single in-progress draft campaign for this user. */
  const saveDraft = useCallback(async (payload: Partial<Campaign>) => {
    if (!user) return null;
    try {
      if (draft?.id) {
        const { data, error } = await supabase
          .from("campaigns")
          .update({ ...payload, is_draft: true } as any)
          .eq("id", draft.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        setDraft(data as Campaign);
        return data as Campaign;
      }
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: payload.name || "Rascunho",
          objective: payload.objective || "geral",
          message_template: payload.message_template || "",
          filters: payload.filters || {},
          target_count: payload.target_count ?? 0,
          status: "draft",
          is_draft: true,
          excluded_client_ids: payload.excluded_client_ids || [],
          manual_client_ids: payload.manual_client_ids || [],
          selected_client_ids: payload.selected_client_ids || [],
          scheduled_date: payload.scheduled_date ?? null,
          scheduled_time: payload.scheduled_time ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      setDraft(data as Campaign);
      return data as Campaign;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [user, draft?.id]);

  const clearDraft = useCallback(async () => {
    if (!user || !draft?.id) { setDraft(null); return; }
    await supabase.from("campaigns").delete().eq("id", draft.id).eq("user_id", user.id);
    setDraft(null);
  }, [user, draft?.id]);

  const createCampaign = async (campaign: Omit<Campaign, "id" | "created_at" | "sent_at" | "sent_count">) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...campaign, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      await fetchCampaigns();
      toast({ title: "Campanha criada com sucesso!" });
      return data;
    } catch (e: any) {
      toast({ title: "Erro ao criar campanha", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("campaigns")
        .update(updates as any)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      await fetchCampaigns();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      await fetchCampaigns();
      toast({ title: "Campanha removida" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const saveCampaignRecipients = async (campaignId: string, recipients: { client_id: string | null; client_name: string; client_phone: string; message_sent: string }[]) => {
    if (!user) return;
    try {
      const rows = recipients.map((r) => ({
        campaign_id: campaignId,
        user_id: user.id,
        ...r,
      }));
      const { error } = await supabase.from("campaign_recipients").insert(rows as any);
      if (error) throw error;
    } catch (e: any) {
      console.error(e);
    }
  };

  const fetchRecipients = async (campaignId: string): Promise<CampaignRecipient[]> => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from("campaign_recipients")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []) as CampaignRecipient[];
    } catch {
      return [];
    }
  };

  return {
    campaigns,
    isLoading,
    draft,
    saveDraft,
    clearDraft,
    fetchDraft,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    saveCampaignRecipients,
    fetchRecipients,
    refetch: fetchCampaigns,
  };
};
