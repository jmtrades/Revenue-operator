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
