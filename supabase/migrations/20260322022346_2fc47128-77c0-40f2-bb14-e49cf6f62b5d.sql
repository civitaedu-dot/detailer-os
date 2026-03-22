
-- Add cost-per-use fields to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS yields_per_unit numeric NOT NULL DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_per_use numeric GENERATED ALWAYS AS (
  CASE WHEN yields_per_unit > 0 THEN unit_cost / yields_per_unit ELSE 0 END
) STORED;
