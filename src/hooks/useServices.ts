import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  default_price: number;
  duration_minutes: number;
  estimated_cost: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Novos campos para precificação
  calculated_price: number | null;
  material_cost: number;
  additional_cost: number;
  profit_margin: number;
}

export interface ServiceFormData {
  name: string;
  description?: string;
  default_price: number;
  duration_minutes: number;
  estimated_cost?: number;
  is_active?: boolean;
  // Novos campos para precificação
  calculated_price?: number | null;
  material_cost?: number;
  additional_cost?: number;
  profit_margin?: number;
}

export const useServices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('[useServices] Error fetching services:', error);
        throw error;
      }

      return data as Service[];
    },
    enabled: !!user?.id,
  });

  const activeServices = services.filter((s) => s.is_active);

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: newService, error } = await supabase
        .from('services')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          default_price: data.default_price,
          duration_minutes: data.duration_minutes,
          estimated_cost: data.estimated_cost || 0,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('[useServices] Error creating service:', error);
        throw error;
      }

      return newService as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: 'Serviço criado',
        description: 'O serviço foi adicionado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar serviço',
        description: 'Não foi possível criar o serviço. Tente novamente.',
        variant: 'destructive',
      });
      console.error('[useServices] Create error:', error);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceFormData> }) => {
      const { error } = await supabase
        .from('services')
        .update({
          name: data.name,
          description: data.description,
          default_price: data.default_price,
          duration_minutes: data.duration_minutes,
          estimated_cost: data.estimated_cost,
          is_active: data.is_active,
        })
        .eq('id', id);

      if (error) {
        console.error('[useServices] Error updating service:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: 'Serviço atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar serviço',
        description: 'Não foi possível atualizar o serviço. Tente novamente.',
        variant: 'destructive',
      });
      console.error('[useServices] Update error:', error);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);

      if (error) {
        console.error('[useServices] Error deleting service:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: 'Serviço removido',
        description: 'O serviço foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir serviço',
        description: 'Não foi possível excluir o serviço. Tente novamente.',
        variant: 'destructive',
      });
      console.error('[useServices] Delete error:', error);
    },
  });

  return {
    services,
    activeServices,
    isLoading,
    createService: createServiceMutation.mutateAsync,
    updateService: (id: string, data: Partial<ServiceFormData>) =>
      updateServiceMutation.mutateAsync({ id, data }),
    deleteService: deleteServiceMutation.mutateAsync,
    isCreating: createServiceMutation.isPending,
    isUpdating: updateServiceMutation.isPending,
    isDeleting: deleteServiceMutation.isPending,
  };
};
