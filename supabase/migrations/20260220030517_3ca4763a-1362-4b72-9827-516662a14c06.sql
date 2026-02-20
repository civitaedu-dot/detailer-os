
-- Add payment_method to appointments
ALTER TABLE public.appointments
ADD COLUMN payment_method text DEFAULT NULL;

-- Add payment_method to financial_entries (to track method on each entry)
ALTER TABLE public.financial_entries
ADD COLUMN payment_method text DEFAULT NULL;

-- Create payment_method_fees table for user-configured fees
CREATE TABLE public.payment_method_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  method text NOT NULL,
  fee_percentage numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, method)
);

-- Enable RLS
ALTER TABLE public.payment_method_fees ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own payment fees"
ON public.payment_method_fees FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment fees"
ON public.payment_method_fees FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment fees"
ON public.payment_method_fees FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment fees"
ON public.payment_method_fees FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_payment_method_fees_updated_at
BEFORE UPDATE ON public.payment_method_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
