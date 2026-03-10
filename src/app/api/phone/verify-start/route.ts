/**
 * POST /api/phone/verify-start — Send 6-digit SMS code via Twilio Verify.
 * Payload: { phone_number: string (E.164) }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

function toE164(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export async function POST(req: NextRequest) {
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

  if (!VERIFY_SID || !ACCOUNT_SID || !AUTH_TOKEN) {
    return NextResponse.json(
      { error: "Phone verification is being set up. You can use 'Get a new AI number' instead.", action: "redirect" },
      { status: 503 }
    );
  }

  const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`;
  const params = new URLSearchParams({ To: phone, Channel: "sms" });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64"),
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
      } else if (code === 20429 || (typeof message === "string" && message.toLowerCase().includes("rate") || message.toLowerCase().includes("too many"))) {
        message = "Too many attempts. Please wait a few minutes before trying again.";
      }
      return NextResponse.json(
        { error: message },
        { status: res.status >= 500 ? 503 : 400 }
      );
    }
    return NextResponse.json({ sent: true });
  } catch (e) {
    console.error("[phone/verify-start]", e);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 503 });
  }
}
