
-- =============================================
-- QUOTES MODULE MIGRATION
-- =============================================

-- Company settings table (for PDF branding)
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_name TEXT,
  trade_name TEXT,
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#22c55e',
  closing_message TEXT DEFAULT 'Agradecemos a oportunidade e aguardamos seu retorno.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company settings" ON public.company_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own company settings" ON public.company_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own company settings" ON public.company_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own company settings" ON public.company_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quote_number TEXT NOT NULL,
  title TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_company TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_document TEXT,
  client_address TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected','expired')),
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total_item_discounts NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_type TEXT,
  tax_percentage NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_conditions TEXT,
  delivery_deadline TEXT,
  observations TEXT,
  terms_conditions TEXT,
  internal_notes TEXT,
  template TEXT DEFAULT 'modern' CHECK (template IN ('modern','classic','minimal')),
  converted_to_appointment BOOLEAN DEFAULT false,
  converted_to_entry BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quotes" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quotes" ON public.quotes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created_date ON public.quotes(created_date);

-- Quote items table
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'un',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quote items" ON public.quote_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quote items" ON public.quote_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quote items" ON public.quote_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quote items" ON public.quote_items FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_quote_items_updated_at
  BEFORE UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_quote_items_quote_id ON public.quote_items(quote_id);

-- Quote audit log
CREATE TABLE public.quote_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quote history" ON public.quote_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quote history" ON public.quote_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_quote_history_quote_id ON public.quote_history(quote_id);

-- Terms templates
CREATE TABLE public.quote_terms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_terms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own terms templates" ON public.quote_terms_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own terms templates" ON public.quote_terms_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own terms templates" ON public.quote_terms_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own terms templates" ON public.quote_terms_templates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_quote_terms_templates_updated_at
  BEFORE UPDATE ON public.quote_terms_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
