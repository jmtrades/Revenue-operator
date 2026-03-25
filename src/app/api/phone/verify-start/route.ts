/**
 * POST /api/phone/verify-start — Send 6-digit SMS code via Telnyx or Twilio Verify.
 * Payload: { phone_number: string (E.164) }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getTelephonyProvider } from "@/lib/telephony/get-telephony-provider";
import { assertSameOrigin } from "@/lib/http/csrf";

function toE164(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

async function startTelnyxVerification(phone: string): Promise<{ sent: boolean; error?: string; status?: number }> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) {
    return { sent: false, error: "Phone verification is being set up. You can use 'Get a new AI number' instead.", status: 503 };
  }

  const telnyxVerifyProfileId = process.env.TELNYX_VERIFY_PROFILE_ID;
  try {
    const res = await fetch("https://api.telnyx.com/v2/verifications", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phone,
        type: "sms",
        ...(telnyxVerifyProfileId ? { verify_profile_id: telnyxVerifyProfileId } : {}),
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string; code?: string }> };
      const detail = data.errors?.[0]?.detail ?? "Failed to send code.";
      const code = data.errors?.[0]?.code ?? "";
      let message = detail;
      if (code === "40003" || detail.toLowerCase().includes("invalid")) {
        message = "Invalid phone number. Enter a valid number with country code (e.g., +1 555 000 0000).";
      } else if (code === "40009" || detail.toLowerCase().includes("rate") || detail.toLowerCase().includes("too many")) {
        message = "Too many attempts. Please wait a few minutes before trying again.";
      }
      return { sent: false, error: message, status: res.status >= 500 ? 503 : 400 };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: "Failed to send verification code", status: 503 };
  }
}

async function startTwilioVerification(phone: string): Promise<{ sent: boolean; error?: string; status?: number }> {
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!verifySid || !accountSid || !authToken) {
    return { sent: false, error: "Phone verification is being set up. You can use 'Get a new AI number' instead.", status: 503 };
  }

  const url = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`;
  const params = new URLSearchParams({ To: phone, Channel: "sms" });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as { status?: string; error_message?: string; code?: number } & Record<string, unknown>;
    if (!res.ok) {
      const code = data.code as number | undefined;
      let message = (data.error_message as string) ?? "Failed to send code.";
      if (code === 60200 || (typeof message === "string" && message.toLowerCase().includes("invalid"))) {
        message = "Invalid phone number. Enter a valid number with country code (e.g., +1 555 000 0000).";
      } else if (code === 20429 || (typeof message === "string" && (message.toLowerCase().includes("rate") || message.toLowerCase().includes("too many")))) {
        message = "Too many attempts. Please wait a few minutes before trying again.";
      }
      return { sent: false, error: message, status: res.status >= 500 ? 503 : 400 };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: "Failed to send verification code", status: 503 };
  }
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phone_number?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const raw = body.phone_number?.trim();
  const phone = raw ? toE164(raw) : null;
  if (!phone) {
    return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
  }

  const provider = getTelephonyProvider();
  const result = provider === "telnyx"
    ? await startTelnyxVerification(phone)
    : await startTwilioVerification(phone);

  if (!result.sent) {
    return NextResponse.json(
      { error: result.error, ...(result.error?.includes("Get a new AI number") ? { action: "redirect" } : {}) },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json({ sent: true });
}
