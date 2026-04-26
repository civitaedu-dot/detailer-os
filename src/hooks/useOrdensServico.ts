import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type OrdemStatus = 'aguardando' | 'em_andamento' | 'concluido';
export type OrdemPrioridade = 'normal' | 'urgente';

export interface OrdemServico {
  id: string;
  user_id: string;
  cliente_id: string | null;
  cliente_nome: string;
  modelo_veiculo: string | null;
  ano_veiculo: string | null;
  placa: string | null;
  cor: string | null;
  quilometragem: string | null;
  descricao_servico: string;
  responsavel_nome: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
  status: OrdemStatus;
  prioridade: OrdemPrioridade;
  created_at: string;
  updated_at: string;
}

export interface OrdemServicoFormData {
  cliente_id?: string | null;
  cliente_nome: string;
  modelo_veiculo?: string;
  ano_veiculo?: string;
  placa?: string;
  cor?: string;
  quilometragem?: string;
  descricao_servico: string;
  responsavel_nome?: string;
  responsavel_id?: string | null;
  observacoes?: string;
  status: OrdemStatus;
  prioridade: OrdemPrioridade;
}

const sortOrdens = (list: OrdemServico[]) =>
  [...list].sort((a, b) => {
    // Urgentes no topo
    if (a.prioridade !== b.prioridade) {
      return a.prioridade === 'urgente' ? -1 : 1;
    }
    // Concluídos no final
    const statusOrder: Record<OrdemStatus, number> = {
      em_andamento: 0,
      aguardando: 1,
      concluido: 2,
    };
    if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

export const useOrdensServico = (clienteId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrdens = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase
        .from('ordens_servico')
        .select('*')
        .eq('user_id', user.id);

      if (clienteId) query = query.eq('cliente_id', clienteId);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setOrdens(sortOrdens((data || []) as OrdemServico[]));
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as ordens de serviço.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, clienteId, toast]);

  const createOrdem = async (formData: OrdemServicoFormData): Promise<OrdemServico | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .insert({
          user_id: user.id,
          cliente_id: formData.cliente_id || null,
          cliente_nome: formData.cliente_nome,
          modelo_veiculo: formData.modelo_veiculo || null,
          ano_veiculo: formData.ano_veiculo || null,
          placa: formData.placa || null,
          cor: formData.cor || null,
          quilometragem: formData.quilometragem || null,
          descricao_servico: formData.descricao_servico,
          responsavel_nome: formData.responsavel_nome || null,
          responsavel_id: formData.responsavel_id || null,
          observacoes: formData.observacoes || null,
          status: formData.status,
          prioridade: formData.prioridade,
        })
        .select()
        .single();
      if (error) throw error;
      setOrdens((prev) => sortOrdens([...(prev), data as OrdemServico]));
      toast({ title: 'Ordem criada', description: 'Ordem de serviço registrada com sucesso.' });
      return data as OrdemServico;
    } catch (error) {
      console.error('Erro ao criar ordem:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a ordem.', variant: 'destructive' });
      return null;
    }
  };

  const updateOrdem = async (id: string, formData: Partial<OrdemServicoFormData>): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .update(formData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setOrdens((prev) => sortOrdens(prev.map((o) => (o.id === id ? (data as OrdemServico) : o))));
      toast({ title: 'Ordem atualizada', description: 'Alterações salvas.' });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
      return false;
    }
  };

  const deleteOrdem = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (error) throw error;
      setOrdens((prev) => prev.filter((o) => o.id !== id));
      toast({ title: 'Ordem removida', description: 'A ordem foi excluída.' });
      return true;
    } catch (error) {
      console.error('Erro ao excluir ordem:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    fetchOrdens();
  }, [fetchOrdens]);

  return { ordens, isLoading, fetchOrdens, createOrdem, updateOrdem, deleteOrdem };
};