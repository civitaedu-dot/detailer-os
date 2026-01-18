-- Add unique constraint on user_id for financial_data to enable upsert
ALTER TABLE public.financial_data 
ADD CONSTRAINT financial_data_user_id_unique UNIQUE (user_id);

-- Create fixed_costs table for detailed fixed cost management
CREATE TABLE public.fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own fixed costs"
  ON public.fixed_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed costs"
  ON public.fixed_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed costs"
  ON public.fixed_costs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed costs"
  ON public.fixed_costs FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_fixed_costs_updated_at
  BEFORE UPDATE ON public.fixed_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();