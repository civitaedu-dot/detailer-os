
ALTER TABLE public.profiles DROP CONSTRAINT profiles_plan_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_status_check CHECK (plan_status = ANY (ARRAY['active'::text, 'inactive'::text, 'cancelled'::text, 'trial'::text]));
