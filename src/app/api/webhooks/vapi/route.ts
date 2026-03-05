/**
 * Vapi webhook: call-started, end-of-call-report.
 * Creates call_sessions on call start (when workspace_id + call.id); updates on end.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

interface VapiWebhookPayload {
  message?: { type?: string; transcript?: string; summary?: string; recordingUrl?: string; call?: { id?: string; metadata?: Record<string, string> } };
  call?: { id?: string; metadata?: Record<string, string> };
}

export async function POST(req: NextRequest) {
  let body: VapiWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? body) as Record<string, unknown> | undefined;
  const type = typeof message === "object" && message && "type" in message ? (message.type as string) : undefined;
  const call = (message?.call ?? body.call) as { id?: string; metadata?: Record<string, string> } | undefined;
  const metadata = call?.metadata ?? {};
  const workspaceId = metadata.workspace_id ?? null;
  const vapiCallId = call?.id ?? null;

  const db = getDb();

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

  const updates: Record<string, unknown> = {
    call_ended_at: new Date().toISOString(),
    transcript_text: transcript && String(transcript).trim() ? String(transcript).trim() : null,
    summary: summary && String(summary).trim() ? String(summary).trim() : null,
  };
  if (recordingUrl) (updates as Record<string, string>).recording_url = String(recordingUrl);

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
    }),
  }).catch(() => {});

  return NextResponse.json({ received: true, updated: callSessionId });
}
