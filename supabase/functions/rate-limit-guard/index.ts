// Public gateway used by the frontend to enforce rate limits on actions that do
// not go through another edge function (login, signup, password recovery,
// imports, report generation, ...).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  enforceRateLimit,
  resetRateLimit,
  getClientIp,
  friendlyRateLimitMessage,
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rules the browser is allowed to ask for. Anything else is rejected so the
// endpoint can never be used to pollute arbitrary counters.
const ALLOWED_RULES = new Set([
  "auth_login",
  "auth_login_ip",
  "auth_signup",
  "auth_password_reset",
  "auth_password_update",
  "import_file",
  "report_generation",
  "public_api",
]);

// Rules whose identity may be supplied by the client (e-mail based).
const IDENTITY_RULES = new Set([
  "auth_login",
  "auth_password_reset",
]);

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rule = typeof body.rule === "string" ? body.rule : "";
    const action = body.action === "reset" ? "reset" : "check";
    const rawIdentity = typeof body.identity === "string" ? body.identity.slice(0, 160).trim() : "";

    if (!ALLOWED_RULES.has(rule)) {
      return json({ error: "Solicitação inválida." }, 400);
    }

    const ip = getClientIp(req);

    // Resolve the signed-in user when a token is present (never trusted from body).
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
        );
        const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = data?.user?.id ?? null;
        userEmail = data?.user?.email ?? null;
      } catch {
        // anonymous request — fall back to IP based limiting
      }
    }

    const identity =
      userId ?? (IDENTITY_RULES.has(rule) && rawIdentity ? rawIdentity.toLowerCase() : ip);

    if (action === "reset") {
      await resetRateLimit(rule, identity);
      if (rule === "auth_login") await resetRateLimit("auth_login_ip", ip);
      return json({ allowed: true });
    }

    // Identity-scoped check (per user / per e-mail / per session owner).
    const primary = await enforceRateLimit({
      req,
      rule,
      identity,
      userId,
      userEmail: userEmail ?? (IDENTITY_RULES.has(rule) ? rawIdentity : null),
      endpoint: body.endpoint ?? rule,
    });

    if (!primary.allowed) {
      return json(
        { allowed: false, retry_after: primary.retryAfter, message: primary.message },
        429,
        { "Retry-After": String(Math.max(1, primary.retryAfter)) },
      );
    }

    // Extra IP-wide guard for login so a botnet cannot spray many e-mails.
    if (rule === "auth_login") {
      const byIp = await enforceRateLimit({
        req,
        rule: "auth_login_ip",
        identity: ip,
        userId,
        userEmail: rawIdentity || null,
        endpoint: "auth_login_ip",
      });
      if (!byIp.allowed) {
        return json(
          { allowed: false, retry_after: byIp.retryAfter, message: byIp.message },
          429,
          { "Retry-After": String(Math.max(1, byIp.retryAfter)) },
        );
      }
    }

    return json({ allowed: true, remaining: primary.remaining });
  } catch (e) {
    console.error("[rate-limit-guard] error", e instanceof Error ? e.message : e);
    // Fail open: never block a legitimate user because of an internal problem.
    return json({ allowed: true });
  }
});
