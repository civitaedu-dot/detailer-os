-- Adicionar colunas para configuração do Valor Hora na tabela financial_data
ALTER TABLE public.financial_data 
ADD COLUMN IF NOT EXISTS hours_per_day numeric DEFAULT 8,
ADD COLUMN IF NOT EXISTS avg_services_per_day numeric DEFAULT 3;

-- Comentários explicativos
COMMENT ON COLUMN public.financial_data.hours_per_day IS 'Horas trabalhadas por dia para cálculo do valor hora';
COMMENT ON COLUMN public.financial_data.avg_services_per_day IS 'Média de serviços realizados por dia';

-- Adicionar coluna para armazenar preço calculado no cadastro de serviços
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS calculated_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS material_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin numeric DEFAULT 30;

-- Comentários para serviços
COMMENT ON COLUMN public.services.calculated_price IS 'Preço calculado automaticamente pela ferramenta de precificação';
COMMENT ON COLUMN public.services.material_cost IS 'Custo de produtos/materiais usados no serviço';
COMMENT ON COLUMN public.services.additional_cost IS 'Custos adicionais do serviço (terceiros, deslocamento, etc)';
COMMENT ON COLUMN public.services.profit_margin IS 'Margem de lucro desejada em percentual';