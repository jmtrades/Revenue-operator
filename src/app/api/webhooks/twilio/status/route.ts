import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { recordDeliveryReceipt } from "@/lib/delivery/provider";
import { markAttemptDelivered } from "@/lib/delivery-assurance/action-attempts";
import { log } from "@/lib/logger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const data = url + sorted;
  const expected = crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {

  try {
  // Read body as text first for signature verification
  const bodyText = await request.text();
  const formParams = Object.fromEntries(new URLSearchParams(bodyText)) as Record<string, string>;

  // Verify Twilio signature in production
  const sig = request.headers.get("x-twilio-signature");
  const hasToken = Boolean(process.env.TWILIO_AUTH_TOKEN);
  if (hasToken && process.env.NODE_ENV === "production") {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`;
    if (!sig || !verifyTwilioSignature(url, formParams, sig)) {
      console.warn("[twilio-status] Invalid signature — rejecting request");
      return new NextResponse("Unauthorized", { status: 401, headers: { "Content-Type": "text/plain" } });
    }
  }

  const messageSid = formParams.MessageSid ?? null;
  const messageStatus = formParams.MessageStatus ?? null;
  const callSid = formParams.CallSid ?? null;

  // This endpoint handles both SMS delivery receipts (MessageSid) and call status events (CallSid).
  // If neither is present, reject the request.
  if (!messageSid && !callSid) return new NextResponse("Missing MessageSid or CallSid", { status: 400 });

  if (messageStatus === "delivered") {
    await recordDeliveryReceipt(messageSid);
    await markAttemptDelivered(messageSid);
  }

  const failedMessageStatuses = new Set([
    "failed",
    "undelivered",
    "delivery_failed",
  ]);
  const db = getDb();
  if (messageSid && messageStatus && failedMessageStatuses.has(messageStatus.toLowerCase())) {
    const { data: attempt } = await db
      .from("action_attempts")
      .select("action_command_id")
      .eq("provider_message_id", messageSid)
      .maybeSingle();
    const actionCommandId = (attempt as { action_command_id?: string | null } | null)?.action_command_id ?? null;
    if (actionCommandId) {
      const { data: cmd } = await db
        .from("action_commands")
        .select("workspace_id, lead_id")
        .eq("id", actionCommandId)
        .maybeSingle();
      const workspaceId = (cmd as { workspace_id?: string | null } | null)?.workspace_id ?? null;
      const leadId = (cmd as { lead_id?: string | null } | null)?.lead_id ?? null;
      if (workspaceId && leadId) {
        const { data: lead } = await db
          .from("leads")
          .select("metadata")
          .eq("workspace_id", workspaceId)
          .eq("id", leadId)
          .maybeSingle();
        const metadata = ((lead as { metadata?: Record<string, unknown> | null } | null)?.metadata ?? {}) as Record<
          string,
          unknown
        >;
        await db
          .from("leads")
          .update({
            metadata: {
              ...metadata,
              sms_undeliverable: true,
              sms_undeliverable_at: new Date().toISOString(),
              sms_last_failure_status: messageStatus,
              sms_last_failure_message_sid: messageSid,
            },
          })
          .eq("workspace_id", workspaceId)
          .eq("id", leadId);
      }
    }
  }

  // callSid already declared above
  const callStatus = formParams.CallStatus ?? undefined;
  const callDuration = formParams.CallDuration ?? null;

  if (callSid) {
    // Look up the specific call session to ensure workspace isolation
    const { data: existingSession } = await db
      .from("call_sessions")
      .select("id, workspace_id")
      .eq("external_meeting_id", callSid)
      .maybeSingle();

    if (existingSession) {
      await db
        .from("call_sessions")
        .update({
          status: callStatus === "completed" ? "completed" : callStatus,
          duration_seconds: callDuration ? parseInt(callDuration, 10) : undefined,
          call_ended_at: new Date().toISOString(),
        })
        .eq("id", (existingSession as { id: string }).id);
    }
  }

  return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (err) {
    log("error", "[twilio-status]", { error: err instanceof Error ? err.message : String(err) });
    return new NextResponse("Error", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}
