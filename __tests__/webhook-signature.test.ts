import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  verifyWebhookSignature,
  isTimestampFresh,
  verifyTwilioSignature,
  verifyStripeSignature,
  verifyResendSignature,
  verifyWebhookByProvider,
} from "../src/lib/security/webhook-signature";

// ─────────────────────────────────────────────────────────────────────────────
// Generic HMAC-SHA256 (internal / Bandwidth / Telnyx)
// ─────────────────────────────────────────────────────────────────────────────

describe("verifyWebhookSignature (generic HMAC-SHA256)", () => {
  it("verifies a valid hex signature", () => {
    const payload = '{"test":1}';
    const secret = "sk_test";
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(verifyWebhookSignature('{"x":1}', "wrong", "secret")).toBe(false);
  });

  it("rejects null signature", () => {
    expect(verifyWebhookSignature("{}", null, "secret")).toBe(false);
  });

  it("rejects empty secret", () => {
    const sig = createHmac("sha256", "real").update("x").digest("hex");
    expect(verifyWebhookSignature("x", sig, "")).toBe(false);
  });

  it("rejects signature computed with a different secret", () => {
    const payload = '{"x":1}';
    const badSig = createHmac("sha256", "attacker").update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, badSig, "real-secret")).toBe(false);
  });

  it("rejects signature over a tampered payload", () => {
    const sig = createHmac("sha256", "s").update("original").digest("hex");
    expect(verifyWebhookSignature("tampered", sig, "s")).toBe(false);
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

// ─────────────────────────────────────────────────────────────────────────────
// Twilio
// ─────────────────────────────────────────────────────────────────────────────

describe("verifyTwilioSignature", () => {
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";

  // Canonical form-encoded case. Per Twilio docs, the data is:
  //   url + sort(keys).map(k => k + params[k]).join("")
  it("verifies form-encoded payload with sorted params", () => {
    const params = { CallSid: "CA123", From: "+15551234567", To: "+15557654321" };
    const sorted = Object.keys(params).sort();
    const data = sorted.reduce((acc, k) => acc + k + params[k as keyof typeof params], url);
    const sig = createHmac("sha1", authToken).update(data).digest("base64");
    expect(verifyTwilioSignature(url, params, null, sig, authToken)).toBe(true);
  });

  it("verifies raw JSON body (Events API / Messaging v1)", () => {
    const body = '{"SmsSid":"SMxx","From":"+1555"}';
    const sig = createHmac("sha1", authToken).update(url + body).digest("base64");
    expect(verifyTwilioSignature(url, undefined, body, sig, authToken)).toBe(true);
  });

  it("rejects tampered form params (added key)", () => {
    const params = { CallSid: "CA123", From: "+15551234567" };
    const sorted = Object.keys(params).sort();
    const data = sorted.reduce((acc, k) => acc + k + params[k as keyof typeof params], url);
    const sig = createHmac("sha1", authToken).update(data).digest("base64");
    const tampered = { ...params, To: "+15559999999" };
    expect(verifyTwilioSignature(url, tampered, null, sig, authToken)).toBe(false);
  });

  it("rejects signature from wrong auth token", () => {
    const params = { Foo: "bar" };
    const data = url + "Foo" + "bar";
    const sig = createHmac("sha1", "attacker-token").update(data).digest("base64");
    expect(verifyTwilioSignature(url, params, null, sig, authToken)).toBe(false);
  });

  it("rejects when url is empty", () => {
    const params = { Foo: "bar" };
    const sig = createHmac("sha1", authToken).update("Foobar").digest("base64");
    expect(verifyTwilioSignature("", params, null, sig, authToken)).toBe(false);
  });

  it("rejects when signature is null", () => {
    expect(verifyTwilioSignature(url, { a: "b" }, null, null, authToken)).toBe(false);
  });

  it("rejects when auth token is empty", () => {
    expect(verifyTwilioSignature(url, { a: "b" }, null, "sig", "")).toBe(false);
  });

  it("rejects when neither params nor rawBody provided", () => {
    const sig = createHmac("sha1", authToken).update(url).digest("base64");
    expect(verifyTwilioSignature(url, undefined, null, sig, authToken)).toBe(false);
  });

  it("sorts params correctly — order of input object keys is irrelevant", () => {
    // Build signature from one order, verify with a differently-ordered object.
    const dataSorted = url + "a1" + "b2" + "c3";
    const sig = createHmac("sha1", authToken).update(dataSorted).digest("base64");
    // Pass keys in a different insertion order:
    const params: Record<string, string> = {};
    params.c = "3";
    params.a = "1";
    params.b = "2";
    expect(verifyTwilioSignature(url, params, null, sig, authToken)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stripe
// ─────────────────────────────────────────────────────────────────────────────

describe("verifyStripeSignature", () => {
  const secret = "whsec_test_secret";
  const body = '{"id":"evt_123","type":"invoice.paid"}';
  const nowSec = 1_700_000_000;

  it("verifies a canonical Stripe signature", () => {
    const ts = nowSec;
    const signedPayload = `${ts}.${body}`;
    const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
    const header = `t=${ts},v1=${v1}`;
    expect(verifyStripeSignature(body, header, secret, 300, nowSec)).toBe(true);
  });

  it("verifies when header contains multiple v1 entries (rollover)", () => {
    const ts = nowSec;
    const signedPayload = `${ts}.${body}`;
    const v1Correct = createHmac("sha256", secret).update(signedPayload).digest("hex");
    const header = `t=${ts},v1=deadbeef${"0".repeat(56)},v1=${v1Correct}`;
    expect(verifyStripeSignature(body, header, secret, 300, nowSec)).toBe(true);
  });

  it("rejects when timestamp older than tolerance", () => {
    const ts = nowSec - 1000; // 1000s old, tolerance 300
    const signedPayload = `${ts}.${body}`;
    const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
    const header = `t=${ts},v1=${v1}`;
    expect(verifyStripeSignature(body, header, secret, 300, nowSec)).toBe(false);
  });

  it("rejects when timestamp in far future (clock skew attack)", () => {
    const ts = nowSec + 1000;
    const signedPayload = `${ts}.${body}`;
    const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
    const header = `t=${ts},v1=${v1}`;
    expect(verifyStripeSignature(body, header, secret, 300, nowSec)).toBe(false);
  });

  it("rejects header missing t=", () => {
    const v1 = createHmac("sha256", secret).update(`${nowSec}.${body}`).digest("hex");
    expect(verifyStripeSignature(body, `v1=${v1}`, secret, 300, nowSec)).toBe(false);
  });

  it("rejects header missing v1=", () => {
    expect(verifyStripeSignature(body, `t=${nowSec}`, secret, 300, nowSec)).toBe(false);
  });

  it("rejects tampered body", () => {
    const ts = nowSec;
    const v1 = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
    const header = `t=${ts},v1=${v1}`;
    expect(verifyStripeSignature('{"id":"evt_evil"}', header, secret, 300, nowSec)).toBe(false);
  });

  it("rejects signature signed with a different secret", () => {
    const ts = nowSec;
    const v1 = createHmac("sha256", "other-secret").update(`${ts}.${body}`).digest("hex");
    const header = `t=${ts},v1=${v1}`;
    expect(verifyStripeSignature(body, header, secret, 300, nowSec)).toBe(false);
  });

  it("rejects null header", () => {
    expect(verifyStripeSignature(body, null, secret, 300, nowSec)).toBe(false);
  });

  it("rejects non-numeric timestamp", () => {
    const header = `t=abc,v1=${"0".repeat(64)}`;
    expect(verifyStripeSignature(body, header, secret, 300, nowSec)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Resend / Svix
// ─────────────────────────────────────────────────────────────────────────────

describe("verifyResendSignature", () => {
  // Svix secrets are `whsec_<base64>`. The base64 decodes to the raw HMAC key.
  // Build a test secret: raw key = "the-raw-secret-bytes", base64-encode it.
  const rawKey = Buffer.from("the-raw-secret-bytes", "utf8");
  const secret = `whsec_${rawKey.toString("base64")}`;

  const svixId = "msg_abc123";
  const svixTimestamp = "1700000000";
  const nowSec = 1_700_000_000;
  const body = '{"type":"email.delivered","data":{"to":"user@example.com"}}';

  function sign(id: string, ts: string, payload: string, key: Buffer): string {
    const signedPayload = `${id}.${ts}.${payload}`;
    return createHmac("sha256", key).update(signedPayload).digest("base64");
  }

  it("verifies a canonical Svix signature", () => {
    const sig = sign(svixId, svixTimestamp, body, rawKey);
    const header = `v1,${sig}`;
    expect(
      verifyResendSignature(svixId, svixTimestamp, header, body, secret, 300, nowSec),
    ).toBe(true);
  });

  it("verifies when header contains multiple space-separated v1 signatures", () => {
    const sig = sign(svixId, svixTimestamp, body, rawKey);
    const header = `v1,${"A".repeat(44)} v1,${sig} v2,unknown`;
    expect(
      verifyResendSignature(svixId, svixTimestamp, header, body, secret, 300, nowSec),
    ).toBe(true);
  });

  it("accepts a secret without the whsec_ prefix", () => {
    const bareSecret = rawKey.toString("base64");
    const sig = sign(svixId, svixTimestamp, body, rawKey);
    const header = `v1,${sig}`;
    expect(
      verifyResendSignature(svixId, svixTimestamp, header, body, bareSecret, 300, nowSec),
    ).toBe(true);
  });

  it("rejects when timestamp older than tolerance", () => {
    const oldTs = String(nowSec - 1000);
    const sig = sign(svixId, oldTs, body, rawKey);
    const header = `v1,${sig}`;
    expect(verifyResendSignature(svixId, oldTs, header, body, secret, 300, nowSec)).toBe(false);
  });

  it("rejects tampered body", () => {
    const sig = sign(svixId, svixTimestamp, body, rawKey);
    const header = `v1,${sig}`;
    expect(
      verifyResendSignature(svixId, svixTimestamp, header, "tampered", secret, 300, nowSec),
    ).toBe(false);
  });

  it("rejects when svix-id does not match the one that was signed", () => {
    const sig = sign(svixId, svixTimestamp, body, rawKey);
    const header = `v1,${sig}`;
    expect(
      verifyResendSignature("different-id", svixTimestamp, header, body, secret, 300, nowSec),
    ).toBe(false);
  });

  it("rejects signature with wrong version prefix", () => {
    const sig = sign(svixId, svixTimestamp, body, rawKey);
    const header = `v0,${sig}`;
    expect(
      verifyResendSignature(svixId, svixTimestamp, header, body, secret, 300, nowSec),
    ).toBe(false);
  });

  it("rejects malformed timestamp", () => {
    expect(
      verifyResendSignature(svixId, "not-a-number", "v1,sig", body, secret, 300, nowSec),
    ).toBe(false);
  });

  it("rejects missing svix-id / timestamp / signature headers", () => {
    expect(verifyResendSignature(null, svixTimestamp, "v1,x", body, secret)).toBe(false);
    expect(verifyResendSignature(svixId, null, "v1,x", body, secret)).toBe(false);
    expect(verifyResendSignature(svixId, svixTimestamp, null, body, secret)).toBe(false);
  });

  it("rejects empty secret", () => {
    expect(verifyResendSignature(svixId, svixTimestamp, "v1,x", body, "")).toBe(false);
  });

  it("rejects whsec_ with empty base64 payload", () => {
    expect(verifyResendSignature(svixId, svixTimestamp, "v1,x", body, "whsec_")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider dispatcher
// ─────────────────────────────────────────────────────────────────────────────

describe("verifyWebhookByProvider", () => {
  it("dispatches to twilio verifier", () => {
    const authToken = "tw-token";
    const url = "https://example.com/hook";
    const form = { A: "1", B: "2" };
    const data = url + "A1B2";
    const sig = createHmac("sha1", authToken).update(data).digest("base64");
    const headers = new Headers({ "x-twilio-signature": sig });
    expect(
      verifyWebhookByProvider("twilio", { rawBody: "", headers, url, form, secret: authToken }),
    ).toBe(true);
  });

  it("dispatches to stripe verifier", () => {
    const body = '{"id":"evt"}';
    const secret = "whsec_test";
    const ts = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
    const headers = new Headers({ "stripe-signature": `t=${ts},v1=${v1}` });
    expect(verifyWebhookByProvider("stripe", { rawBody: body, headers, secret })).toBe(true);
  });

  it("dispatches to resend verifier", () => {
    const rawKey = Buffer.from("resend-key", "utf8");
    const secret = `whsec_${rawKey.toString("base64")}`;
    const body = '{"type":"email.sent"}';
    const id = "msg_xyz";
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac("sha256", rawKey).update(`${id}.${ts}.${body}`).digest("base64");
    const headers = new Headers({
      "svix-id": id,
      "svix-timestamp": ts,
      "svix-signature": `v1,${sig}`,
    });
    expect(verifyWebhookByProvider("resend", { rawBody: body, headers, secret })).toBe(true);
  });

  it("falls back to generic HMAC-SHA256 for bandwidth/telnyx/generic via x-signature", () => {
    const body = "raw-payload";
    const secret = "bw-secret";
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    const headers = new Headers({ "x-signature": sig });
    expect(verifyWebhookByProvider("bandwidth", { rawBody: body, headers, secret })).toBe(true);
    expect(verifyWebhookByProvider("telnyx", { rawBody: body, headers, secret })).toBe(true);
    expect(verifyWebhookByProvider("generic", { rawBody: body, headers, secret })).toBe(true);
  });

  it("generic: accepts x-hub-signature-256 as an alternative header", () => {
    const body = "hub-payload";
    const secret = "hub-secret";
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    const headers = new Headers({ "x-hub-signature-256": sig });
    expect(verifyWebhookByProvider("generic", { rawBody: body, headers, secret })).toBe(true);
  });

  it("returns false for a cross-provider signature (twilio sig on stripe endpoint)", () => {
    const authToken = "tw-token";
    const url = "https://example.com/hook";
    const form = { A: "1" };
    const sig = createHmac("sha1", authToken).update(url + "A1").digest("base64");
    const headers = new Headers({ "x-twilio-signature": sig });
    // Dispatching as stripe should not succeed (different header, different scheme).
    expect(
      verifyWebhookByProvider("stripe", { rawBody: "{}", headers, url, form, secret: authToken }),
    ).toBe(false);
  });
});
