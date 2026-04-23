/**
 * Phase 78 Task 11.3 — middleware.ts must emit a per-request CSP with a
 * crypto-random nonce. Two requests must receive different nonces, the CSP
 * must propagate onto both the request (so Next.js stamps it onto framework
 * inline scripts) and the response (so the browser enforces it), and an
 * `x-nonce` header must be exposed for server components that mint their
 * own inline scripts.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

function makeReq(path = "/"): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`));
}

describe("middleware CSP", () => {
  it("sets content-security-policy on the response", () => {
    const res = middleware(makeReq());
    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toMatch(/'nonce-[A-Za-z0-9_-]{22,}'/);
    // No unsafe-inline in script-src.
    const scriptDirective = (csp ?? "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("script-src "));
    expect(scriptDirective).toBeTruthy();
    expect(scriptDirective).not.toContain("'unsafe-inline'");
  });

  it("assigns a fresh nonce on every request", () => {
    const a = middleware(makeReq("/a")).headers.get("content-security-policy") ?? "";
    const b = middleware(makeReq("/b")).headers.get("content-security-policy") ?? "";
    const nonceA = a.match(/'nonce-([A-Za-z0-9_-]+)'/)?.[1];
    const nonceB = b.match(/'nonce-([A-Za-z0-9_-]+)'/)?.[1];
    expect(nonceA).toBeTruthy();
    expect(nonceB).toBeTruthy();
    expect(nonceA).not.toBe(nonceB);
  });

  it("keeps x-request-id and adds x-url to the response", () => {
    const res = middleware(makeReq("/foo?bar=1"));
    expect(res.headers.get("x-request-id")).toMatch(/.+/);
    expect(res.headers.get("x-url")).toContain("/foo");
  });

  it("media-src no longer carries the bare 'https:' wildcard", () => {
    const csp = middleware(makeReq()).headers.get("content-security-policy") ?? "";
    const media = csp
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("media-src "))!;
    // Regression: a previous policy wrote `media-src 'self' data: blob: https:`
    // which allowed any HTTPS origin as a media source.
    const tokens = media.slice("media-src ".length).split(/\s+/);
    expect(tokens).not.toContain("https:");
    expect(tokens).toContain("https://*.supabase.co");
  });
});
