import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PrecificacaoDetalhes {
  material_principal?: { valor: number; desconto: number };
  materiais_adicionais?: Array<{ nome: string; valor: number; desconto: number }>;
  service_id?: string | null;
}

export interface Precificacao {
  id: string;
  user_id: string;
  service_id: string | null;
  nome_servico: string;
  custo_material_total: number;
  custo_mao_obra: number;
  margem_lucro: number;
  aliquota_imposto: number;
  comissao_avista: number;
  comissao_parcelado: number;
  taxa_cartao_6x: number;
  taxa_cartao_10x: number;
  preco_sn: number;
  preco_avista: number;
  preco_6x: number;
  preco_10x: number;
  detalhes: PrecificacaoDetalhes;
  created_at: string;
  updated_at: string;
}

export type PrecificacaoFormData = Omit<
  Precificacao,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export function usePrecificacoes() {
  const { user } = useAuth();
  const [precificacoes, setPrecificacoes] = useState<Precificacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPrecificacoes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("precificacoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar precificações", error);
      toast.error("Erro ao carregar precificações salvas");
    } else {
      setPrecificacoes((data || []) as unknown as Precificacao[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPrecificacoes();
  }, [fetchPrecificacoes]);

  const createPrecificacao = async (data: PrecificacaoFormData) => {
    if (!user) return null;
    setIsSaving(true);
    const payload = { ...data, user_id: user.id, detalhes: data.detalhes as any };
    const { data: created, error } = await supabase
      .from("precificacoes")
      .insert(payload)
      .select()
      .single();
    setIsSaving(false);
    if (error) {
      toast.error("Erro ao salvar cálculo");
      return null;
    }
    toast.success("Cálculo salvo com sucesso!");
    await fetchPrecificacoes();
    return created as unknown as Precificacao;
  };

  const updatePrecificacao = async (id: string, data: PrecificacaoFormData) => {
    if (!user) return null;
    setIsSaving(true);
    const { data: updated, error } = await supabase
      .from("precificacoes")
      .update({ ...data, detalhes: data.detalhes as any })
      .eq("id", id)
      .select()
      .single();
    setIsSaving(false);
    if (error) {
      toast.error("Erro ao atualizar cálculo");
      return null;
    }
    toast.success("Cálculo atualizado!");
    await fetchPrecificacoes();
    return updated as unknown as Precificacao;
  };

  const deletePrecificacao = async (id: string) => {
    const { error } = await supabase.from("precificacoes").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir cálculo");
      return false;
    }
    toast.success("Cálculo excluído");
    await fetchPrecificacoes();
    return true;
  };

  return {
    precificacoes,
    isLoading,
    isSaving,
    createPrecificacao,
    updatePrecificacao,
    deletePrecificacao,
    refetch: fetchPrecificacoes,
  };
}