/**
 * POST /api/phone/verify-check — Check SMS code and store verified number on workspace.
 * Payload: { phone_number: string (E.164), code: string }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getTelephonyProvider } from "@/lib/telephony/get-telephony-provider";

function toE164(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

async function checkTelnyxVerification(phone: string, code: string): Promise<{ verified: boolean; error?: string; status?: number }> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) {
    return { verified: false, error: "Phone verification is being set up. You can use 'Get a new AI number' instead.", status: 503 };
  }

  try {
    const res = await fetch("https://api.telnyx.com/v2/verifications/by_phone_number", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phone,
        code,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { data?: { response_code?: string }; errors?: Array<{ detail?: string }> };

    if (!res.ok || data.data?.response_code !== "accepted") {
      const errorMsg = data.errors?.[0]?.detail ?? "Code didn't match. Try again or resend.";
      return { verified: false, error: errorMsg, status: 400 };
    }

    return { verified: true };
  } catch {
    return { verified: false, error: "Verification check failed", status: 503 };
  }
}

async function checkTwilioVerification(phone: string, code: string): Promise<{ verified: boolean; error?: string; status?: number }> {
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!verifySid || !accountSid || !authToken) {
    return { verified: false, error: "Phone verification is being set up. You can use 'Get a new AI number' instead.", status: 503 };
  }

  const url = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`;
  const params = new URLSearchParams({ To: phone, Code: code });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as { status?: string; valid?: boolean; error_message?: string };
    const valid = data.status === "approved" || data.valid === true;

    if (!valid) {
      return { verified: false, error: data.error_message ?? "Code didn't match. Try again or resend.", status: 400 };
    }
    return { verified: true };
  } catch {
    return { verified: false, error: "Verification check failed", status: 503 };
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

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

  const provider = getTelephonyProvider();
  const result = provider === "telnyx"
    ? await checkTelnyxVerification(phone, code)
    : await checkTwilioVerification(phone, code);

  if (!result.verified) {
    return NextResponse.json(
      { verified: false, error: result.error, ...(result.error?.includes("Get a new AI number") ? { action: "redirect" } : {}) },
      { status: result.status ?? 400 }
    );
  }

  const db = getDb();
  await db
    .from("workspaces")
    .update({ verified_phone: phone })
    .eq("id", session.workspaceId);

  // Also set as primary workspace number in phone_configs so it appears in Settings > Phone
  // and can be used for call forwarding, outbound caller ID, etc.
  const { data: existingConfig } = await db
    .from("phone_configs")
    .select("id, proxy_number")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  const cfg = existingConfig as { proxy_number?: string | null } | null;
  if (!cfg?.proxy_number) {
    // No existing primary number — set the verified personal number as primary
    await db.from("phone_configs").upsert(
      {
        workspace_id: session.workspaceId,
        mode: "proxy",
        proxy_number: phone,
        forwarding_number: phone,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );
  }

  return NextResponse.json({ verified: true, phone_number: phone });
}
