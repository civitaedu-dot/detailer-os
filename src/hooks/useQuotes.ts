import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface QuoteItem {
  id: string;
  quote_id: string;
  user_id: string;
  service_id: string | null;
  sort_order: number;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteItemFormData {
  id?: string;
  service_id?: string | null;
  sort_order?: number;
  name: string;
  description?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  subtotal?: number;
}

export interface Quote {
  id: string;
  user_id: string;
  quote_number: string;
  title: string | null;
  client_id: string | null;
  client_name: string;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_document: string | null;
  client_address: string | null;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  created_date: string;
  expiry_date: string | null;
  subtotal: number;
  total_item_discounts: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_type: string | null;
  tax_percentage: number;
  tax_amount: number;
  total: number;
  payment_conditions: string | null;
  delivery_deadline: string | null;
  observations: string | null;
  terms_conditions: string | null;
  internal_notes: string | null;
  template: 'modern' | 'classic' | 'minimal';
  converted_to_appointment: boolean;
  converted_to_entry: boolean;
  created_at: string;
  updated_at: string;
  items?: QuoteItem[];
}

export interface QuoteFormData {
  quote_number: string;
  title?: string;
  client_id?: string | null;
  client_name: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_document?: string;
  client_address?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  created_date: string;
  expiry_date?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  tax_type?: string;
  tax_percentage?: number;
  payment_conditions?: string;
  delivery_deadline?: string;
  observations?: string;
  terms_conditions?: string;
  internal_notes?: string;
  template?: 'modern' | 'classic' | 'minimal';
  items: QuoteItemFormData[];
}

export interface CompanySettings {
  id?: string;
  user_id?: string;
  business_name: string | null;
  trade_name: string | null;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string;
  closing_message: string;
}

const calcSubtotals = (items: QuoteItemFormData[]) => {
  const subtotal = items.reduce((sum, item) => {
    const base = item.quantity * item.unit_price;
    const disc = base * ((item.discount_percentage || 0) / 100);
    return sum + base - disc;
  }, 0);
  const totalItemDiscounts = items.reduce((sum, item) => {
    const base = item.quantity * item.unit_price;
    return sum + base * ((item.discount_percentage || 0) / 100);
  }, 0);
  return { subtotal, totalItemDiscounts };
};

export const calcQuoteTotals = (data: Partial<QuoteFormData> & { items: QuoteItemFormData[] }) => {
  const { subtotal, totalItemDiscounts } = calcSubtotals(data.items);
  const discountValue = data.discount_value || 0;
  const discountAmount =
    data.discount_type === 'fixed'
      ? discountValue
      : subtotal * (discountValue / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxPercentage = data.tax_percentage || 0;
  const taxAmount = afterDiscount * (taxPercentage / 100);
  const total = afterDiscount + taxAmount;
  return { subtotal, totalItemDiscounts, discountAmount, taxAmount, total };
};

export const useQuotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuotes((data || []) as Quote[]);
    } catch (e) {
      console.error('fetchQuotes error', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchQuoteWithItems = useCallback(async (id: string): Promise<Quote | null> => {
    if (!user) return null;
    try {
      const [quoteRes, itemsRes] = await Promise.all([
        supabase.from('quotes').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('quote_items').select('*').eq('quote_id', id).order('sort_order'),
      ]);
      if (quoteRes.error) throw quoteRes.error;
      return { ...(quoteRes.data as Quote), items: (itemsRes.data || []) as QuoteItem[] };
    } catch (e) {
      console.error('fetchQuoteWithItems error', e);
      return null;
    }
  }, [user]);

  const getNextQuoteNumber = useCallback(async (): Promise<string> => {
    if (!user) return 'ORC-001';
    try {
      const { data } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!data || data.length === 0) return 'ORC-001';
      const last = data[0].quote_number;
      const match = last.match(/(\d+)$/);
      if (match) {
        const next = parseInt(match[1], 10) + 1;
        return `ORC-${String(next).padStart(3, '0')}`;
      }
      return 'ORC-001';
    } catch {
      return 'ORC-001';
    }
  }, [user]);

  const createQuote = async (formData: QuoteFormData): Promise<Quote | null> => {
    if (!user) return null;
    try {
      const totals = calcQuoteTotals(formData);
      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          quote_number: formData.quote_number,
          title: formData.title || null,
          client_id: formData.client_id || null,
          client_name: formData.client_name,
          client_company: formData.client_company || null,
          client_email: formData.client_email || null,
          client_phone: formData.client_phone || null,
          client_document: formData.client_document || null,
          client_address: formData.client_address || null,
          status: formData.status || 'draft',
          created_date: formData.created_date,
          expiry_date: formData.expiry_date || null,
          subtotal: totals.subtotal,
          total_item_discounts: totals.totalItemDiscounts,
          discount_type: formData.discount_type || 'percentage',
          discount_value: formData.discount_value || 0,
          discount_amount: totals.discountAmount,
          tax_type: formData.tax_type || null,
          tax_percentage: formData.tax_percentage || 0,
          tax_amount: totals.taxAmount,
          total: totals.total,
          payment_conditions: formData.payment_conditions || null,
          delivery_deadline: formData.delivery_deadline || null,
          observations: formData.observations || null,
          terms_conditions: formData.terms_conditions || null,
          internal_notes: formData.internal_notes || null,
          template: formData.template || 'modern',
        })
        .select()
        .single();
      if (error) throw error;

      if (formData.items.length > 0) {
        const itemsToInsert = formData.items.map((item, idx) => {
          const base = item.quantity * item.unit_price;
          const disc = base * ((item.discount_percentage || 0) / 100);
          return {
            quote_id: (quote as Quote).id,
            user_id: user.id,
            service_id: item.service_id || null,
            sort_order: item.sort_order ?? idx,
            name: item.name,
            description: item.description || null,
            unit: item.unit || 'un',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage || 0,
            subtotal: base - disc,
          };
        });
        const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      await supabase.from('quote_history').insert({
        quote_id: (quote as Quote).id,
        user_id: user.id,
        action: 'created',
        new_value: 'Orçamento criado',
      });

      toast({ title: 'Orçamento criado!', description: `${formData.quote_number} foi salvo com sucesso.` });
      await fetchQuotes();
      return quote as Quote;
    } catch (e) {
      console.error('createQuote error', e);
      toast({ title: 'Erro', description: 'Não foi possível criar o orçamento.', variant: 'destructive' });
      return null;
    }
  };

  const updateQuote = async (id: string, formData: Partial<QuoteFormData>): Promise<boolean> => {
    if (!user) return false;
    try {
      const totals = formData.items ? calcQuoteTotals(formData as QuoteFormData) : undefined;
      const updatePayload: Record<string, unknown> = {
        ...(formData.title !== undefined && { title: formData.title }),
        ...(formData.client_id !== undefined && { client_id: formData.client_id }),
        ...(formData.client_name !== undefined && { client_name: formData.client_name }),
        ...(formData.client_company !== undefined && { client_company: formData.client_company }),
        ...(formData.client_email !== undefined && { client_email: formData.client_email }),
        ...(formData.client_phone !== undefined && { client_phone: formData.client_phone }),
        ...(formData.client_document !== undefined && { client_document: formData.client_document }),
        ...(formData.client_address !== undefined && { client_address: formData.client_address }),
        ...(formData.status !== undefined && { status: formData.status }),
        ...(formData.expiry_date !== undefined && { expiry_date: formData.expiry_date }),
        ...(formData.discount_type !== undefined && { discount_type: formData.discount_type }),
        ...(formData.discount_value !== undefined && { discount_value: formData.discount_value }),
        ...(formData.tax_type !== undefined && { tax_type: formData.tax_type }),
        ...(formData.tax_percentage !== undefined && { tax_percentage: formData.tax_percentage }),
        ...(formData.payment_conditions !== undefined && { payment_conditions: formData.payment_conditions }),
        ...(formData.delivery_deadline !== undefined && { delivery_deadline: formData.delivery_deadline }),
        ...(formData.observations !== undefined && { observations: formData.observations }),
        ...(formData.terms_conditions !== undefined && { terms_conditions: formData.terms_conditions }),
        ...(formData.internal_notes !== undefined && { internal_notes: formData.internal_notes }),
        ...(formData.template !== undefined && { template: formData.template }),
        ...(totals && {
          subtotal: totals.subtotal,
          total_item_discounts: totals.totalItemDiscounts,
          discount_amount: totals.discountAmount,
          tax_amount: totals.taxAmount,
          total: totals.total,
        }),
      };

      const { error } = await supabase.from('quotes').update(updatePayload).eq('id', id);
      if (error) throw error;

      if (formData.items) {
        await supabase.from('quote_items').delete().eq('quote_id', id);
        if (formData.items.length > 0) {
          const itemsToInsert = formData.items.map((item, idx) => {
            const base = item.quantity * item.unit_price;
            const disc = base * ((item.discount_percentage || 0) / 100);
            return {
              quote_id: id,
              user_id: user.id,
              service_id: item.service_id || null,
              sort_order: item.sort_order ?? idx,
              name: item.name,
              description: item.description || null,
              unit: item.unit || 'un',
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percentage: item.discount_percentage || 0,
              subtotal: base - disc,
            };
          });
          const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }
      }

      await fetchQuotes();
      return true;
    } catch (e) {
      console.error('updateQuote error', e);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o orçamento.', variant: 'destructive' });
      return false;
    }
  };

  const updateQuoteStatus = async (id: string, status: Quote['status'], oldStatus: Quote['status']): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
      if (error) throw error;
      await supabase.from('quote_history').insert({
        quote_id: id,
        user_id: user.id,
        action: 'status_changed',
        field_changed: 'status',
        old_value: oldStatus,
        new_value: status,
      });
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      toast({ title: 'Status atualizado', description: 'O orçamento foi atualizado.' });
      return true;
    } catch (e) {
      console.error('updateQuoteStatus error', e);
      return false;
    }
  };

  const deleteQuote = async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
      setQuotes(prev => prev.filter(q => q.id !== id));
      toast({ title: 'Orçamento excluído', description: 'O orçamento foi removido.' });
      return true;
    } catch (e) {
      console.error('deleteQuote error', e);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
      return false;
    }
  };

  const duplicateQuote = async (quote: Quote): Promise<Quote | null> => {
    const nextNumber = await getNextQuoteNumber();
    const items = await supabase.from('quote_items').select('*').eq('quote_id', quote.id).order('sort_order');
    const formData: QuoteFormData = {
      quote_number: nextNumber,
      title: quote.title ? `Cópia - ${quote.title}` : undefined,
      client_id: quote.client_id,
      client_name: quote.client_name,
      client_company: quote.client_company || undefined,
      client_email: quote.client_email || undefined,
      client_phone: quote.client_phone || undefined,
      client_document: quote.client_document || undefined,
      client_address: quote.client_address || undefined,
      status: 'draft',
      created_date: toLocalDateString(new Date()),
      expiry_date: toLocalDateString(new Date(Date.now() + 30 * 24 * 3600 * 1000)),
      discount_type: quote.discount_type,
      discount_value: quote.discount_value,
      tax_type: quote.tax_type || undefined,
      tax_percentage: quote.tax_percentage,
      payment_conditions: quote.payment_conditions || undefined,
      delivery_deadline: quote.delivery_deadline || undefined,
      observations: quote.observations || undefined,
      terms_conditions: quote.terms_conditions || undefined,
      template: quote.template,
      items: (items.data || []).map(i => ({
        service_id: i.service_id,
        sort_order: i.sort_order,
        name: i.name,
        description: i.description || undefined,
        unit: i.unit,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percentage: i.discount_percentage,
      })),
    };
    return createQuote(formData);
  };

  const fetchQuoteHistory = async (quoteId: string) => {
    const { data } = await supabase
      .from('quote_history')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });
    return data || [];
  };

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  return {
    quotes,
    isLoading,
    fetchQuotes,
    fetchQuoteWithItems,
    getNextQuoteNumber,
    createQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    duplicateQuote,
    fetchQuoteHistory,
  };
};

export const useCompanySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setSettings(data as CompanySettings | null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveSettings = async (data: Omit<CompanySettings, 'id' | 'user_id'>): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({ ...data, user_id: user.id }, { onConflict: 'user_id' });
      if (error) throw error;
      await fetchSettings();
      toast({ title: 'Configurações salvas', description: 'Dados da empresa atualizados.' });
      return true;
    } catch (e) {
      console.error('saveSettings error', e);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return { settings, isLoading, saveSettings, refetch: fetchSettings };
};
