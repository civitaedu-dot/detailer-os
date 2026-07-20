
CREATE TABLE public.category_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains','exact','starts_with')),
  direction TEXT NOT NULL DEFAULT 'any' CHECK (direction IN ('in','out','any')),
  category TEXT NOT NULL,
  payment_method TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  auto_created BOOLEAN NOT NULL DEFAULT false,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_category_rules_user ON public.category_rules(user_id);
CREATE UNIQUE INDEX idx_category_rules_unique ON public.category_rules(user_id, lower(pattern), match_type, direction);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_rules TO authenticated;
GRANT ALL ON public.category_rules TO service_role;

ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rules" ON public.category_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_category_rules_updated_at
  BEFORE UPDATE ON public.category_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.transaction_categories (user_id, name, direction, is_system)
SELECT u.id, c.name, 'out'::cash_direction, true
FROM auth.users u
CROSS JOIN (VALUES
  ('Aluguel'),('Salários'),('Pró-labore'),
  ('Produtos Químicos'),('Insumos'),('Comissões'),
  ('Energia'),('Água'),('Internet'),
  ('Impostos'),('Taxas Bancárias'),('Taxas de Cartão'),
  ('Equipamentos'),('Marketing'),('Combustível'),
  ('Manutenção'),('Fornecedores'),('Investimentos'),
  ('Outros')
) AS c(name)
ON CONFLICT DO NOTHING;
