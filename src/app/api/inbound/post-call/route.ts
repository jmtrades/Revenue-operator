/**
 * POST /api/inbound/post-call — Post-call processing: store transcript/summary, ensure lead exists, optional SMS.
 * Call after Twilio recording/transcription or when Vapi sends call ended webhook.
 * When send_confirmation_sms is true, enqueues SendReminder so worker sends SMS (no direct send).
 * Detects emergency keywords in transcript and records urgency in call_analysis for activity feed.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueueAction } from "@/lib/action-queue";
import type { ActionCommand } from "@/lib/action-queue/types";

const EMERGENCY_KEYWORDS = /\b(emergency|urgent|burst|leak|flood|flooding|flooded|fire|break-in|break in|broken in|no heat|no a\/c|no ac|out of power|power out|flooding|flooded)\b/i;

export async function POST(req: NextRequest) {
  let body: {
    workspace_id?: string;
    call_sid?: string;
    call_session_id?: string;
    recording_url?: string;
    transcript?: string;
    summary?: string;
    caller_phone?: string;
    duration_seconds?: number;
    send_confirmation_sms?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { workspace_id, call_sid, call_session_id, recording_url, transcript, summary, send_confirmation_sms } = body;
  if (!workspace_id) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspace_id).maybeSingle();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  let sessionId = call_session_id ?? null;
  let leadId: string | null = null;
  if (!sessionId && call_sid) {
    const { data: sess } = await db.from("call_sessions").select("id, lead_id").eq("workspace_id", workspace_id).eq("external_meeting_id", call_sid).maybeSingle();
    if (sess) {
      sessionId = (sess as { id: string }).id;
      leadId = (sess as { lead_id?: string | null }).lead_id ?? null;
    }
  } else if (sessionId) {
    const { data: sess } = await db.from("call_sessions").select("lead_id").eq("id", sessionId).single();
    leadId = (sess as { lead_id?: string | null } | null)?.lead_id ?? null;
  }

  const updates: Record<string, unknown> = {
    call_ended_at: new Date().toISOString(),
    transcript_text: transcript || null,
  };
  if (recording_url) (updates as Record<string, string>).recording_url = recording_url;
  if (summary != null && String(summary).trim()) (updates as Record<string, string>).summary = String(summary).trim();

  if (sessionId) {
    await db.from("call_sessions").update(updates).eq("id", sessionId);
  }

  const isEmergency = transcript && EMERGENCY_KEYWORDS.test(transcript);
  if (sessionId && isEmergency) {
    try {
      await db.from("call_analysis").insert({
        workspace_id,
        call_session_id: sessionId,
        analysis_json: { outcome: "urgent" },
        confidence: 1,
        analysis_source: "post_call_keywords",
      });
    } catch {
      // non-blocking
    }
  }

  if (send_confirmation_sms && leadId) {
    const { data: conv } = await db.from("conversations").select("id").eq("lead_id", leadId).eq("channel", "sms").limit(1).maybeSingle();
    const conversationId = (conv as { id: string } | null)?.id;
    if (conversationId) {
      const cmd: ActionCommand = {
        type: "SendReminder",
        workspace_id,
        lead_id: leadId,
        payload: { conversation_id: conversationId, channel: "sms", content: "Thanks for your call. We'll follow up if needed." },
        dedup_key: `post-call-confirm-${sessionId ?? call_sid ?? "unknown"}`,
      };
      await enqueueAction(cmd).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, call_session_id: sessionId });
}
