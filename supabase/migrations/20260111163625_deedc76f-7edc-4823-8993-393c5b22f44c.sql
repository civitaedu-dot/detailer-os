-- Adicionar campo de meta mensal na tabela financial_data
ALTER TABLE public.financial_data 
ADD COLUMN monthly_goal DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN use_automatic_goal BOOLEAN NOT NULL DEFAULT true;