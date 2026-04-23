/**
 * Phase 78 / Phase 5 — PKCE + signed state for OAuth flows.
 *
 * Before this module, Google OAuth accepted an `authorization_code` with only
 * `client_secret` — no proof-of-possession tying the redirect back to the
 * originating browser. A stolen `code` could be redeemed from any network
 * location. PKCE (RFC 7636) fixes this by requiring the initiator to send a
 * `code_verifier` matching the `code_challenge` presented at authorization.
 *
 * `signState` additionally prevents CSRF by binding the workspace_id (and any
 * return_to / extra payload) to an HMAC-SHA256 signature with a 5-minute exp.
 * Rejection is via `timingSafeEqual` so attackers can't distinguish bad
 * signatures from expired ones via timing.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  generatePKCE,
  verifyState,
  signState,
} from "@/lib/security/oauth-pkce";

const GOOD_SECRET = "y".repeat(32);

describe("oauth-pkce (Phase 78/Phase 5)", () => {
  const prevSecret = process.env.OAUTH_STATE_SECRET;

  beforeEach(() => {
    process.env.OAUTH_STATE_SECRET = GOOD_SECRET;
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.OAUTH_STATE_SECRET;
    else process.env.OAUTH_STATE_SECRET = prevSecret;
  });

  describe("generatePKCE", () => {
    it("produces code_verifier + S256 code_challenge + signed state", () => {
      const p = generatePKCE({ workspace_id: "ws_1", return_to: "/connect" });

      expect(p.code_verifier).toMatch(/^[A-Za-z0-9_\-]{43,128}$/);
      expect(p.code_challenge).toMatch(/^[A-Za-z0-9_\-]{43}$/);
      expect(p.code_challenge_method).toBe("S256");

      const parsed = verifyState(p.state);
      expect(parsed.workspace_id).toBe("ws_1");
      expect(parsed.return_to).toBe("/connect");
    });

    it("code_challenge is base64url(sha256(code_verifier))", () => {
      const p = generatePKCE({ workspace_id: "ws_1" });
      const expected = crypto
        .createHash("sha256")
        .update(p.code_verifier)
        .digest("base64url");
      expect(p.code_challenge).toBe(expected);
    });

    it("produces a different verifier on every call", () => {
      const a = generatePKCE({ workspace_id: "ws_1" });
      const b = generatePKCE({ workspace_id: "ws_1" });
      expect(a.code_verifier).not.toBe(b.code_verifier);
      expect(a.code_challenge).not.toBe(b.code_challenge);
      expect(a.state).not.toBe(b.state);
    });

    it("throws if OAUTH_STATE_SECRET is unset", () => {
      delete process.env.OAUTH_STATE_SECRET;
      expect(() => generatePKCE({ workspace_id: "ws_1" })).toThrow(
        /OAUTH_STATE_SECRET/,
      );
    });

    it("throws if OAUTH_STATE_SECRET is too short", () => {
      process.env.OAUTH_STATE_SECRET = "short";
      expect(() => generatePKCE({ workspace_id: "ws_1" })).toThrow(
        /OAUTH_STATE_SECRET/,
      );
    });
  });

  describe("verifyState", () => {
    it("rejects tampered state", () => {
      const p = generatePKCE({ workspace_id: "ws_1" });
      expect(() => verifyState(p.state + "x")).toThrow(/signature/);
    });

    it("rejects state signed with a different secret", () => {
      const p = generatePKCE({ workspace_id: "ws_1" });
      process.env.OAUTH_STATE_SECRET = "z".repeat(32);
      expect(() => verifyState(p.state)).toThrow(/signature/);
    });

    it("rejects malformed state (no dot separator)", () => {
      expect(() => verifyState("not-a-valid-state-string")).toThrow(
        /malformed/,
      );
    });

    it("rejects expired state", () => {
      // Craft an expired state by signing a body whose exp is in the past.
      const body = {
        workspace_id: "ws_1",
        exp: Math.floor(Date.now() / 1000) - 1,
      };
      const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
      const sig = crypto
        .createHmac("sha256", GOOD_SECRET)
        .update(encoded)
        .digest("base64url");
      expect(() => verifyState(`${encoded}.${sig}`)).toThrow(/expired/);
    });

    it("accepts state inside the exp window", () => {
      const p = generatePKCE({ workspace_id: "ws_42", return_to: "/foo" });
      const parsed = verifyState(p.state);
      expect(parsed.workspace_id).toBe("ws_42");
      expect(parsed.return_to).toBe("/foo");
      // exp should be ~5 minutes from now.
      expect(typeof parsed.exp).toBe("number");
      expect(parsed.exp as unknown as number).toBeGreaterThan(
        Math.floor(Date.now() / 1000),
      );
      expect(parsed.exp as unknown as number).toBeLessThanOrEqual(
        Math.floor(Date.now() / 1000) + 305,
      );
    });

    it("uses timingSafeEqual — rejects same-length bad signatures", () => {
      const p = generatePKCE({ workspace_id: "ws_1" });
      const [body, sig] = p.state.split(".");
      // Flip the last byte of the base64url signature (same length, wrong bytes).
      const flipped =
        sig.slice(0, -1) + (sig.slice(-1) === "a" ? "b" : "a");
      expect(() => verifyState(`${body}.${flipped}`)).toThrow(/signature/);
    });
  });

  describe("signState (direct)", () => {
    it("round-trips arbitrary string payloads", () => {
      const state = signState({ a: "1", b: "2" });
      const parsed = verifyState(state);
      expect(parsed.a).toBe("1");
      expect(parsed.b).toBe("2");
    });
  });
});
