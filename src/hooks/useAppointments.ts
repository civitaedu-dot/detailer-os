import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toLocalDateString } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  service_name: string;
  service_value: number;
  appointment_date: string;
  appointment_time: string | null;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFormData {
  client_id?: string;
  client_name: string;
  service_name: string;
  service_value: number;
  appointment_date: string;
  appointment_time?: string;
  duration_minutes?: number;
  notes?: string;
  payment_method?: string;
}

interface UseAppointmentsOptions {
  selectedDate?: Date;
  dateRange?: { start: string; end: string };
}

export const useAppointments = (selectedDateOrOptions?: Date | UseAppointmentsOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize options
  const selectedDate = selectedDateOrOptions instanceof Date ? selectedDateOrOptions : undefined;
  const dateRange = selectedDateOrOptions && !(selectedDateOrOptions instanceof Date)
    ? (selectedDateOrOptions as UseAppointmentsOptions).dateRange
    : undefined;
  const selectedDateFromOptions = selectedDateOrOptions && !(selectedDateOrOptions instanceof Date)
    ? (selectedDateOrOptions as UseAppointmentsOptions).selectedDate
    : selectedDate;

  const fetchAppointments = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (dateRange) {
        query = query.gte('appointment_date', dateRange.start).lte('appointment_date', dateRange.end);
      } else if (selectedDateFromOptions) {
        const dateStr = toLocalDateString(selectedDateFromOptions);
        query = query.eq('appointment_date', dateStr);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDateFromOptions, dateRange?.start, dateRange?.end, toast]);

  const createAppointment = async (data: AppointmentFormData): Promise<Appointment | null> => {
    if (!user) return null;

    try {
      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          client_id: data.client_id || null,
          client_name: data.client_name,
          service_name: data.service_name,
          service_value: data.service_value,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time || null,
          duration_minutes: data.duration_minutes || 60,
          notes: data.notes || null,
          payment_method: data.payment_method || null,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      setAppointments((prev) => [...prev, newAppointment].sort((a, b) => {
        const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
        if (dateCompare !== 0) return dateCompare;
        return (a.appointment_time || '').localeCompare(b.appointment_time || '');
      }));

      toast({
        title: 'Agendamento criado',
        description: `Atendimento de ${data.client_name} agendado com sucesso.`,
      });

      return newAppointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o agendamento.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateAppointment = async (id: string, data: Partial<AppointmentFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, ...data } : apt))
      );

      toast({
        title: 'Agendamento atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o agendamento.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const createFinancialEntryForAppointment = async (appointment: Appointment): Promise<void> => {
    if (!user) return;

    try {
      const { data: existingEntry } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('appointment_id', appointment.id)
        .maybeSingle();

      if (existingEntry) return;

      const { error } = await supabase
        .from('financial_entries')
        .insert({
          user_id: user.id,
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          client_name: appointment.client_name,
          entry_type: 'service',
          description: appointment.service_name,
          value: appointment.service_value,
          entry_date: appointment.appointment_date,
          notes: appointment.notes,
          payment_method: (appointment as any).payment_method || null,
          is_automatic: true,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating financial entry:', error);
    }
  };

  const deleteFinancialEntryForAppointment = async (appointmentId: string): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('financial_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('appointment_id', appointmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting financial entry:', error);
    }
  };

  const updateStatus = async (id: string, newStatus: string): Promise<boolean> => {
    try {
      const currentAppointment = appointments.find((apt) => apt.id === id);
      const previousStatus = currentAppointment?.status;

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      if (currentAppointment) {
        if (newStatus === 'completed' && previousStatus !== 'completed') {
          await createFinancialEntryForAppointment({ ...currentAppointment, status: newStatus });
        } else if (previousStatus === 'completed' && newStatus !== 'completed') {
          await deleteFinancialEntryForAppointment(id);
        }
      }

      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status: newStatus } : apt))
      );

      const statusLabels: Record<string, string> = {
        completed: 'concluído',
        cancelled: 'cancelado',
        scheduled: 'agendado',
      };

      toast({
        title: 'Status atualizado',
        description: `Atendimento marcado como ${statusLabels[newStatus] || newStatus}.${
          newStatus === 'completed' ? ' Entrada financeira registrada!' : ''
        }`,
      });

      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteAppointment = async (id: string): Promise<boolean> => {
    try {
      const appointment = appointments.find((apt) => apt.id === id);
      if (appointment?.status === 'completed') {
        await deleteFinancialEntryForAppointment(id);
      }

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAppointments((prev) => prev.filter((apt) => apt.id !== id));

      toast({
        title: 'Agendamento excluído',
        description: 'O agendamento foi removido com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o agendamento.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    isLoading,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    updateStatus,
    deleteAppointment,
  };
};
