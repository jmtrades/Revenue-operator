/**
 * POST /api/sms/send — Send SMS via Twilio (requires session).
 * Body: { to: string, body: string, leadId?: string }. Stores in messages when leadId provided.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { parseBody, phoneSchema } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const sendSmsSchema = z.object({
  to: phoneSchema,
  body: z.string().min(1, "Message body required").max(1600),
  leadId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const rl = await checkRateLimit(`sms:${session.workspaceId}`, 100, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: "SMS not configured" }, { status: 503 });
  }

  const parsed = await parseBody(req, sendSmsSchema);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const to = body.to.replace(/\D/g, "").trim();
  const text = body.body.trim();
  const leadId = body.leadId ?? null;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.set("To", `+${to.length === 10 ? "1" : ""}${to}`);
  params.set("From", fromNumber);
  params.set("Body", text.slice(0, 1600));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
      body: params.toString(),
    });

    const data = (await res.json()) as { sid?: string; error_message?: string; code?: number };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error_message ?? "Twilio error", code: data.code },
        { status: 502 }
      );
    }

    if (leadId && session.workspaceId && data.sid) {
      try {
        const db = getDb();
        await db.from("messages").insert({
          workspace_id: session.workspaceId,
          lead_id: leadId,
          direction: "outbound",
          channel: "sms",
          content: text,
          status: "sent",
          trigger: "manual",
        });
      } catch {
        // ignore store failure
      }
    }

    return NextResponse.json({ ok: true, sid: data.sid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
