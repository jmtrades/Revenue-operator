/**
 * Phase 78/Phase 3 — PostgREST-safe E.164 assertion and normalization.
 *
 * WHY THIS EXISTS
 *
 * Supabase's `.or(...)` / `.in(...)` builders interpolate their arguments
 * directly into a PostgREST filter string that the server re-parses. Any
 * unvalidated phone-like input the client lets through is a parser
 * injection channel:
 *
 *   const from = req.form.get("From");                  // attacker-controlled
 *   supabase.from("leads").or(`phone.eq.${from}`);      // ← injection point
 *
 * If `from` is `+14155551234,workspace_id.eq.00000000-…-00` the server
 * honors the second clause as a legitimate OR term. The effective query
 * now leaks across workspaces. This is exactly the D7/D7a/D7b class of
 * defect called out in the Phase 78 audit.
 *
 * USAGE
 *
 *   import { assertE164, normalizePhone } from "@/lib/security/phone";
 *
 *   const rawFrom = String(form.get("From") ?? "");
 *   const from = normalizePhone(rawFrom);
 *   if (!from) return new Response("invalid From", { status: 400 });
 *
 *   // At this point `from` is guaranteed to match /^\+[1-9]\d{1,14}$/ —
 *   // no comma, no dot, no parenthesis, no quote. Safe to interpolate.
 *   await db.from("leads").or(`phone.eq.${from},phone.eq.${from}`);
 *
 * DESIGN
 *
 * Strict E.164 (ITU-T Recommendation): a leading "+" followed by a single
 * non-zero country digit and 1–14 additional digits, for a total of 2–15
 * digits after the plus sign. Nothing else is accepted — not spaces, not
 * dashes, not parens. Callers that need to accept loose user input should
 * run `normalizePhone()` first.
 *
 * NOTE: the project already has two broader phone modules
 * (`src/lib/phone/normalize.ts`, `src/lib/validation/phone-number.ts`).
 * This module is intentionally narrower: its contract is exactly what
 * PostgREST interpolation needs, nothing more. Think of it as the
 * adversarial checkpoint; the other modules are general-purpose.
 */

/**
 * Strict E.164: `+`, non-zero country digit, then 1–14 more digits.
 * Minimum 2 total digits, maximum 15 — matches ITU-T E.164.
 */
export const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * Assert that `value` is a strict E.164 string. Returns `value` unchanged
 * on success. Throws on any deviation — including empty strings, non-string
 * inputs, unnormalized formats, and PostgREST injection payloads.
 *
 * Always pair this with a user-facing 400 response rather than surfacing
 * the exception.
 */
export function assertE164(value: unknown): string {
  if (typeof value !== "string" || !E164_REGEX.test(value)) {
    throw new Error("assertE164: invalid E.164 phone");
  }
  return value;
}

/**
 * Best-effort normalize-then-validate. Returns an E.164 string on success,
 * or `null` if the input cannot be rendered as valid E.164.
 *
 * Handles common loose formats — "(415) 555-1234", "415-555-1234",
 * "14155551234" — by extracting digits and defaulting to US country code
 * when the digit count matches NANP shapes. Refuses to silently fall back
 * to the raw string, which is what the deleted `createServerClient`
 * footgun used to do on other code paths.
 */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;

  // Preserve a leading `+` before stripping non-digits.
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return null;

  let candidate: string | null = null;
  if (hasPlus) {
    candidate = `+${digits}`;
  } else if (digits.length === 10) {
    candidate = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    candidate = `+${digits}`;
  } else if (digits.length >= 8 && digits.length <= 15) {
    candidate = `+${digits}`;
  } else {
    return null;
  }

  return E164_REGEX.test(candidate) ? candidate : null;
}
