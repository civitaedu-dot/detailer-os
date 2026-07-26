-- 1) Prevent self-upgrade of billing columns on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_billing_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.plan_status IS DISTINCT FROM OLD.plan_status
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.ai_interactions_limit IS DISTINCT FROM OLD.ai_interactions_limit
     OR NEW.trial_start IS DISTINCT FROM OLD.trial_start
     OR NEW.trial_end IS DISTINCT FROM OLD.trial_end
     OR NEW.trial_used IS DISTINCT FROM OLD.trial_used
  THEN
    RAISE EXCEPTION 'Billing fields cannot be modified by the user';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_billing_self_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_profile_billing_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_billing_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_billing_self_update();

-- 2) Lock down SECURITY DEFINER function exposure
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;