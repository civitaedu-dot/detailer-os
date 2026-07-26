-- ============================================================
-- RATE LIMITING INFRASTRUCTURE
-- ============================================================

-- 1) Parametrized configuration table
CREATE TABLE public.rate_limit_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  max_requests integer NOT NULL,
  window_seconds integer NOT NULL,
  block_seconds integer NOT NULL DEFAULT 60,
  progressive boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rate_limit_configs TO authenticated;
GRANT ALL ON public.rate_limit_configs TO service_role;
ALTER TABLE public.rate_limit_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limit configs"
  ON public.rate_limit_configs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_rate_limit_configs_updated_at
BEFORE UPDATE ON public.rate_limit_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Request events (sliding window counters)
CREATE TABLE public.rate_limit_events (
  id bigserial PRIMARY KEY,
  identity_key text NOT NULL,
  rule_key text NOT NULL,
  user_id uuid,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_events_id_seq TO service_role;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rate_limit_events_lookup
  ON public.rate_limit_events (identity_key, rule_key, created_at DESC);

-- 3) Progressive blocks
CREATE TABLE public.rate_limit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key text NOT NULL,
  rule_key text NOT NULL,
  strikes integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_violation_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_key, rule_key)
);

GRANT ALL ON public.rate_limit_blocks TO service_role;
ALTER TABLE public.rate_limit_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limit blocks"
  ON public.rate_limit_blocks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.rate_limit_blocks TO authenticated;

CREATE TRIGGER update_rate_limit_blocks_updated_at
BEFORE UPDATE ON public.rate_limit_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Audit logs (admin only)
CREATE TABLE public.rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  ip_address text,
  endpoint text NOT NULL,
  rule_key text NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  max_requests integer NOT NULL DEFAULT 0,
  window_seconds integer NOT NULL DEFAULT 0,
  blocked_seconds integer NOT NULL DEFAULT 0,
  strikes integer NOT NULL DEFAULT 1,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rate_limit_logs TO authenticated;
GRANT ALL ON public.rate_limit_logs TO service_role;
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limit logs"
  ON public.rate_limit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rate_limit_logs_created_at ON public.rate_limit_logs (created_at DESC);
CREATE INDEX idx_rate_limit_logs_rule ON public.rate_limit_logs (rule_key, created_at DESC);

-- 5) Core check function (service-role only)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identity_key text,
  _rule_key text,
  _user_id uuid DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _endpoint text DEFAULT NULL,
  _user_email text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _count_request boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.rate_limit_configs%ROWTYPE;
  blk public.rate_limit_blocks%ROWTYPE;
  current_count integer := 0;
  window_start timestamptz;
  block_for integer;
  new_strikes integer;
  ladder integer[] := ARRAY[60, 300, 900, 3600, 21600, 86400];
BEGIN
  SELECT * INTO cfg FROM public.rate_limit_configs WHERE rule_key = _rule_key;

  IF NOT FOUND OR cfg.enabled = false THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', -1, 'retry_after', 0);
  END IF;

  -- Active block?
  SELECT * INTO blk FROM public.rate_limit_blocks
   WHERE identity_key = _identity_key AND rule_key = _rule_key;

  IF FOUND AND blk.blocked_until IS NOT NULL AND blk.blocked_until > now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (blk.blocked_until - now())))::int),
      'strikes', blk.strikes
    );
  END IF;

  window_start := now() - make_interval(secs => cfg.window_seconds);

  SELECT count(*) INTO current_count
    FROM public.rate_limit_events
   WHERE identity_key = _identity_key
     AND rule_key = _rule_key
     AND created_at >= window_start;

  IF current_count >= cfg.max_requests THEN
    new_strikes := COALESCE(blk.strikes, 0) + 1;

    IF cfg.progressive THEN
      block_for := ladder[LEAST(new_strikes, array_length(ladder, 1))];
    ELSE
      block_for := cfg.block_seconds;
    END IF;

    INSERT INTO public.rate_limit_blocks (identity_key, rule_key, strikes, blocked_until, last_violation_at)
    VALUES (_identity_key, _rule_key, new_strikes, now() + make_interval(secs => block_for), now())
    ON CONFLICT (identity_key, rule_key) DO UPDATE
      SET strikes = EXCLUDED.strikes,
          blocked_until = EXCLUDED.blocked_until,
          last_violation_at = now(),
          updated_at = now();

    INSERT INTO public.rate_limit_logs (
      user_id, user_email, ip_address, endpoint, rule_key,
      request_count, max_requests, window_seconds, blocked_seconds, strikes, user_agent
    ) VALUES (
      _user_id, _user_email, _ip_address, COALESCE(_endpoint, _rule_key), _rule_key,
      current_count, cfg.max_requests, cfg.window_seconds, block_for, new_strikes, _user_agent
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', block_for,
      'strikes', new_strikes
    );
  END IF;

  IF _count_request THEN
    INSERT INTO public.rate_limit_events (identity_key, rule_key, user_id, ip_address)
    VALUES (_identity_key, _rule_key, _user_id, _ip_address);
    current_count := current_count + 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, cfg.max_requests - current_count),
    'retry_after', 0
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, uuid, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, uuid, text, text, text, text, boolean) TO service_role;

-- 6) Reset (successful login clears the brute-force counter)
CREATE OR REPLACE FUNCTION public.reset_rate_limit(_identity_key text, _rule_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_blocks WHERE identity_key = _identity_key AND rule_key = _rule_key;
  DELETE FROM public.rate_limit_events WHERE identity_key = _identity_key AND rule_key = _rule_key;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text, text) TO service_role;

-- 7) Housekeeping
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '1 day';
  DELETE FROM public.rate_limit_blocks
    WHERE (blocked_until IS NULL OR blocked_until < now())
      AND last_violation_at < now() - interval '7 days';
  DELETE FROM public.rate_limit_logs WHERE created_at < now() - interval '90 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_data() TO service_role;

-- 8) Default rules
INSERT INTO public.rate_limit_configs (rule_key, description, max_requests, window_seconds, block_seconds, progressive) VALUES
  ('auth_login',          'Tentativas de login por e-mail/IP',            5,  300,  60,   true),
  ('auth_login_ip',       'Tentativas de login por IP',                   20, 300,  300,  true),
  ('auth_signup',         'Criação de contas por IP',                     5,  3600, 3600, true),
  ('auth_password_reset', 'Pedidos de recuperação de senha',              3,  900,  900,  true),
  ('auth_password_update','Redefinições de senha por usuário',            5,  3600, 900,  true),
  ('ai_chat',             'Mensagens do Sócio IA por minuto',             10, 60,   60,   false),
  ('ai_chat_burst',       'Mensagens do Sócio IA por hora',               120,3600, 600,  false),
  ('import_file',         'Importações de arquivos/extratos',             10, 600,  600,  false),
  ('report_generation',   'Geração de relatórios e PDFs',                 30, 300,  300,  false),
  ('checkout',            'Aberturas de checkout de assinatura',          10, 600,  300,  false),
  ('public_api',          'Requisições gerais a endpoints públicos',      60, 60,   120,  false);