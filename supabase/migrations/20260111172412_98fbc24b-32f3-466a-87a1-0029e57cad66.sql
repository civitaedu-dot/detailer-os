-- Create variable_costs table for detailed variable cost management
CREATE TABLE public.variable_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.variable_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own variable costs" 
ON public.variable_costs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own variable costs" 
ON public.variable_costs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variable costs" 
ON public.variable_costs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own variable costs" 
ON public.variable_costs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_variable_costs_updated_at
BEFORE UPDATE ON public.variable_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();