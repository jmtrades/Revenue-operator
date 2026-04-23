/**
 * Upstream OAuth token revocation (Phase 78 / Phase 5 — P0-11 Data, GDPR/CCPA).
 *
 * When a user disconnects an integration, the local token row gets deleted —
 * but that alone doesn't invalidate the token at the provider. Anyone with a
 * copy (log files, DB backups, a compromised engineer) could continue using
 * it until expiry (months for refresh tokens, sometimes longer). Calling the
 * provider's revoke endpoint first is the GDPR/CCPA-compliant disconnect.
 *
 * Failure policy: upstream revoke can fail for all sorts of reasons outside
 * our control (provider outage, already-revoked token, credential rotation,
 * network partition). We log the failure but don't re-throw, because
 * stopping the local delete would strand the user in a half-disconnected
 * state the UI can't recover from. The user's intent is "disconnect"; we
 * honor that locally even when the upstream handshake fails.
 *
 * Timeout: capped at 5 seconds so a slow/hung upstream cannot hold the
 * disconnect HTTP handler open indefinitely. Real-world provider revoke
 * endpoints respond in <500ms when healthy; 5s is generous head-room.
 */

import { log } from "@/lib/logger";

/** Providers whose revoke flow this helper knows how to speak. */
export type RevokeProvider =
  | "google"
  | "google_calendar"
  | "google_contacts"
  | "microsoft_365"
  | "hubspot"
  | "salesforce"
  | "zoho_crm"
  | "slack"
  | "zoom";

const REVOKE_TIMEOUT_MS = 5_000;

interface RevokeRequestBuilder {
  (token: string): { url: string; init: RequestInit };
}

/**
 * Build the `{url, init}` pair to POST to each provider's revoke endpoint.
 *
 * Providers vary significantly in how they want the revoke request framed —
 * some (Google, Zoom, Salesforce) take a token-type URL-encoded form body,
 * some (HubSpot) want the token in the path as a DELETE, and Slack's OAuth
 * v2 revoke is a POST to `auth.revoke` with Bearer auth. Keeping them all
 * in one switch makes the differences auditable.
 */
const PROVIDER_REVOKE_BUILDERS: Record<RevokeProvider, RevokeRequestBuilder> = {
  google: (token) => ({
    url: `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  }),
  google_calendar: (token) => ({
    url: `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  }),
  google_contacts: (token) => ({
    url: `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  }),
  microsoft_365: (_token) => ({
    // Microsoft Identity platform has no standalone token-revoke endpoint
    // for AAD v2. The closest equivalent is the logout endpoint which
    // invalidates the session; per-token revoke is not exposed. We call
    // the logout endpoint so there IS an upstream round-trip on disconnect
    // (honoring user intent as visibly as the provider allows).
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
    init: { method: "POST" },
  }),
  hubspot: (token) => ({
    // HubSpot's refresh-token delete is DELETE /oauth/v1/refresh-tokens/{token}.
    url: `https://api.hubapi.com/oauth/v1/refresh-tokens/${encodeURIComponent(token)}`,
    init: { method: "DELETE" },
  }),
  salesforce: (token) => ({
    url: "https://login.salesforce.com/services/oauth2/revoke",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
    },
  }),
  zoho_crm: (token) => ({
    url: `https://accounts.zoho.com/oauth/v2/token/revoke?token=${encodeURIComponent(token)}`,
    init: { method: "POST" },
  }),
  slack: (token) => ({
    url: "https://slack.com/api/auth.revoke",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  }),
  zoom: (token) => ({
    url: "https://zoom.us/oauth/revoke",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
    },
  }),
};

/**
 * Call the provider's revoke endpoint for `token`. Never throws.
 *
 * No-ops when:
 *   - `token` is empty/missing (nothing to revoke).
 *   - `provider` is not in our known-providers map.
 */
export async function revokeProviderToken(
  provider: RevokeProvider,
  token: string,
): Promise<void> {
  if (!token) return;
  const builder = PROVIDER_REVOKE_BUILDERS[provider];
  if (!builder) return;

  const { url, init } = builder(token);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REVOKE_TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      log("warn", "oauth_revoke.upstream_error", {
        provider,
        status: res.status,
      });
    } else {
      log("info", "oauth_revoke.ok", { provider });
    }
  } catch (err) {
    log("warn", "oauth_revoke.failed", {
      provider,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timer);
  }
}
