/**
 * Phase 78 Task 11.3 — CSP builder used by middleware.
 *
 * Goal: ensure strict-dynamic + nonce lock down script execution so a reflected
 * XSS cannot run inline <script> payloads, and that media-src is tightened from
 * the prior `https:` wildcard to the explicit recording/storage origins.
 */
import { describe, it, expect } from "vitest";
import { buildCsp, generateNonce } from "../../src/lib/security/csp";

describe("generateNonce", () => {
  it("returns 22+ base64url characters (128+ bits of entropy)", () => {
    const n = generateNonce();
    expect(n).toMatch(/^[A-Za-z0-9_-]{22,}$/);
  });

  it("returns a different value on each call", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });
});

describe("buildCsp", () => {
  const NONCE = "testnonceAAAAAAAAAAAAAAA";
  const csp = buildCsp(NONCE);

  it("has default-src 'self'", () => {
    expect(csp).toMatch(/(^|;\s*)default-src 'self'(;|$)/);
  });

  it("script-src uses strict-dynamic + the exact nonce, no unsafe-inline", () => {
    const scriptSrc = extractDirective(csp, "script-src");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).toContain(`'nonce-${NONCE}'`);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("style-src keeps 'unsafe-inline' (Next.js App Router streaming requirement) and is explicit about it", () => {
    const styleSrc = extractDirective(csp, "style-src");
    // App Router inserts <style> tags during streaming without per-element
    // nonce support; removing 'unsafe-inline' breaks hydration styling. This
    // test locks in that decision so a future refactor trips loudly.
    expect(styleSrc).toContain("'self'");
    expect(styleSrc).toContain("'unsafe-inline'");
  });

  it("media-src is tight (no bare https: wildcard) — lists explicit recording origins", () => {
    const mediaSrc = extractDirective(csp, "media-src");
    expect(mediaSrc).toContain("'self'");
    expect(mediaSrc).toContain("data:");
    expect(mediaSrc).toContain("blob:");
    expect(mediaSrc).toContain("https://*.supabase.co");
    expect(mediaSrc).toContain("https://api.twilio.com");
    expect(mediaSrc).toContain("https://api.telnyx.com");
    // Regression guard: the previous policy had `https:` as a top-level token
    // which matched ANY https origin. Make sure that slip-up cannot re-enter.
    const tokens = mediaSrc.trim().split(/\s+/);
    expect(tokens).not.toContain("https:");
  });

  it("connect-src includes Supabase, Stripe, Telnyx, Resend, Anthropic, and Sentry ingest", () => {
    const c = extractDirective(csp, "connect-src");
    expect(c).toContain("'self'");
    expect(c).toContain("https://*.supabase.co");
    expect(c).toContain("wss://*.supabase.co");
    expect(c).toContain("https://api.stripe.com");
    expect(c).toContain("https://api.telnyx.com");
    expect(c).toContain("https://api.resend.com");
    expect(c).toContain("https://api.anthropic.com");
    expect(c).toContain("https://*.sentry.io");
    expect(c).toContain("https://*.ingest.sentry.io");
  });

  it("locks down object-src, base-uri, frame-ancestors, form-action", () => {
    expect(extractDirective(csp, "object-src")).toContain("'none'");
    expect(extractDirective(csp, "base-uri")).toContain("'self'");
    expect(extractDirective(csp, "frame-ancestors")).toContain("'none'");
    expect(extractDirective(csp, "form-action")).toContain("'self'");
  });

  it("includes upgrade-insecure-requests so mixed content is blocked", () => {
    expect(csp).toMatch(/(^|;\s*)upgrade-insecure-requests(;|$)/);
  });

  it("nonce value is stable within a single buildCsp call (same nonce appears once per directive that needs it)", () => {
    const scriptSrc = extractDirective(csp, "script-src");
    const matches = scriptSrc.match(new RegExp(`'nonce-${NONCE}'`, "g")) ?? [];
    expect(matches.length).toBe(1);
  });
});

function extractDirective(csp: string, name: string): string {
  const parts = csp.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name} `) || p === name);
  if (!hit) throw new Error(`directive not found: ${name}`);
  return hit.slice(name.length).trim();
}
