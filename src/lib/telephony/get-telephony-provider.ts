import type { TelephonyProvider } from "./types";

export function getTelephonyProvider(): TelephonyProvider {
  const raw = process.env.TELEPHONY_PROVIDER ?? "twilio";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "telnyx") return "telnyx";
  return "twilio";
}

