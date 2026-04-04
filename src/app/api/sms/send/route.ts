/**
 * POST /api/sms/send — Send SMS via Telnyx or Twilio (requires session).
 * Body: { to: string, body: string, leadId?: string }. Stores in messages when leadId provided.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { parseBody, phoneSchema } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTelephonyProvider } from "@/lib/telephony/get-telephony-provider";
import { getTelephonyService } from "@/lib/telephony";
import { sendSms as sendSmsTelnyx } from "@/lib/telephony/telnyx-sms";
import { log } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

const sendSmsSchema = z.object({
  to: phoneSchema,
  body: z.string().min(1, "Message body required").max(1600),
  leadId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

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

  const parsed = await parseBody(req, sendSmsSchema);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const to = body.to.replace(/\D/g, "").trim();
  const text = body.body.trim();
  const leadId = body.leadId ?? null;
  const provider = getTelephonyProvider();

  // SAFETY: Check opt-out if we have a lead reference
  if (leadId) {
    try {
      const { isOptedOut } = await import("@/lib/lead-opt-out");
      if (await isOptedOut(session.workspaceId, `lead:${leadId}`)) {
        return NextResponse.json({ error: "Lead has opted out of communications" }, { status: 403 });
      }
    } catch {
      // opt-out table may not exist — proceed
    }
  }

  try {
    let result: { messageId?: string; sid?: string; error?: string };

    if (provider === "telnyx") {
      const fromNumber = process.env.TELNYX_PHONE_NUMBER;
      if (!fromNumber) {
        return NextResponse.json({ error: "Telnyx SMS not configured" }, { status: 503 });
      }

      const toAddr = `+${to.length === 10 ? "1" : ""}${to}`;
      const fromAddr = fromNumber.startsWith("+") ? fromNumber : `+${fromNumber.replace(/\D/g, "")}`;

      const smsResult = await sendSmsTelnyx({
        from: fromAddr,
        to: toAddr,
        text: text.slice(0, 1600),
        messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID,
      });

      result = "error" in smsResult
        ? { error: smsResult.error }
        : { messageId: smsResult.messageId, sid: smsResult.messageId };
    } else {
      // Legacy Twilio fallback via unified telephony service.
      const telephony = getTelephonyService();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_MESSAGING_SERVICE_SID;
      if (!fromNumber) {
        return NextResponse.json({ error: "SMS not configured" }, { status: 503 });
      }

            const fromAddr = fromNumber.startsWith("+") ? fromNumber : "+" + fromNumber.replace(/\D/g, "");
      const toAddr = "+" + (to.length === 10 ? "1" : "") + to;

      const smsResult = await telephony.sendSms({
        from: fromAddr,
        to: toAddr,
        text: text.slice(0, 1600),
      });

      result =
        "error" in smsResult
          ? { error: smsResult.error }
          : { messageId: smsResult.messageId, sid: smsResult.messageId };
    }

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const messageId = result.messageId || result.sid;
    if (leadId && session.workspaceId && messageId) {
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
      } catch (storeErr) {
        log("error", "[sms/send] Failed to persist SMS record", { error: storeErr instanceof Error ? storeErr.message : String(storeErr), leadId, workspaceId: session.workspaceId });
      }
    }

    return NextResponse.json({ ok: true, sid: messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
