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
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
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

  return { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign, saveCampaignRecipients, fetchRecipients, refetch: fetchCampaigns };
};
