/**
 * Phase 79 Task 13.1 — Per-provider CircuitBreaker singletons.
 *
 * Wraps the four downstream delivery providers with independent breakers so
 * a degraded Twilio does not interfere with Telnyx, Resend, or Stripe. Each
 * breaker is module-level (process-local, in-memory) — a worker restart
 * resets it to closed, which is the safe default.
 *
 * Thresholds are intentionally conservative — a provider must fail at least
 * 5 times within a 60-second rolling window before the breaker opens, and
 * stays open for 30 seconds before allowing a half-open probe. These values
 * are tuned to trip on a real outage (e.g. Twilio-wide 5xx spike) without
 * flapping on isolated transient errors.
 *
 * See also: src/lib/reliability/circuit-breaker.ts for the underlying state
 * machine and src/lib/delivery/provider.ts / src/lib/integrations/email.ts
 * for the actual call-site wiring.
 */
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";

/** Default tuning — per-provider override happens via constructor arg below. */
const DEFAULT_OPTS = {
  threshold: 5,
  rollingWindowMs: 60_000,
  cooldownMs: 30_000,
} as const;

export const twilioBreaker = new CircuitBreaker({
  name: "twilio-sms",
  ...DEFAULT_OPTS,
});

export const telnyxBreaker = new CircuitBreaker({
  name: "telnyx-sms",
  ...DEFAULT_OPTS,
});

export const resendBreaker = new CircuitBreaker({
  name: "resend-email",
  ...DEFAULT_OPTS,
});

export { CircuitOpenError };

/**
 * Observability snapshot for /health endpoints and admin dashboards. Reports
 * the current state of each named breaker. Calling `.getState()` on each
 * breaker also transparently promotes an elapsed `open` breaker to
 * `half_open`, so this reflects fresh state.
 */
export function getProviderBreakerStates(): Record<
  "twilio-sms" | "telnyx-sms" | "resend-email",
  "closed" | "open" | "half_open"
> {
  return {
    "twilio-sms": twilioBreaker.getState(),
    "telnyx-sms": telnyxBreaker.getState(),
    "resend-email": resendBreaker.getState(),
  };
}

/** Primarily for tests; also useful for a future /admin "reset breakers" action. */
export function resetAllProviderBreakers(): void {
  twilioBreaker.reset();
  telnyxBreaker.reset();
  resendBreaker.reset();
}

/**
 * Execute a provider call through a circuit breaker, translating the result
 * into a shape that sendOutbound's channel-fallback loop can consume.
 *
 * The underlying provider calls (sendSmsTelnyx, telephony.sendSms, Resend
 * fetch) return `{error: string}` on recoverable failure instead of throwing.
 * The CircuitBreaker primitive, however, counts failures via thrown errors —
 * so this wrapper:
 *
 *   1. Invokes `call()` inside `breaker.execute()`.
 *   2. If the result contains an `error` key, throws so the breaker registers
 *      a failure (contributing to threshold).
 *   3. Catches the throw and returns the original `{error}` shape to the caller.
 *   4. Catches CircuitOpenError specifically and returns the structured
 *      `{error: "circuit_open:<breaker-name>"}` marker so sendOutbound can
 *      route to the next fallback channel.
 *
 * Non-CircuitOpenError throws (network stack exceptions, JSON parse errors,
 * etc.) are caught and returned as `{error: err.message}` — callers already
 * know how to handle arbitrary error strings.
 */
export async function runThroughBreaker<T extends object>(
  breaker: CircuitBreaker,
  call: () => Promise<T | { error: string }>
): Promise<T | { error: string }> {
  try {
    return await breaker.execute(async () => {
      const result = await call();
      if (result && typeof result === "object" && "error" in result) {
        throw new Error((result as { error: string }).error);
      }
      return result as T;
    });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return { error: `circuit_open:${err.breakerName}` };
    }
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
