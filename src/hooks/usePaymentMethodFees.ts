import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'credito_vista', label: 'Cartão Crédito à Vista' },
  { value: 'credito_parcelado', label: 'Cartão Crédito Parcelado' },
  { value: 'debito', label: 'Cartão Débito' },
] as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[number]['value'];

export const getPaymentMethodLabel = (value: string | null): string => {
  if (!value) return '—';
  return PAYMENT_METHODS.find((m) => m.value === value)?.label || value;
};

export interface PaymentMethodFee {
  id: string;
  user_id: string;
  method: string;
  fee_percentage: number;
  description: string | null;
}

export interface PaymentMethodFeeInput {
  method: string;
  fee_percentage: number;
  description?: string;
}

export function usePaymentMethodFees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fees, setFees] = useState<PaymentMethodFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchFees = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('payment_method_fees' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFees(
        ((data as any[]) || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          method: item.method,
          fee_percentage: Number(item.fee_percentage),
          description: item.description,
        }))
      );
    } catch (error) {
      console.error('Error fetching payment method fees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const upsertFee = async (input: PaymentMethodFeeInput) => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('payment_method_fees' as any)
        .upsert(
          {
            user_id: user.id,
            method: input.method,
            fee_percentage: input.fee_percentage,
            description: input.description || null,
          } as any,
          { onConflict: 'user_id,method' }
        );

      if (error) throw error;
      await fetchFees();
      toast({ title: 'Taxa salva!', description: `Taxa de ${getPaymentMethodLabel(input.method)} atualizada.` });
    } catch (error) {
      console.error('Error upserting payment fee:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a taxa.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFee = async (id: string) => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('payment_method_fees' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFees((prev) => prev.filter((f) => f.id !== id));
      toast({ title: 'Taxa removida!' });
    } catch (error) {
      console.error('Error deleting payment fee:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a taxa.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getFeeForMethod = useCallback(
    (method: string | null): number => {
      if (!method) return 0;
      const fee = fees.find((f) => f.method === method);
      return fee?.fee_percentage || 0;
    },
    [fees]
  );

  useEffect(() => {
    if (user?.id) fetchFees();
  }, [user?.id, fetchFees]);

  return { fees, isLoading, isSaving, upsertFee, deleteFee, getFeeForMethod, refetch: fetchFees };
}
