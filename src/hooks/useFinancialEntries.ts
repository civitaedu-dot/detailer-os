import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FinancialEntry {
  id: string;
  user_id: string;
  appointment_id: string | null;
  client_id: string | null;
  client_name: string | null;
  entry_type: string;
  description: string;
  value: number;
  entry_date: string;
  notes: string | null;
  is_automatic: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialEntryFormData {
  appointment_id?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  entry_type: string;
  description: string;
  value: number;
  entry_date: string;
  notes?: string | null;
  is_automatic?: boolean;
}

export function useFinancialEntries(startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('financial_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (startDate) {
        query = query.gte('entry_date', toLocalDateString(startDate));
      }

      if (endDate) {
        query = query.lte('entry_date', toLocalDateString(endDate));
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching financial entries:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as entradas financeiras.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, startDate, endDate, toast]);

  const createEntry = async (data: FinancialEntryFormData): Promise<FinancialEntry | null> => {
    if (!user?.id) return null;

    try {
      const { data: newEntry, error } = await supabase
        .from('financial_entries')
        .insert({
          user_id: user.id,
          appointment_id: data.appointment_id || null,
          client_id: data.client_id || null,
          client_name: data.client_name || null,
          entry_type: data.entry_type,
          description: data.description,
          value: data.value,
          entry_date: data.entry_date,
          notes: data.notes || null,
          is_automatic: data.is_automatic || false,
        })
        .select()
        .single();

      if (error) throw error;

      setEntries((prev) => [newEntry, ...prev]);

      if (!data.is_automatic) {
        toast({
          title: 'Entrada registrada',
          description: 'A entrada financeira foi salva com sucesso.',
        });
      }

      return newEntry;
    } catch (error) {
      console.error('Error creating financial entry:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a entrada financeira.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateEntry = async (id: string, data: Partial<FinancialEntryFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_entries')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, ...data } : entry))
      );

      toast({
        title: 'Entrada atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error updating financial entry:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a entrada financeira.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries((prev) => prev.filter((entry) => entry.id !== id));

      toast({
        title: 'Entrada excluída',
        description: 'A entrada financeira foi removida com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting financial entry:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a entrada financeira.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Check if an appointment already has an associated entry (to avoid duplicates)
  const hasEntryForAppointment = async (appointmentId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking entry for appointment:', error);
      return false;
    }
  };

  // Delete entry associated with an appointment (when status changes from completed)
  const deleteEntryByAppointment = async (appointmentId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('financial_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('appointment_id', appointmentId);

      if (error) throw error;

      setEntries((prev) => prev.filter((entry) => entry.appointment_id !== appointmentId));
      return true;
    } catch (error) {
      console.error('Error deleting entry by appointment:', error);
      return false;
    }
  };

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0);
    const byType = entries.reduce((acc, entry) => {
      acc[entry.entry_type] = (acc[entry.entry_type] || 0) + Number(entry.value);
      return acc;
    }, {} as Record<string, number>);

    return { total, byType, count: entries.length };
  }, [entries]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    hasEntryForAppointment,
    deleteEntryByAppointment,
    calculateTotals,
    refetch: fetchEntries,
  };
}
