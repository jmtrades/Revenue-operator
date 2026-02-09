/**
 * Webhook signature verification (HMAC-SHA256) with timestamp tolerance.
 * Replay protection via nonce storage.
 */

import { createHmac, timingSafeEqual } from "crypto";

const TOLERANCE_SEC = 300;
const REPLAY_WINDOW_SEC = 3600;

export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function isTimestampFresh(timestampMs: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const ts = Math.floor(timestampMs / 1000);
  return Math.abs(now - ts) <= TOLERANCE_SEC;
}

export function makeNonce(payload: string, timestamp: number): string {
  return createHmac("sha256", "nonce").update(`${payload}:${timestamp}`).digest("hex");
}
