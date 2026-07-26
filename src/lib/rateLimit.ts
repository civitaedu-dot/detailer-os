import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized rate limiting layer for the frontend.
 * Every protected action calls `guardRateLimit` before doing its work.
 * Limits themselves live in the database (`rate_limit_configs`) and can be
 * changed without touching this file.
 */
export type RateLimitRule =
  | "auth_login"
  | "auth_signup"
  | "auth_password_reset"
  | "auth_password_update"
  | "import_file"
  | "report_generation"
  | "public_api";

export interface RateLimitCheck {
  allowed: boolean;
  retryAfter: number;
  message: string;
}

const DEFAULT_MESSAGE =
  "Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente.";

export function formatRetryMessage(retryAfter: number): string {
  if (!retryAfter || retryAfter <= 0) return DEFAULT_MESSAGE;
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

/**
 * Checks (and consumes) one unit of the given rule.
 * Fails open: if the limiter is unreachable the action proceeds normally.
 */
export async function guardRateLimit(
  rule: RateLimitRule,
  options: { identity?: string; endpoint?: string } = {},
): Promise<RateLimitCheck> {
  try {
    const { data, error } = await supabase.functions.invoke("rate-limit-guard", {
      body: {
        rule,
        action: "check",
        identity: options.identity,
        endpoint: options.endpoint ?? rule,
      },
    });

    if (error) {
      // A 429 surfaces here as a non-2xx error — read the real payload.
      const context = (error as { context?: Response }).context;
      if (context && typeof context.text === "function") {
        try {
          const parsed = JSON.parse(await context.text());
          if (parsed?.allowed === false) {
            return {
              allowed: false,
              retryAfter: parsed.retry_after ?? 0,
              message: parsed.message || formatRetryMessage(parsed.retry_after ?? 0),
            };
          }
        } catch {
          /* ignore malformed payload */
        }
      }
      return { allowed: true, retryAfter: 0, message: "" };
    }

    if (data && data.allowed === false) {
      return {
        allowed: false,
        retryAfter: data.retry_after ?? 0,
        message: data.message || formatRetryMessage(data.retry_after ?? 0),
      };
    }

    return { allowed: true, retryAfter: 0, message: "" };
  } catch {
    return { allowed: true, retryAfter: 0, message: "" };
  }
}

/** Clears the counters for a rule (used after a successful login). */
export async function clearRateLimit(rule: RateLimitRule, identity?: string): Promise<void> {
  try {
    await supabase.functions.invoke("rate-limit-guard", {
      body: { rule, action: "reset", identity },
    });
  } catch {
    /* non critical */
  }
}

/**
 * Detects a rate limit error returned by any edge function and extracts the
 * friendly message. Returns null when the error is not a rate limit.
 */
export async function extractRateLimitError(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response })?.context;
  if (!context || typeof context.text !== "function") return null;
  try {
    const raw = await context.text();
    const parsed = JSON.parse(raw);
    if (parsed?.rate_limited || parsed?.allowed === false) {
      return parsed.error || parsed.message || DEFAULT_MESSAGE;
    }
  } catch {
    /* not a rate limit payload */
  }
  return null;
}
