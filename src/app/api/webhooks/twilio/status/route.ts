import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordDeliveryReceipt } from "@/lib/delivery/provider";
import { markAttemptDelivered } from "@/lib/delivery-assurance/action-attempts";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const messageSid = form.get("MessageSid") as string | null;
  const messageStatus = form.get("MessageStatus") as string | null;

  if (!messageSid) return new NextResponse("Missing MessageSid", { status: 400 });

  if (messageStatus === "delivered") {
    await recordDeliveryReceipt(messageSid);
    await markAttemptDelivered(messageSid);
  }

  const failedMessageStatuses = new Set([
    "failed",
    "undelivered",
    "delivery_failed",
  ]);
  if (messageSid && messageStatus && failedMessageStatuses.has(messageStatus.toLowerCase())) {
    const { data: attempt } = await supabase
      .from("action_attempts")
      .select("action_command_id")
      .eq("provider_message_id", messageSid)
      .maybeSingle();
    const actionCommandId = (attempt as { action_command_id?: string | null } | null)?.action_command_id ?? null;
    if (actionCommandId) {
      const { data: cmd } = await supabase
        .from("action_commands")
        .select("workspace_id, lead_id")
        .eq("id", actionCommandId)
        .maybeSingle();
      const workspaceId = (cmd as { workspace_id?: string | null } | null)?.workspace_id ?? null;
      const leadId = (cmd as { lead_id?: string | null } | null)?.lead_id ?? null;
      if (workspaceId && leadId) {
        const { data: lead } = await supabase
          .from("leads")
          .select("metadata")
          .eq("workspace_id", workspaceId)
          .eq("id", leadId)
          .maybeSingle();
        const metadata = ((lead as { metadata?: Record<string, unknown> | null } | null)?.metadata ?? {}) as Record<
          string,
          unknown
        >;
        await supabase
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

  const callSid = form.get("CallSid") as string | null;
  const callStatus = (form.get("CallStatus") as string | null) ?? undefined;
  const callDuration = form.get("CallDuration") as string | null;

  if (callSid) {
    await supabase
      .from("call_sessions")
      .update({
        status: callStatus === "completed" ? "completed" : callStatus,
        duration_seconds: callDuration ? parseInt(callDuration, 10) : undefined,
        call_ended_at: new Date().toISOString(),
      })
      .eq("external_meeting_id", callSid);
  }

  return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
