ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS employees_count text,
  ADD COLUMN IF NOT EXISTS years_operating text,
  ADD COLUMN IF NOT EXISTS monthly_services_avg numeric,
  ADD COLUMN IF NOT EXISTS monthly_revenue_estimate numeric,
  ADD COLUMN IF NOT EXISTS main_services text[],
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;