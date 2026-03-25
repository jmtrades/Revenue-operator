import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, isTimestampFresh } from "../src/lib/security/webhook-signature";
import { createHmac } from "crypto";

describe("Webhook signature", () => {
  it("verifies valid HMAC signature", () => {
    const payload = '{"test":1}';
    const secret = "sk_test";
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyWebhookSignature('{"x":1}', "wrong", "secret")).toBe(false);
  });

  it("rejects null signature", () => {
    expect(verifyWebhookSignature("{}", null, "secret")).toBe(false);
  });

  it("timestamp fresh when within tolerance", () => {
    const now = Date.now();
    expect(isTimestampFresh(now)).toBe(true);
  });

  it("timestamp stale when too old", () => {
    const old = Date.now() - 400 * 1000;
    expect(isTimestampFresh(old)).toBe(false);
  });
});
