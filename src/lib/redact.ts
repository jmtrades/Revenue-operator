/**
 * Redaction - never log secrets, auth headers, or env vars.
 */

const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "key",
  "authorization",
  "cookie",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "credential",
  "auth",
];

const SENSITIVE_PREFIXES = ["x-", "cf-", "sec-"];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.some((k) => lower.includes(k))) return true;
  if (SENSITIVE_PREFIXES.some((p) => lower.startsWith(p))) return true;
  return false;
}

function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 8 && /^[a-zA-Z0-9_-]+$/.test(value)) return "[REDACTED]";
    return "[REDACTED]";
  }
  if (typeof value === "object" && value !== null) {
    return redactObj(value as Record<string, unknown>);
  }
  return value;
}

function redactObj(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isSensitiveKey(k)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactObj(v as Record<string, unknown>);
    } else if (isSensitiveKey(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Redact sensitive keys from object for safe logging. */
export function redact<T extends Record<string, unknown>>(obj: T): T {
  return redactObj(obj) as T;
}

/** Redact headers (authorization, cookies, etc). */
export function redactHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const h = headers instanceof Headers
    ? Object.fromEntries(headers.entries())
    : headers;
  return redact(h) as Record<string, string>;
}
