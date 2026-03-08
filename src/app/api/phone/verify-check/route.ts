/**
 * POST /api/phone/verify-check — Check SMS code and store verified number on workspace.
 * Payload: { phone_number: string (E.164), code: string }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

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

  let body: { phone_number?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const phone = body.phone_number?.trim() ? toE164(body.phone_number.trim()) : null;
  const code = body.code?.trim();
  if (!phone || !code) {
    return NextResponse.json({ error: "Phone number and code required" }, { status: 400 });
  }

  if (!VERIFY_SID || !ACCOUNT_SID || !AUTH_TOKEN) {
    return NextResponse.json(
      { error: "Phone verification not configured" },
      { status: 503 }
    );
  }

  const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`;
  const params = new URLSearchParams({ To: phone, Code: code });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as { status?: string; valid?: boolean; error_message?: string };
    const valid = data.status === "approved" || data.valid === true;

    if (!valid) {
      return NextResponse.json(
        { verified: false, error: data.error_message ?? "Code didn't match. Try again or resend." },
        { status: 400 }
      );
    }

    const db = getDb();
    await db
      .from("workspaces")
      .update({ verified_phone: phone })
      .eq("id", session.workspaceId);

    return NextResponse.json({ verified: true });
  } catch (e) {
    console.error("[phone/verify-check]", e);
    return NextResponse.json({ error: "Verification check failed" }, { status: 503 });
  }
}
