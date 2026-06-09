
-- 1. Substitui a CHECK constraint antiga (base/gestao/escala) por uma com o plano único
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 2. Migra perfis existentes para o novo plano único
UPDATE public.profiles
SET plan = 'refinada',
    ai_interactions_limit = -1
WHERE plan IN ('base', 'gestao', 'escala');

-- 3. Aplica a nova CHECK constraint (apenas none ou refinada)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('none', 'refinada'));

-- 4. Atualiza o trigger handle_new_user para o plano único + IA ilimitada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  INSERT INTO public.profiles (
    user_id, name, plan, plan_status,
    trial_start, trial_end, trial_used,
    ai_interactions_limit
  )
  VALUES (
    NEW.id,
    sanitized_name,
    'refinada',
    'trial',
    now(),
    now() + interval '14 days',
    true,
    -1
  );
  RETURN NEW;
END;
$function$;
