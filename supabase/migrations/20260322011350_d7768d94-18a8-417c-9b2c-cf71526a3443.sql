
-- Message templates table
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates" ON public.message_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own templates" ON public.message_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.message_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.message_templates FOR DELETE USING (auth.uid() = user_id);

-- WhatsApp contact history table
CREATE TABLE public.whatsapp_contact_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  template_used TEXT,
  message_sent TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  contact_result TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_contact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contact history" ON public.whatsapp_contact_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contact history" ON public.whatsapp_contact_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contact history" ON public.whatsapp_contact_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contact history" ON public.whatsapp_contact_history FOR DELETE USING (auth.uid() = user_id);
