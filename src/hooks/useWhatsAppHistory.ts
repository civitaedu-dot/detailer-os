import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppContact {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  template_used: string | null;
  message_sent: string;
  category: string;
  contact_result: string | null;
  created_at: string;
}

export const useWhatsAppHistory = (clientId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<WhatsAppContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase
        .from('whatsapp_contact_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setHistory((data as WhatsAppContact[]) || []);
    } catch (error) {
      console.error('Error fetching WhatsApp history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, clientId]);

  const logContact = async (params: {
    client_id: string | null;
    client_name: string;
    template_used?: string;
    message_sent: string;
    category: string;
  }) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('whatsapp_contact_history')
        .insert({ user_id: user.id, ...params })
        .select()
        .single();
      if (error) throw error;
      setHistory((prev) => [data as WhatsAppContact, ...prev]);
      return data;
    } catch (error) {
      console.error('Error logging contact:', error);
      return null;
    }
  };

  const updateResult = async (id: string, contact_result: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_contact_history')
        .update({ contact_result })
        .eq('id', id);
      if (error) throw error;
      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, contact_result } : h)));
      toast({ title: 'Resultado registrado' });
      return true;
    } catch (error) {
      console.error('Error updating result:', error);
      return false;
    }
  };

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { history, isLoading, logContact, updateResult, fetchHistory };
};
