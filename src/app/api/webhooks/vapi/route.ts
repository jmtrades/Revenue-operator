/**
 * Vapi webhook: call-started, end-of-call-report, tool-calls.
 * Creates/updates call_sessions; handles capture_lead, book_appointment, send_sms.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db/queries";
import { logAppointmentBooked } from "@/lib/log/revenue-events";

function verifyVapiSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

interface VapiWebhookPayload {
  message?: {
    type?: string;
    transcript?: string;
    summary?: string;
    recordingUrl?: string;
    call?: { id?: string; metadata?: Record<string, string>; customer?: { number?: string } };
    assistant?: { metadata?: Record<string, string> };
    toolCallList?: Array<{ id?: string; name?: string; parameters?: Record<string, unknown> }>;
  };
  call?: { id?: string; metadata?: Record<string, string> };
}

function getWorkspaceId(body: VapiWebhookPayload): string | null {
  const msg = body.message ?? body;
  const call = (msg as { call?: { metadata?: Record<string, string> } })?.call ?? body.call;
  const assistant = (msg as { assistant?: { metadata?: Record<string, string> } })?.assistant;
  return call?.metadata?.workspace_id ?? assistant?.metadata?.workspace_id ?? null;
}

function getCallId(body: VapiWebhookPayload): string | null {
  const msg = body.message ?? body;
  const call = (msg as { call?: { id?: string } })?.call ?? body.call;
  return call?.id ?? null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify webhook signature when VAPI_WEBHOOK_SECRET is configured
  const vapiSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (vapiSecret) {
    const signature = req.headers.get("x-vapi-signature");
    if (!verifyVapiSignature(rawBody, signature, vapiSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[vapi-webhook] VAPI_WEBHOOK_SECRET not configured — signature verification skipped");
  }

  let body: VapiWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? body) as Record<string, unknown> | undefined;
  const type = typeof message === "object" && message && "type" in message ? (message.type as string) : undefined;
  const call = (message?.call ?? body.call) as { id?: string; metadata?: Record<string, string>; customer?: { number?: string } } | undefined;
  const metadata = call?.metadata ?? {};
  const workspaceId = getWorkspaceId(body) ?? metadata.workspace_id ?? null;
  const vapiCallId = getCallId(body) ?? call?.id ?? null;

  const db = getDb();

  // Tool calls: capture_lead, book_appointment, send_sms
  if (type === "tool-calls" && workspaceId) {
    const toolCallList = (message?.toolCallList ?? message?.toolCallList) as Array<{ id?: string; name?: string; parameters?: Record<string, unknown> }> | undefined;
    const list = Array.isArray(toolCallList) ? toolCallList : [];
    const results: Array<{ name: string; toolCallId: string; result: string }> = [];
    const customerNumber = call?.customer?.number ?? null;

    for (const tool of list) {
      const toolId = tool.id ?? "";
      const name = (tool.name ?? "").trim();
      const params = (tool.parameters ?? {}) as Record<string, unknown>;

      try {
        if (name === "capture_lead") {
          const leadName = typeof params.name === "string" ? params.name.trim() : "Caller";
          const phone = (typeof params.phone === "string" ? params.phone.trim() : customerNumber) ?? undefined;
          const email = typeof params.email === "string" ? params.email.trim() : undefined;
          const { data: inserted } = await db
            .from("leads")
            .insert({
              workspace_id: workspaceId,
              name: leadName,
              ...(phone && { phone }),
              ...(email && { email }),
              state: "NEW",
            })
            .select("id")
            .single();
          const leadId = (inserted as { id: string } | null)?.id;
          if (vapiCallId) {
            const { data: sess } = await db.from("call_sessions").select("id").eq("workspace_id", workspaceId).eq("external_meeting_id", vapiCallId).maybeSingle();
            if (sess && leadId) {
              await db.from("call_sessions").update({ lead_id: leadId, updated_at: new Date().toISOString() }).eq("id", (sess as { id: string }).id);
            }
          }
          results.push({ name: "capture_lead", toolCallId: toolId, result: JSON.stringify({ ok: true, leadId }) });
        } else if (name === "book_appointment") {
          const apptName = typeof params.name === "string" ? params.name.trim() : "Caller";
          const dateStr = typeof params.date === "string" ? params.date : "";
          const timeStr = typeof params.time === "string" ? params.time : "09:00";
          const service = typeof params.service === "string" ? params.service.trim() : "Appointment";
          const notes = typeof params.notes === "string" ? params.notes.trim() : undefined;
          const startTime = `${dateStr}T${timeStr}:00`;
          const start = new Date(startTime);
          const end = new Date(start.getTime() + 30 * 60 * 1000);
          let leadId: string | null = null;
          const phone = (typeof params.phone === "string" ? params.phone.trim() : customerNumber) ?? undefined;
          if (phone) {
            const normalized = phone.replace(/\D/g, "");
            const { data: existing } = await db.from("leads").select("id").eq("workspace_id", workspaceId).or(`phone.eq.${phone},phone.eq.${normalized}`).limit(1).maybeSingle();
            leadId = (existing as { id: string } | null)?.id ?? null;
            if (!leadId) {
              const { data: created } = await db.from("leads").insert({ workspace_id: workspaceId, name: apptName, phone, state: "NEW" }).select("id").single();
              leadId = (created as { id: string })?.id ?? null;
            }
          }
          const apptPayload: Record<string, unknown> = {
            workspace_id: workspaceId,
            title: service,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            status: "confirmed",
          };
          if (leadId) apptPayload.lead_id = leadId;
          if (notes) apptPayload.notes = notes;
          const { data: appt } = await db.from("appointments").insert(apptPayload).select("id").single();
          const apptId = (appt as { id: string } | null)?.id;
          if (apptId) logAppointmentBooked(workspaceId, apptId, "voice");
          results.push({ name: "book_appointment", toolCallId: toolId, result: JSON.stringify({ ok: true, message: `Appointment booked for ${dateStr} at ${timeStr}` }) });
        } else if (name === "send_sms") {
          const to = typeof params.to === "string" ? params.to.replace(/\D/g, "") : "";
          const messageBody = typeof params.message === "string" ? params.message : "";
          if (to && messageBody && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
            const sid = process.env.TWILIO_ACCOUNT_SID;
            const auth = process.env.TWILIO_AUTH_TOKEN;
            const fromNum = process.env.TWILIO_PHONE_NUMBER;
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
            const params = new URLSearchParams();
            params.set("To", to.length >= 10 ? `+${to}` : to);
            params.set("From", fromNum);
            params.set("Body", messageBody.slice(0, 1600));
            await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: "Basic " + Buffer.from(`${sid}:${auth}`).toString("base64"),
              },
              body: params.toString(),
            });
          }
          try {
            await db.from("messages").insert({
              workspace_id: workspaceId,
              direction: "outbound",
              channel: "sms",
              content: messageBody,
              status: "delivered",
              sent_at: new Date().toISOString(),
            });
          } catch {
            // table may require lead_id; ignore
          }
          results.push({ name: "send_sms", toolCallId: toolId, result: JSON.stringify({ ok: true }) });
        } else {
          results.push({ name: name || "unknown", toolCallId: toolId, result: JSON.stringify({ ok: true }) });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        results.push({ name: name || "unknown", toolCallId: toolId, result: JSON.stringify({ error: err }) });
      }
    }

    return NextResponse.json({ results });
  }

  if (type === "call-started" && workspaceId && vapiCallId) {
    try {
      const { data: existing } = await db
        .from("call_sessions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("external_meeting_id", vapiCallId)
        .maybeSingle();
      if (!existing) {
        await db.from("call_sessions").insert({
          workspace_id: workspaceId,
          external_meeting_id: vapiCallId,
          provider: "vapi",
          call_started_at: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }
    return NextResponse.json({ received: true });
  }

  if (type !== "end-of-call-report") {
    return NextResponse.json({ received: true });
  }

  const msg = message as Record<string, unknown>;
  const transcript = typeof msg?.transcript === "string" ? msg.transcript : undefined;
  const summary = typeof msg?.summary === "string" ? msg.summary : undefined;
  const recordingUrl = typeof msg?.recordingUrl === "string" ? msg.recordingUrl : undefined;
  const endedReason = typeof msg?.endedReason === "string" ? msg.endedReason : (body as { endedReason?: string })?.endedReason;
  let callSessionId: string | null = metadata.call_session_id?.trim() ?? null;

  if (!callSessionId && workspaceId && vapiCallId) {
    const { data: row } = await db
      .from("call_sessions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("external_meeting_id", vapiCallId)
      .maybeSingle();
    callSessionId = (row as { id: string } | null)?.id ?? null;
  }

  if (!callSessionId || !workspaceId) {
    return NextResponse.json({ received: true, skipped: "no session id" });
  }

  const outcomeMap: Record<string, string> = {
    voicemail: "voicemail",
    no_answer: "no_answer",
    busy: "busy",
    failed: "failed",
    canceled: "canceled",
    completed: "completed",
  };
  const outcome = endedReason && outcomeMap[endedReason] ? outcomeMap[endedReason] : null;

  const updates: Record<string, unknown> = {
    call_ended_at: new Date().toISOString(),
    transcript_text: transcript && String(transcript).trim() ? String(transcript).trim() : null,
    summary: summary && String(summary).trim() ? String(summary).trim() : null,
  };
  if (recordingUrl) (updates as Record<string, string>).recording_url = String(recordingUrl);
  if (outcome) (updates as Record<string, string>).outcome = outcome;

  try {
    const { error } = await db
      .from("call_sessions")
      .update(updates)
      .eq("id", callSessionId)
      .eq("workspace_id", workspaceId);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  fetch(`${base}/api/inbound/post-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      call_session_id: callSessionId,
      transcript: updates.transcript_text ?? undefined,
      summary: updates.summary ?? undefined,
      recording_url: updates.recording_url ?? undefined,
      caller_phone: call?.customer?.number ?? undefined,
      send_confirmation_sms: true,
    }),
  }).catch((err) => {
    console.error("[vapi-webhook] post-call processing failed:", err instanceof Error ? err.message : err);
  });

  return NextResponse.json({ received: true, updated: callSessionId });
}
