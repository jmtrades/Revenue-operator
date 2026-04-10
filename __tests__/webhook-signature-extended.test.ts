import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, isTimestampFresh, makeNonce } from "@/lib/security/webhook-signature";
import { createHmac } from "crypto";

describe("webhook signature - extended", () => {
  describe("verifyWebhookSignature", () => {
    const secret = "test_secret_key";
    const payload = '{"event":"checkout.completed","id":"evt_123"}';

    it("accepts valid HMAC-SHA256 signature", () => {
      const sig = createHmac("sha256", secret).update(payload).digest("hex");
      expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
    });

    it("rejects tampered payload", () => {
      const sig = createHmac("sha256", secret).update(payload).digest("hex");
      expect(verifyWebhookSignature('{"event":"tampered"}', sig, secret)).toBe(false);
    });

    it("rejects wrong secret", () => {
      const sig = createHmac("sha256", "wrong_secret").update(payload).digest("hex");
      expect(verifyWebhookSignature(payload, sig, secret)).toBe(false);
    });

    it("rejects null signature", () => {
      expect(verifyWebhookSignature(payload, null, secret)).toBe(false);
    });

    it("rejects empty string signature", () => {
      expect(verifyWebhookSignature(payload, "", secret)).toBe(false);
    });

    it("rejects signature with wrong length", () => {
      expect(verifyWebhookSignature(payload, "abc123", secret)).toBe(false);
    });
  });

  describe("isTimestampFresh", () => {
    it("accepts current timestamp", () => {
      expect(isTimestampFresh(Date.now())).toBe(true);
    });

    it("accepts timestamp 4 minutes ago", () => {
      expect(isTimestampFresh(Date.now() - 240_000)).toBe(true);
    });

    it("rejects timestamp 6 minutes ago", () => {
      expect(isTimestampFresh(Date.now() - 360_000)).toBe(false);
    });

    it("rejects timestamp from the future (> 5 min ahead)", () => {
      expect(isTimestampFresh(Date.now() + 400_000)).toBe(false);
    });

    it("accepts timestamp slightly in the future (< 5 min)", () => {
      expect(isTimestampFresh(Date.now() + 100_000)).toBe(true);
    });
  });

  describe("makeNonce", () => {
    it("produces consistent nonce for same input", () => {
      const n1 = makeNonce("payload", 12345);
      const n2 = makeNonce("payload", 12345);
      expect(n1).toBe(n2);
    });

    it("produces different nonce for different payload", () => {
      const n1 = makeNonce("payload1", 12345);
      const n2 = makeNonce("payload2", 12345);
      expect(n1).not.toBe(n2);
    });

    it("produces different nonce for different timestamp", () => {
      const n1 = makeNonce("payload", 12345);
      const n2 = makeNonce("payload", 12346);
      expect(n1).not.toBe(n2);
    });

    it("returns a hex string", () => {
      const nonce = makeNonce("test", 1000);
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });
  });
});
