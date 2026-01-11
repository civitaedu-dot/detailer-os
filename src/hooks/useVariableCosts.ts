import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface VariableCost {
  id: string;
  name: string;
  cost_type: 'percentage' | 'fixed';
  value: number;
  description?: string;
}

export interface VariableCostInput {
  name: string;
  cost_type: 'percentage' | 'fixed';
  value: number;
  description?: string;
}

export function useVariableCosts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchVariableCosts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('variable_costs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setVariableCosts(
        (data || []).map((item) => ({
          id: item.id,
          name: item.name,
          cost_type: item.cost_type as 'percentage' | 'fixed',
          value: Number(item.value),
          description: item.description || undefined,
        }))
      );
    } catch (error) {
      console.error('Error fetching variable costs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const addVariableCost = async (cost: VariableCostInput) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('variable_costs')
        .insert({
          user_id: user.id,
          name: cost.name,
          cost_type: cost.cost_type,
          value: cost.value,
          description: cost.description,
        })
        .select()
        .single();

      if (error) throw error;

      setVariableCosts((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          cost_type: data.cost_type as 'percentage' | 'fixed',
          value: Number(data.value),
          description: data.description || undefined,
        },
      ]);

      toast({
        title: "Custo adicionado!",
        description: `${cost.name} foi adicionado aos custos variáveis.`,
      });

      return data;
    } catch (error) {
      console.error('Error adding variable cost:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o custo variável.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateVariableCost = async (id: string, cost: VariableCostInput) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('variable_costs')
        .update({
          name: cost.name,
          cost_type: cost.cost_type,
          value: cost.value,
          description: cost.description,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setVariableCosts((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, ...cost }
            : c
        )
      );

      toast({
        title: "Custo atualizado!",
        description: `${cost.name} foi atualizado.`,
      });
    } catch (error) {
      console.error('Error updating variable cost:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o custo variável.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVariableCost = async (id: string) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('variable_costs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setVariableCosts((prev) => prev.filter((c) => c.id !== id));

      toast({
        title: "Custo removido!",
        description: "O custo variável foi removido.",
      });
    } catch (error) {
      console.error('Error deleting variable cost:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o custo variável.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total percentage from all costs
  const calculateTotalPercentage = useCallback((monthlyRevenue: number) => {
    let totalPercentage = 0;

    variableCosts.forEach((cost) => {
      if (cost.cost_type === 'percentage') {
        totalPercentage += cost.value;
      } else if (cost.cost_type === 'fixed' && monthlyRevenue > 0) {
        // Convert fixed costs to percentage of revenue
        const percentageEquivalent = (cost.value / monthlyRevenue) * 100;
        totalPercentage += percentageEquivalent;
      }
    });

    return totalPercentage;
  }, [variableCosts]);

  useEffect(() => {
    if (user?.id) {
      fetchVariableCosts();
    }
  }, [user?.id, fetchVariableCosts]);

  return {
    variableCosts,
    isLoading,
    isSaving,
    addVariableCost,
    updateVariableCost,
    deleteVariableCost,
    calculateTotalPercentage,
    refetch: fetchVariableCosts,
  };
}
