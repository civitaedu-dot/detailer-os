import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FixedCost {
  id: string;
  name: string;
  value: number;
  description?: string;
  is_active: boolean;
}

export interface FixedCostInput {
  name: string;
  value: number;
  description?: string;
  is_active?: boolean;
}

export function useFixedCosts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchFixedCosts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setFixedCosts(
        (data || []).map((item) => ({
          id: item.id,
          name: item.name,
          value: Number(item.value),
          description: item.description || undefined,
          is_active: item.is_active,
        }))
      );
    } catch (error) {
      console.error('Error fetching fixed costs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const addFixedCost = async (cost: FixedCostInput) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('fixed_costs')
        .insert({
          user_id: user.id,
          name: cost.name,
          value: cost.value,
          description: cost.description,
          is_active: cost.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      setFixedCosts((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          value: Number(data.value),
          description: data.description || undefined,
          is_active: data.is_active,
        },
      ]);

      toast({
        title: "Custo adicionado!",
        description: `${cost.name} foi adicionado aos custos fixos.`,
      });

      return data;
    } catch (error) {
      console.error('Error adding fixed cost:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o custo fixo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateFixedCost = async (id: string, cost: Partial<FixedCostInput>) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('fixed_costs')
        .update({
          name: cost.name,
          value: cost.value,
          description: cost.description,
          is_active: cost.is_active,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setFixedCosts((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...cost } : c
        )
      );

      toast({
        title: "Custo atualizado!",
        description: "O custo fixo foi atualizado.",
      });
    } catch (error) {
      console.error('Error updating fixed cost:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o custo fixo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFixedCost = async (id: string) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('fixed_costs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setFixedCosts((prev) => prev.filter((c) => c.id !== id));

      toast({
        title: "Custo removido!",
        description: "O custo fixo foi removido.",
      });
    } catch (error) {
      console.error('Error deleting fixed cost:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o custo fixo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active status
  const toggleFixedCost = async (id: string) => {
    const cost = fixedCosts.find((c) => c.id === id);
    if (!cost) return;
    
    await updateFixedCost(id, { is_active: !cost.is_active });
  };

  // Calculate total active fixed costs
  const calculateTotalFixedCosts = useCallback(() => {
    return fixedCosts
      .filter((cost) => cost.is_active)
      .reduce((sum, cost) => sum + cost.value, 0);
  }, [fixedCosts]);

  useEffect(() => {
    if (user?.id) {
      fetchFixedCosts();
    }
  }, [user?.id, fetchFixedCosts]);

  return {
    fixedCosts,
    isLoading,
    isSaving,
    addFixedCost,
    updateFixedCost,
    deleteFixedCost,
    toggleFixedCost,
    calculateTotalFixedCosts,
    refetch: fetchFixedCosts,
  };
}
