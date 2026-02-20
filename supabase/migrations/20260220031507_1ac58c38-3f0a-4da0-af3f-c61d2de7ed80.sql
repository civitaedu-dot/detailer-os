
-- Add trial columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- Update handle_new_user to auto-activate trial on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sanitized_name TEXT;
BEGIN
  sanitized_name := COALESCE(
    LEFT(
      regexp_replace(
        NEW.raw_user_meta_data->>'name',
        '<[^>]*>|&[^;]+;', 
        '', 
        'g'
      ),
      100
    ),
    'Usuário'
  );
  
  IF sanitized_name = '' OR sanitized_name IS NULL THEN
    sanitized_name := 'Usuário';
  END IF;
  
  INSERT INTO public.profiles (user_id, name, plan, plan_status, trial_start, trial_end, trial_used)
  VALUES (
    NEW.id, 
    sanitized_name, 
    'gestao',
    'trial',
    now(),
    now() + interval '14 days',
    true
  );
  RETURN NEW;
END;
$function$;
