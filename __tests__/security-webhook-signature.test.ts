/**
 * Tests for src/lib/security/webhook-signature.ts
 * Unit tests for HMAC signature verification, timestamp freshness, and nonce generation.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { createHmac } from "crypto";
import {
  verifyWebhookSignature,
  isTimestampFresh,
  makeNonce,
} from "@/lib/security/webhook-signature";

const SRC = readFileSync(
  path.resolve(__dirname, "..", "src", "lib", "security", "webhook-signature.ts"),
  "utf-8",
);

/* ------------------------------------------------------------------ */
/*  Structural tests                                                   */
/* ------------------------------------------------------------------ */

describe("webhook-signature.ts structural", () => {
  it("uses HMAC-SHA256 for signature verification", () => {
    expect(SRC).toContain('createHmac("sha256"');
  });

  it("uses timingSafeEqual for constant-time comparison", () => {
    expect(SRC).toContain("timingSafeEqual");
  });

  it("imports both createHmac and timingSafeEqual from crypto", () => {
    expect(SRC).toMatch(/import\s*\{[^}]*createHmac[^}]*timingSafeEqual[^}]*\}\s*from\s*["']crypto["']/);
  });

  it("has a tolerance window of 300 seconds", () => {
    expect(SRC).toContain("TOLERANCE_SEC = 300");
  });

  it("has a replay window constant", () => {
    expect(SRC).toMatch(/REPLAY_WINDOW_SEC\s*=\s*3600/);
  });

  it("checks signature length before comparing", () => {
    expect(SRC).toContain("expected.length !== signature.length");
  });

  it("outputs hex digest for signatures", () => {
    expect(SRC).toContain('.digest("hex")');
  });
});

/* ------------------------------------------------------------------ */
/*  verifyWebhookSignature unit tests                                  */
/* ------------------------------------------------------------------ */

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const payload = '{"event":"lead.created","id":"123"}';

  function computeSignature(data: string, key: string): string {
    return createHmac("sha256", key).update(data).digest("hex");
  }

  it("returns true for a valid signature", () => {
    const sig = computeSignature(payload, secret);
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it("returns false for an incorrect signature", () => {
    expect(verifyWebhookSignature(payload, "bad-signature", secret)).toBe(false);
  });

  it("returns false for null signature", () => {
    expect(verifyWebhookSignature(payload, null, secret)).toBe(false);
  });

  it("returns false for empty string signature", () => {
    expect(verifyWebhookSignature(payload, "", secret)).toBe(false);
  });

  it("returns false when signature has wrong length", () => {
    const sig = computeSignature(payload, secret);
    expect(verifyWebhookSignature(payload, sig + "extra", secret)).toBe(false);
  });

  it("returns false when signed with different secret", () => {
    const sig = computeSignature(payload, "wrong-secret");
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(false);
  });

  it("returns false for different payload", () => {
    const sig = computeSignature("other payload", secret);
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(false);
  });

  it("verifies empty payload correctly", () => {
    const sig = computeSignature("", secret);
    expect(verifyWebhookSignature("", sig, secret)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  isTimestampFresh unit tests                                        */
/* ------------------------------------------------------------------ */

describe("isTimestampFresh", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for current timestamp", () => {
    expect(isTimestampFresh(Date.now())).toBe(true);
  });

  it("returns true for timestamp 1 second ago", () => {
    expect(isTimestampFresh(Date.now() - 1_000)).toBe(true);
  });

  it("returns true for timestamp 299 seconds ago", () => {
    expect(isTimestampFresh(Date.now() - 299_000)).toBe(true);
  });

  it("returns true for timestamp exactly 300 seconds ago", () => {
    // isTimestampFresh uses <= TOLERANCE_SEC
    expect(isTimestampFresh(Date.now() - 300_000)).toBe(true);
  });

  it("returns false for timestamp 301 seconds ago", () => {
    expect(isTimestampFresh(Date.now() - 301_000)).toBe(false);
  });

  it("returns false for timestamp 10 minutes ago", () => {
    expect(isTimestampFresh(Date.now() - 600_000)).toBe(false);
  });

  it("returns true for timestamp 299 seconds in the future", () => {
    expect(isTimestampFresh(Date.now() + 299_000)).toBe(true);
  });

  it("returns false for timestamp 301 seconds in the future", () => {
    expect(isTimestampFresh(Date.now() + 301_000)).toBe(false);
  });

  it("returns false for zero timestamp (epoch)", () => {
    expect(isTimestampFresh(0)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  makeNonce unit tests                                               */
/* ------------------------------------------------------------------ */

describe("makeNonce", () => {
  it("returns a hex string", () => {
    const nonce = makeNonce("payload", 1000);
    expect(nonce).toMatch(/^[a-f0-9]+$/);
  });

  it("returns a 64-character hex string (SHA-256)", () => {
    const nonce = makeNonce("payload", 1000);
    expect(nonce).toHaveLength(64);
  });

  it("produces consistent output for same input", () => {
    const a = makeNonce("data", 12345);
    const b = makeNonce("data", 12345);
    expect(a).toBe(b);
  });

  it("produces different output for different payloads", () => {
    const a = makeNonce("payload-a", 12345);
    const b = makeNonce("payload-b", 12345);
    expect(a).not.toBe(b);
  });

  it("produces different output for different timestamps", () => {
    const a = makeNonce("same-payload", 1000);
    const b = makeNonce("same-payload", 2000);
    expect(a).not.toBe(b);
  });

  it("handles empty payload", () => {
    const nonce = makeNonce("", 0);
    expect(nonce).toHaveLength(64);
    expect(nonce).toMatch(/^[a-f0-9]+$/);
  });
});
