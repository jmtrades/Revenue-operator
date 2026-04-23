/**
 * Phase 78 / Phase 4 — always-on Twilio signature verifier.
 *
 * These tests lock in the fail-closed contract of `verifyTwilioRequest`:
 *   - Missing TWILIO_AUTH_TOKEN throws (never silently returns false — the
 *     handler should 500, not 200).
 *   - Missing / wrong / tampered signatures all return false.
 *   - Correctly signed requests pass, via URLSearchParams, plain object, or
 *     FormData.
 *   - Candidate-URL matching accepts any matching variant (trailing slash,
 *     app-URL rewrite, www-stripped).
 *   - `buildTwilioCandidateUrls` returns the conservative set expected by
 *     handler code.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  verifyTwilioRequest,
  buildTwilioCandidateUrls,
  TwilioSignatureConfigError,
} from "@/lib/security/twilio-signature";

function signTwilio(token: string, url: string, params: Record<string, string>): string {
  const canonical = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return crypto
    .createHmac("sha1", token)
    .update(Buffer.from(canonical, "utf-8"))
    .digest("base64");
}

describe("verifyTwilioRequest — always-on", () => {
  const ORIGINAL_TOKEN = process.env.TWILIO_AUTH_TOKEN;

  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = "test-token-123";
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = ORIGINAL_TOKEN;
  });

  it("throws TwilioSignatureConfigError when TWILIO_AUTH_TOKEN is unset", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    expect(() =>
      verifyTwilioRequest(
        "https://x/api/webhooks/twilio/inbound",
        new URLSearchParams(),
        "sig"
      )
    ).toThrow(TwilioSignatureConfigError);
  });

  it("throw message names the required env var (so ops can fix it fast)", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    expect(() =>
      verifyTwilioRequest("https://x/", new URLSearchParams(), "sig")
    ).toThrow(/TWILIO_AUTH_TOKEN/);
  });

  it("rejects when the x-twilio-signature header is missing", () => {
    expect(
      verifyTwilioRequest(
        "https://example.com/api/webhooks/twilio/inbound",
        new URLSearchParams({ From: "+14155551234" }),
        null
      )
    ).toBe(false);
  });

  it("rejects a bogus signature", () => {
    expect(
      verifyTwilioRequest(
        "https://example.com/api/webhooks/twilio/inbound",
        new URLSearchParams({ From: "+14155551234", Body: "hi" }),
        "not-a-real-signature"
      )
    ).toBe(false);
  });

  it("accepts a correctly signed request (URLSearchParams)", () => {
    const url = "https://example.com/api/webhooks/twilio/inbound";
    const params = { From: "+14155551234", To: "+14155559999", Body: "hi" };
    const sig = signTwilio("test-token-123", url, params);
    expect(verifyTwilioRequest(url, new URLSearchParams(params), sig)).toBe(true);
  });

  it("accepts a correctly signed request (plain object)", () => {
    const url = "https://example.com/api/webhooks/twilio/inbound";
    const params = { From: "+14155551234", Body: "hi" };
    const sig = signTwilio("test-token-123", url, params);
    expect(verifyTwilioRequest(url, params, sig)).toBe(true);
  });

  it("accepts a correctly signed request (FormData)", () => {
    const url = "https://example.com/api/webhooks/twilio/inbound";
    const params = { From: "+14155551234", Body: "hi" };
    const sig = signTwilio("test-token-123", url, params);
    const fd = new FormData();
    for (const [k, v] of Object.entries(params)) fd.append(k, v);
    expect(verifyTwilioRequest(url, fd, sig)).toBe(true);
  });

  it("rejects a request with a tampered param (signature no longer matches body)", () => {
    const url = "https://example.com/api/webhooks/twilio/inbound";
    const params = { From: "+14155551234", Body: "hi" };
    const sig = signTwilio("test-token-123", url, params);
    const tampered = { ...params, Body: "attack" };
    expect(verifyTwilioRequest(url, tampered, sig)).toBe(false);
  });

  it("rejects a request whose signature was minted with a different token", () => {
    const url = "https://example.com/api/webhooks/twilio/inbound";
    const params = { From: "+14155551234" };
    const sigFromWrongToken = signTwilio("OTHER-TOKEN", url, params);
    expect(verifyTwilioRequest(url, params, sigFromWrongToken)).toBe(false);
  });

  it("accepts when only ONE of several candidate URLs matches", () => {
    const withSlash = "https://example.com/api/webhooks/twilio/inbound/";
    const withoutSlash = "https://example.com/api/webhooks/twilio/inbound";
    const params = { From: "+14155551234" };
    const sig = signTwilio("test-token-123", withSlash, params);
    expect(verifyTwilioRequest([withoutSlash, withSlash], params, sig)).toBe(true);
  });

  it("rejects when NO candidate URL matches (different host)", () => {
    const goodUrl = "https://example.com/api/webhooks/twilio/inbound";
    const attackerUrl = "https://attacker.example/api/webhooks/twilio/inbound";
    const params = { From: "+14155551234" };
    const sig = signTwilio("test-token-123", goodUrl, params);
    expect(verifyTwilioRequest(attackerUrl, params, sig)).toBe(false);
  });
});

describe("buildTwilioCandidateUrls", () => {
  const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (ORIGINAL_APP_URL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
  });

  it("returns the incoming URL and the configured URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://api.example.com";
    const req = new Request("https://internal.fly.dev/api/webhooks/twilio/voice");
    const urls = buildTwilioCandidateUrls(req);
    expect(urls).toContain("https://internal.fly.dev/api/webhooks/twilio/voice");
    expect(urls).toContain("https://api.example.com/api/webhooks/twilio/voice");
  });

  it("produces a trailing-slash variant of the configured URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://api.example.com";
    const req = new Request("https://api.example.com/api/webhooks/twilio/voice");
    const urls = buildTwilioCandidateUrls(req);
    expect(urls).toContain("https://api.example.com/api/webhooks/twilio/voice/");
  });

  it("produces a www-stripped variant when configured with https://www.", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.example.com";
    const req = new Request("https://www.example.com/api/webhooks/twilio/voice");
    const urls = buildTwilioCandidateUrls(req);
    expect(urls).toContain("https://example.com/api/webhooks/twilio/voice");
  });

  it("preserves the query string on every variant", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://api.example.com";
    const req = new Request(
      "https://api.example.com/api/webhooks/twilio/voice?session=abc"
    );
    const urls = buildTwilioCandidateUrls(req);
    for (const u of urls) expect(u).toContain("?session=abc");
  });

  it("dedupes identical variants", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://api.example.com";
    const req = new Request("https://api.example.com/api/webhooks/twilio/voice");
    const urls = buildTwilioCandidateUrls(req);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("returns at least the incoming URL when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const req = new Request("https://internal.fly.dev/api/webhooks/twilio/voice");
    const urls = buildTwilioCandidateUrls(req);
    expect(urls.length).toBeGreaterThanOrEqual(1);
    expect(urls).toContain("https://internal.fly.dev/api/webhooks/twilio/voice");
  });
});
