
-- Campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  objective text NOT NULL DEFAULT 'geral',
  message_template text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  scheduled_date date,
  scheduled_time time,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Campaign recipients table
CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  message_sent text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  returned boolean NOT NULL DEFAULT false,
  return_date date,
  return_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own recipients" ON public.campaign_recipients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recipients" ON public.campaign_recipients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipients" ON public.campaign_recipients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipients" ON public.campaign_recipients FOR DELETE USING (auth.uid() = user_id);
