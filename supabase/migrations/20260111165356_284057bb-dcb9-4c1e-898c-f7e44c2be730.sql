-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  birthdate DATE,
  vehicle TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view their own clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" 
ON public.clients 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on clients
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add client_id column to appointments for proper relationship
ALTER TABLE public.appointments 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add duration column to appointments
ALTER TABLE public.appointments 
ADD COLUMN duration_minutes INTEGER DEFAULT 60;