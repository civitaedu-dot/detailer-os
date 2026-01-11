-- Tabela de dados financeiros do usuário
CREATE TABLE public.financial_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fixed_costs DECIMAL(10,2) NOT NULL DEFAULT 0,
  variable_costs_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  working_days_per_month INTEGER NOT NULL DEFAULT 22,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_data
CREATE POLICY "Users can view their own financial data" 
ON public.financial_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial data" 
ON public.financial_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial data" 
ON public.financial_data 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_financial_data_updated_at
BEFORE UPDATE ON public.financial_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de serviços/agendamentos para calcular faturamento
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_value DECIMAL(10,2) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments" 
ON public.appointments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries by date and user
CREATE INDEX idx_appointments_user_date ON public.appointments(user_id, appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(user_id, status);