-- Replace handle_new_user function with input validation for name field
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sanitized_name TEXT;
BEGIN
  -- Validate and sanitize the name field
  -- Limit to 100 characters and strip any HTML/script tags
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
  
  -- Ensure we have at least a default name
  IF sanitized_name = '' OR sanitized_name IS NULL THEN
    sanitized_name := 'Usuário';
  END IF;
  
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, sanitized_name);
  RETURN NEW;
END;
$function$;