
CREATE TABLE public.precificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_id UUID NULL,
  nome_servico TEXT NOT NULL,
  custo_material_total NUMERIC NOT NULL DEFAULT 0,
  custo_mao_obra NUMERIC NOT NULL DEFAULT 0,
  margem_lucro NUMERIC NOT NULL DEFAULT 25,
  aliquota_imposto NUMERIC NOT NULL DEFAULT 10,
  comissao_avista NUMERIC NOT NULL DEFAULT 5,
  comissao_parcelado NUMERIC NOT NULL DEFAULT 3,
  taxa_cartao_6x NUMERIC NOT NULL DEFAULT 8.6,
  taxa_cartao_10x NUMERIC NOT NULL DEFAULT 12.56,
  preco_sn NUMERIC NOT NULL DEFAULT 0,
  preco_avista NUMERIC NOT NULL DEFAULT 0,
  preco_6x NUMERIC NOT NULL DEFAULT 0,
  preco_10x NUMERIC NOT NULL DEFAULT 0,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.precificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own precificacoes"
  ON public.precificacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own precificacoes"
  ON public.precificacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own precificacoes"
  ON public.precificacoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own precificacoes"
  ON public.precificacoes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_precificacoes_updated_at
  BEFORE UPDATE ON public.precificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_precificacoes_user_id ON public.precificacoes(user_id);
