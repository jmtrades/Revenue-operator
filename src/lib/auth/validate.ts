/**
 * Shared validation for auth APIs. Same rules for everyone (client, API, other clients).
 */

const MAX_EMAIL = 255;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 256;
const MAX_BUSINESS_NAME = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required." };
  if (trimmed.length > MAX_EMAIL) return { ok: false, error: "Email is too long." };
  if (!EMAIL_REGEX.test(trimmed)) return { ok: false, error: "Please enter a valid email address." };
  return { ok: true, value: trimmed };
}

export function validatePasswordForSignup(password: string): { ok: true; value: string } | { ok: false; error: string } {
  if (!password || typeof password !== "string") return { ok: false, error: "Password is required." };
  if (password.length < MIN_PASSWORD) return { ok: false, error: "Password must be at least 8 characters." };
  if (password.length > MAX_PASSWORD) return { ok: false, error: "Password is too long." };
  if (!/\d/.test(password)) return { ok: false, error: "Password must contain at least one number." };
  return { ok: true, value: password };
}

export function validatePasswordForSignin(password: string): { ok: true; value: string } | { ok: false; error: string } {
  if (!password || typeof password !== "string") return { ok: false, error: "Password is required." };
  const trimmed = password.trim();
  if (!trimmed) return { ok: false, error: "Password is required." };
  if (trimmed.length > MAX_PASSWORD) return { ok: false, error: "Invalid email or password." };
  return { ok: true, value: trimmed };
}

export function normalizeBusinessName(input: unknown): string {
  if (typeof input !== "string") return "My Workspace";
  const trimmed = input.trim();
  if (!trimmed) return "My Workspace";
  return trimmed.slice(0, MAX_BUSINESS_NAME);
}

/**
 * Map Supabase/auth errors to user-friendly messages (same for all users).
 */
export function toFriendlySignupError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("already been")) {
    return "An account with this email already exists. Sign in or use Forgot password.";
  }
  if (m.includes("invalid email") || m.includes("valid email")) return "Please enter a valid email address.";
  if (m.includes("password") && (m.includes("weak") || m.includes("short") || m.includes("least"))) {
    return "Password must be at least 8 characters with at least one number.";
  }
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts. Please try again in a few minutes.";
  return "Sign up failed. Please try again.";
}

export function toFriendlySigninError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid") || m.includes("credentials") || m.includes("wrong") || m.includes("incorrect")) {
    return "Invalid email or password.";
  }
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts. Please try again in a few minutes.";
  if (m.includes("email not confirmed")) return "Please confirm your email first, then sign in.";
  return "Invalid email or password.";
}
