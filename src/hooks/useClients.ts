import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  birthdate: string | null;
  vehicle: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFormData {
  name: string;
  phone: string;
  birthdate?: string;
  vehicle?: string;
  notes?: string;
}

export const useClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const createClient = async (clientData: ClientFormData): Promise<Client | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: clientData.name,
          phone: clientData.phone,
          birthdate: clientData.birthdate || null,
          vehicle: clientData.vehicle || null,
          notes: clientData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setClients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: 'Cliente criado',
        description: `${clientData.name} foi adicionado com sucesso.`,
      });

      return data;
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o cliente.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateClient = async (id: string, clientData: Partial<ClientFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', id);

      if (error) throw error;

      setClients((prev) =>
        prev.map((client) =>
          client.id === id ? { ...client, ...clientData } : client
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      toast({
        title: 'Cliente atualizado',
        description: 'Os dados foram salvos com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cliente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients((prev) => prev.filter((client) => client.id !== id));

      toast({
        title: 'Cliente removido',
        description: 'O cliente foi excluído com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o cliente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    isLoading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
};
