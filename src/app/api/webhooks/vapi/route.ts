/**
 * Vapi webhook: end-of-call-report and other events.
 * Updates call_sessions with transcript/summary and triggers post-call processing.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

interface VapiEndOfCallPayload {
  message?: {
    type?: string;
    transcript?: string;
    summary?: string;
    recordingUrl?: string;
    call?: {
      id?: string;
      endedReason?: string;
      metadata?: Record<string, string>;
    };
  };
  call?: {
    id?: string;
    metadata?: Record<string, string>;
  };
}

export async function POST(req: NextRequest) {
  let body: VapiEndOfCallPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? body) as Record<string, unknown> | undefined;
  const type = typeof message === "object" && message && "type" in message ? message.type : undefined;
  if (type !== "end-of-call-report") {
    return NextResponse.json({ received: true });
  }

  const msg = message as Record<string, unknown>;
  const transcript = typeof msg?.transcript === "string" ? msg.transcript : undefined;
  const summary = typeof msg?.summary === "string" ? msg.summary : undefined;
  const recordingUrl = typeof msg?.recordingUrl === "string" ? msg.recordingUrl : undefined;
  const call = (msg?.call as { metadata?: Record<string, string> }) ?? (body as { call?: { metadata?: Record<string, string> } }).call;
  const metadata = call?.metadata ?? {};

  const workspaceId = metadata.workspace_id ?? null;
  const callSessionId = metadata.call_session_id ?? null;

  if (!callSessionId || !workspaceId) {
    return NextResponse.json({ received: true, skipped: "no session id" });
  }

  const db = getDb();
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

  // Optional: trigger server-side post-call (GPT-4o enrichment, call_analysis). Do not await to keep webhook fast.
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
