import type { TelephonyProvider } from "./types";

export function getTelephonyProvider(): TelephonyProvider {
  const raw = process.env.TELEPHONY_PROVIDER;
  if (raw) {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "telnyx") return "telnyx";
    if (normalized === "twilio") return "twilio";
  }
  // Auto-detect: prefer Telnyx if credentials are present
  if (process.env.TELNYX_API_KEY) return "telnyx";
  if (process.env.TWILIO_ACCOUNT_SID) return "twilio";
  return "telnyx";
}

