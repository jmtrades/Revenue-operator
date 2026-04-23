/**
 * Phase 78 / Phase 5 (P0-11 Data, GDPR/CCPA) — upstream OAuth token revocation
 * on disconnect.
 *
 * When a user clicks "Disconnect" the right thing happens is:
 *
 *   1. We tell the upstream provider to revoke the token we hold.
 *   2. We delete the local row.
 *
 * Pre-Phase-5, step 1 was missing: deleting the row stopped US from using
 * the token, but the token itself remained valid at the provider. Any copy
 * in logs, DB backups, or an attacker's hands would continue to work until
 * expiry (months, in some cases years). This is a GDPR/CCPA failure — the
 * user's request to disconnect is not honored with the upstream IdP.
 *
 * `revokeProviderToken` is intentionally forgiving of upstream failure:
 * we log but don't re-throw so that a 5xx from Google doesn't strand the
 * user's local state in "half-disconnected". The local delete proceeds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  revokeProviderToken,
  type RevokeProvider,
} from "@/lib/security/oauth-revoke";

describe("revokeProviderToken (Phase 78/Phase 5)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it.each<[RevokeProvider, string]>([
    ["google", "oauth2.googleapis.com/revoke"],
    ["google_calendar", "oauth2.googleapis.com/revoke"],
    ["google_contacts", "oauth2.googleapis.com/revoke"],
    ["microsoft_365", "login.microsoftonline.com"],
    ["hubspot", "api.hubapi.com/oauth/v1/refresh-tokens"],
    ["salesforce", "login.salesforce.com/services/oauth2/revoke"],
    ["zoho_crm", "accounts.zoho.com/oauth/v2/token/revoke"],
    ["slack", "slack.com/api/auth.revoke"],
    ["zoom", "zoom.us/oauth/revoke"],
  ])("POSTs to the provider revoke endpoint for %s", async (provider, urlFrag) => {
    await revokeProviderToken(provider, "tok_abc");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain(urlFrag);
  });

  it("does NOT throw when upstream returns 4xx/5xx — local delete must proceed", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("upstream dead", { status: 503 }));
    await expect(revokeProviderToken("google", "tok_abc")).resolves.toBeUndefined();
  });

  it("does NOT throw on network error — local delete must proceed", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network unreachable"));
    await expect(revokeProviderToken("google", "tok_abc")).resolves.toBeUndefined();
  });

  it("no-ops (no fetch) for unknown providers", async () => {
    // @ts-expect-error — deliberately passing an unsupported provider
    await revokeProviderToken("made_up_provider", "tok");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no-ops (no fetch) when token is empty", async () => {
    await revokeProviderToken("google", "");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("times out quickly — does not hang disconnect on a slow upstream", async () => {
    // Simulate an upstream that hangs past our timeout budget.
    fetchSpy.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_, reject) => {
          const signal = (init as RequestInit | undefined)?.signal as
            | AbortSignal
            | undefined;
          if (signal) {
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }
        }),
    );
    const start = Date.now();
    await revokeProviderToken("google", "tok_abc");
    // Module uses a 5-second abort. Allow generous slack for CI jitter but
    // fail if the call hung past 10 seconds.
    expect(Date.now() - start).toBeLessThan(10_000);
  }, 15_000);
});
