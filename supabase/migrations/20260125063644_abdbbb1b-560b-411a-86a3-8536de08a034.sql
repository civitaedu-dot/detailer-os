-- Create financial_entries table for tracking all financial entries (automatic and manual)
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  entry_type TEXT NOT NULL DEFAULT 'service', -- 'service', 'product', 'other'
  description TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_automatic BOOLEAN NOT NULL DEFAULT false, -- true if generated from appointment
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_financial_entries_user_date ON public.financial_entries(user_id, entry_date);
CREATE INDEX idx_financial_entries_appointment ON public.financial_entries(appointment_id);

-- Enable Row Level Security
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own financial entries"
ON public.financial_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial entries"
ON public.financial_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial entries"
ON public.financial_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial entries"
ON public.financial_entries FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_entries_updated_at
BEFORE UPDATE ON public.financial_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();