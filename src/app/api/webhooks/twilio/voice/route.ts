/**
 * Twilio voice webhook: inbound call to a Recall Touch number.
 * Returns TwiML. When VAPI_ASSISTANT_URL is set, dials to Vapi; otherwise says a short message.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  let form: Record<string, string>;
  try {
    const text = await req.text();
    form = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }
  const from = form.From ?? form.Caller;
  const to = form.To ?? form.Called;
  const callSid = form.CallSid;

  const db = getDb();
  const { data: phoneConfig } = await db
    .from("phone_configs")
    .select("workspace_id, proxy_number")
    .or(`proxy_number.eq.${to?.replace(/\s/g, "")},proxy_number.eq.${to}`)
    .eq("status", "active")
    .maybeSingle();

  const workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id ?? null;
  if (workspaceId && callSid) {
    try {
      const { data: existing } = await db.from("call_sessions").select("id").eq("workspace_id", workspaceId).eq("external_meeting_id", callSid).maybeSingle();
      if (!existing) {
        let leadId: string | null = null;
        const phone = (from ?? "").replace(/\D/g, "");
        if (phone.length >= 10) {
          const { data: lead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).or(`phone.eq.${from},phone.eq.${phone}`).limit(1).maybeSingle();
          leadId = (lead as { id: string } | null)?.id ?? null;
          if (!leadId) {
            const { data: created } = await db.from("leads").insert({ workspace_id: workspaceId, name: "Inbound caller", phone: from ?? undefined, state: "NEW" }).select("id").single();
            leadId = (created as { id: string })?.id;
          }
        }
        await db.from("call_sessions").insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          external_meeting_id: callSid,
          provider: "twilio",
          call_started_at: new Date().toISOString(),
        });
      }
    } catch {
      // continue to return TwiML
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thanks for calling. Our AI assistant is connecting. Please hold.</Say><Pause length="2"/><Say voice="alice">If you need to speak to someone, please leave your name and number after the beep.</Say><Record maxLength="90" transcribe="true"/></Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
