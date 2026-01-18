-- Create services table for managing automotive detailing services
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  estimated_cost NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for services
CREATE POLICY "Users can view their own services"
  ON public.services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own services"
  ON public.services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services"
  ON public.services FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services"
  ON public.services FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();