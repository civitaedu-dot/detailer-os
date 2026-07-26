// Centralized rate limiting layer shared by every edge function.
// All limits are parametrized in the `rate_limit_configs` table, so changing a
// limit never requires touching function code.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type RateLimitRule =
  | "auth_login"
  | "auth_login_ip"
  | "auth_signup"
  | "auth_password_reset"
  | "auth_password_update"
  | "ai_chat"
  | "ai_chat_burst"
  | "import_file"
  | "report_generation"
  | "checkout"
  | "public_api";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
  message?: string;
}

/** Best-effort client IP extraction from the incoming request. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Friendly, non-technical message shown to end users. */
export function friendlyRateLimitMessage(retryAfter: number): string {
  if (retryAfter <= 0) return "Muitas solicitações em pouco tempo. Aguarde alguns instantes e tente novamente.";
  if (retryAfter < 60) {
    return `Muitas solicitações em pouco tempo. Aguarde ${retryAfter} segundos e tente novamente.`;
  }
  const minutes = Math.ceil(retryAfter / 60);
  if (minutes < 60) {
    return `Muitas solicitações em pouco tempo. Aguarde ${minutes} minuto${minutes > 1 ? "s" : ""} e tente novamente.`;
  }
  const hours = Math.ceil(minutes / 60);
  return `Muitas solicitações em pouco tempo. Aguarde ${hours} hora${hours > 1 ? "s" : ""} e tente novamente.`;
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

interface EnforceOptions {
  req: Request;
  rule: RateLimitRule | string;
  /** Stable identity: user id, normalized e-mail, or IP. Falls back to the IP. */
  identity?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  endpoint?: string;
  /** When false the request is only inspected, not counted. */
  countRequest?: boolean;
}

/**
 * Enforces a rule. Never throws: if the limiter itself is unavailable the
 * request is allowed through so legitimate users are never blocked by an
 * infrastructure hiccup.
 */
export async function enforceRateLimit(opts: EnforceOptions): Promise<RateLimitResult> {
  const ip = getClientIp(opts.req);
  const identityKey = `${opts.rule}:${(opts.identity || opts.userId || ip || "unknown").toLowerCase()}`;

  try {
    const { data, error } = await serviceClient().rpc("check_rate_limit", {
      _identity_key: identityKey,
      _rule_key: opts.rule,
      _user_id: opts.userId ?? null,
      _ip_address: ip,
      _endpoint: opts.endpoint ?? opts.rule,
      _user_email: opts.userEmail ?? null,
      _user_agent: opts.req.headers.get("user-agent"),
      _count_request: opts.countRequest !== false,
    });

    if (error) {
      console.error("[rate-limit] check failed", error.message);
      return { allowed: true, retryAfter: 0, remaining: -1 };
    }

    const result = data as { allowed: boolean; retry_after: number; remaining: number };
    return {
      allowed: result.allowed,
      retryAfter: result.retry_after ?? 0,
      remaining: result.remaining ?? -1,
      message: result.allowed ? undefined : friendlyRateLimitMessage(result.retry_after ?? 0),
    };
  } catch (e) {
    console.error("[rate-limit] exception", e instanceof Error ? e.message : e);
    return { allowed: true, retryAfter: 0, remaining: -1 };
  }
}

/** Clears counters/blocks for an identity (e.g. after a successful login). */
export async function resetRateLimit(rule: string, identity: string): Promise<void> {
  try {
    await serviceClient().rpc("reset_rate_limit", {
      _identity_key: `${rule}:${identity.toLowerCase()}`,
      _rule_key: rule,
    });
  } catch (e) {
    console.error("[rate-limit] reset failed", e instanceof Error ? e.message : e);
  }
}

/** Standard 429 response with a friendly, non-technical payload. */
export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: result.message ?? friendlyRateLimitMessage(result.retryAfter),
      rate_limited: true,
      retry_after: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, result.retryAfter)),
      },
    },
  );
}
