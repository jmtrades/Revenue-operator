import { getBaseUrl } from "@/lib/runtime/base-url";

function getEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function getGoogleAuthClientId(): string | null {
  return getEnv(
    "GOOGLE_AUTH_CLIENT_ID",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_ID",
  );
}

export function getGoogleAuthClientSecret(): string | null {
  return getEnv(
    "GOOGLE_AUTH_CLIENT_SECRET",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_OAUTH_CLIENT_SECRET",
  );
}

export function getGoogleAuthRedirectUri(requestOrigin?: string | null): string {
  return `${getBaseUrl(requestOrigin)}/api/auth/google/callback`;
}

export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/app/activity";
  if (value.startsWith("//")) return "/app/activity";
  return value;
}
