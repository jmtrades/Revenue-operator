/**
 * Twilio voice webhook: inbound call to a Recall Touch number.
 * Hands off to self-hosted Recall voice server for AI conversation.
 * Falls back to ElevenLabs if VOICE_PROVIDER=elevenlabs, or Say+Record if all fail.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { handleInboundCall } from "@/lib/voice/call-flow";
import crypto from "crypto";

const FALLBACK_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thanks for calling. Please hold while we connect you.</Say><Pause length="2"/><Say voice="alice">If you need to speak to someone, please leave your name and number after the beep.</Say><Record maxLength="90" transcribe="true"/></Response>`;

function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;

  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const data = url + sorted;
  const expected = crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  let form: Record<string, string>;
  try {
    const text = await req.text();
    const entries = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
    form = entries;

    const sig = req.headers.get("x-twilio-signature");
    const hasToken = Boolean(process.env.TWILIO_AUTH_TOKEN);
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice`;

    if (process.env.NODE_ENV === "production") {
      // In production we require both a token and a valid signature.
      if (!hasToken || !sig || !verifyTwilioSignature(url, entries, sig)) {
        return new NextResponse("Invalid signature", { status: 401 });
      }
    } else if (sig && hasToken) {
      // In non-production, verify when signature is present but don't require it
      if (!verifyTwilioSignature(url, entries, sig)) {
        return new NextResponse("Invalid signature", { status: 403 });
      }
    }
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
    .or(`proxy_number.eq.${to?.replace(/[\s()-]/g, "")},proxy_number.eq.${to},proxy_number.eq.+${to?.replace(/\D/g, "")}`)
    .eq("status", "active")
    .maybeSingle();

  const workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id ?? null;

  // Reject calls to unmapped numbers — no workspace means we can't serve this caller
  if (!workspaceId) {
    console.error(`[twilio-voice] No workspace found for number: ${to}`);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">We're sorry, this number is not currently in service. Please check the number and try again.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }

  let callSessionId: string | null = null;

  if (callSid) {
    try {
      const { data: existing } = await db.from("call_sessions").select("id").eq("workspace_id", workspaceId).eq("external_meeting_id", callSid).maybeSingle();
      if (!existing) {
        let leadId: string | null = null;
        const phone = (from ?? "").replace(/\D/g, "");
        if (phone.length >= 10) {
          const { data: lead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).or(`phone.eq.${from},phone.eq.${phone}`).limit(1).maybeSingle();
          leadId = (lead as { id: string } | null)?.id ?? null;
          if (!leadId) {
            const { data: created } = await db.from("leads").insert({ workspace_id: workspaceId, name: "Inbound caller", phone: from ?? undefined, state: "NEW" }).select("id").maybeSingle();
            leadId = (created as { id: string })?.id;
          }
        }
        const { data: inserted } = await db.from("call_sessions").insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          external_meeting_id: callSid,
          provider: "twilio",
          call_started_at: new Date().toISOString(),
        }).select("id").maybeSingle();
        if (inserted) callSessionId = (inserted as { id: string }).id;
      } else {
        callSessionId = (existing as { id: string }).id;
      }
    } catch (sessionErr) {
      console.error("[twilio-voice] Call session creation failed:", sessionErr instanceof Error ? sessionErr.message : sessionErr);
    }
  }

  if (workspaceId && callSessionId && from) {
    try {
      // Use the centralized call-flow module to handle voice setup and TwiML generation
      const twiml = await handleInboundCall({
        workspaceId,
        callSid,
        callerPhone: from,
      });
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    } catch (callErr) {
      console.error("[twilio-voice] Voice AI handoff failed, falling back to TwiML:", callErr instanceof Error ? callErr.message : callErr);
    }
  }

  return new NextResponse(FALLBACK_TWIML, {
    headers: { "Content-Type": "text/xml" },
  });
}
