/**
 * Twilio voice webhook: inbound call routed to Pipecat.
 *
 * This intentionally mirrors the existing `/api/webhooks/twilio/voice` behavior:
 * - Creates `call_sessions` for the workspace
 * - Creates/links a `leads` row when possible
 * - Returns TwiML that streams audio into the voice provider orchestration layer
 *
 * The orchestration layer is selected via `getVoiceProvider()` using `VOICE_PROVIDER`.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db/queries";
import { handleInboundCall } from "@/lib/voice/call-flow";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";
import { normalizePhone } from "@/lib/security/phone";

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
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let form: Record<string, string>;
  try {
    const text = await req.text();
    const entries = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
    form = entries;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const sig = req.headers.get("x-twilio-signature");
  const hasToken = Boolean(process.env.TWILIO_AUTH_TOKEN);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/voice/connect`;

  if (process.env.NODE_ENV === "production") {
    if (!hasToken || !sig || !verifyTwilioSignature(url, form, sig)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } else if (sig && hasToken) {
    if (!verifyTwilioSignature(url, form, sig)) {
      return new NextResponse("Invalid signature", { status: 403 });
    }
  }

  const from = form.From ?? form.Caller;
  const to = form.To ?? form.Called;
  const callSid = form.CallSid;

  // Phase 78/Phase 3 (D7): strictly normalize before any `.or(...)`
  // interpolation. Twilio webhook body is attacker-controllable absent a
  // verified signature, and the old multi-variant `.or(...)` above was the
  // exact injection sink the audit flagged.
  const toE164 = normalizePhone(to);
  const fromE164 = normalizePhone(from);

  const db = getDb();
  let phoneConfig:
    | { workspace_id?: string; proxy_number?: string }
    | null = null;
  if (toE164) {
    const toDigits = toE164.slice(1);
    const { data } = await db
      .from("phone_configs")
      .select("workspace_id, proxy_number")
      .or(`proxy_number.eq.${toE164},proxy_number.eq.${toDigits}`)
      .eq("status", "active")
      .maybeSingle();
    phoneConfig = (data as typeof phoneConfig) ?? null;
  }

  const workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id ?? null;
  let callSessionId: string | null = null;

  if (workspaceId && callSid) {
    try {
      const { data: existing } = await db
        .from("call_sessions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("external_meeting_id", callSid)
        .maybeSingle();

      if (!existing) {
        let leadId: string | null = null;

        if (fromE164) {
          const fromDigits = fromE164.slice(1);
          const { data: lead } = await db
            .from("leads")
            .select("id")
            .eq("workspace_id", workspaceId)
            .or(`phone.eq.${fromE164},phone.eq.${fromDigits}`)
            .limit(1)
            .maybeSingle();

          leadId = (lead as { id: string } | null)?.id ?? null;

          if (!leadId) {
            const { data: created } = await db
              .from("leads")
              .insert({ workspace_id: workspaceId, name: "Inbound caller", phone: fromE164, state: "NEW" })
              .select("id")
              .maybeSingle();
            leadId = (created as { id: string })?.id;
          }
        }

        const { data: inserted } = await db
          .from("call_sessions")
          .insert({
            workspace_id: workspaceId,
            lead_id: leadId,
            external_meeting_id: callSid,
            provider: "pipecat",
            call_started_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        if (inserted) callSessionId = (inserted as { id: string }).id;
      } else {
        callSessionId = (existing as { id: string }).id;
      }
    } catch (sessionErr) {
      log("error", "[twilio-pipecat-connect] Call session creation failed:", { error: sessionErr instanceof Error ? sessionErr.message : sessionErr });
    }
  }

  if (workspaceId && callSessionId && from) {
    try {
      const twiml = await handleInboundCall({
        workspaceId,
        callSid,
        callerPhone: from,
      });
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    } catch (callErr) {
      log("error", "[twilio-pipecat-connect] Voice AI handoff failed, falling back to TwiML:", { error: callErr instanceof Error ? callErr.message : callErr });
    }
  }

  return new NextResponse(FALLBACK_TWIML, { headers: { "Content-Type": "text/xml" } });
}

