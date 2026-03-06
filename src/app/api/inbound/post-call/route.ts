/**
 * POST /api/inbound/post-call — Post-call processing: store transcript/summary, ensure lead exists, optional SMS.
 * Call after Twilio recording/transcription or when Vapi sends call ended webhook.
 * When transcript is present and summary missing, runs GPT-4o analysis (summary + outcome) and writes to call_analysis.
 * When send_confirmation_sms is true, enqueues SendReminder so worker sends SMS (no direct send).
 * Detects emergency keywords in transcript and records urgency in call_analysis for activity feed.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueueAction } from "@/lib/action-queue";
import type { ActionCommand } from "@/lib/action-queue/types";
import { analyzeClosingCall } from "@/lib/zoom/analysis";
import { sendCallOutcomeEmail } from "@/lib/email/call-alert";

const EMERGENCY_KEYWORDS = /\b(emergency|urgent|burst|leak|flood|flooding|flooded|fire|break-in|break in|broken in|no heat|no a\/c|no ac|out of power|power out|flooding|flooded)\b/i;

function inferBusinessOutcome(text: string): "appointment_booked" | "lead_captured" | "transfer_requested" | "message_taken" | "info_provided" | "urgent" {
  const lower = text.toLowerCase();
  if (EMERGENCY_KEYWORDS.test(text)) return "urgent";
  if (/(booked|scheduled|appointment confirmed|see you on|calendar invite)/i.test(lower)) return "appointment_booked";
  if (/(transfer|forward|patch you through|connect you)/i.test(lower)) return "transfer_requested";
  if (/(leave a message|took a message|pass this along|callback message)/i.test(lower)) return "message_taken";
  if (/(name is|my number is|reach me at|call me back|email me at)/i.test(lower)) return "lead_captured";
  return "info_provided";
}

function inferSentiment(text: string): "positive" | "neutral" | "negative" {
  const lower = text.toLowerCase();
  if (/(angry|frustrated|upset|disappointed|terrible|awful|not happy)/i.test(lower)) return "negative";
  if (/(great|perfect|thank you|thanks so much|sounds good|appreciate it)/i.test(lower)) return "positive";
  return "neutral";
}

async function ensureLeadForCaller(input: {
  db: ReturnType<typeof getDb>;
  workspaceId: string;
  sessionId: string | null;
  callerPhone: string | null | undefined;
}): Promise<string | null> {
  const phone = input.callerPhone?.trim();
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, "");
  const { data: existing } = await input.db
    .from("leads")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .or(`phone.eq.${phone},phone.eq.${normalized}`)
    .limit(1)
    .maybeSingle();
  let leadId = (existing as { id: string } | null)?.id ?? null;

  if (!leadId) {
    const { data: created } = await input.db
      .from("leads")
      .insert({
        workspace_id: input.workspaceId,
        phone,
        name: "Inbound caller",
        state: "NEW",
      })
      .select("id")
      .single();
    leadId = (created as { id: string } | null)?.id ?? null;
  }

  if (leadId && input.sessionId) {
    await input.db
      .from("call_sessions")
      .update({ lead_id: leadId, updated_at: new Date().toISOString() })
      .eq("id", input.sessionId);
  }

  return leadId;
}

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
  const summaryTrim = summary != null && String(summary).trim() ? String(summary).trim() : null;
  if (summaryTrim) (updates as Record<string, string>).summary = summaryTrim;

  if (sessionId) {
    await db.from("call_sessions").update(updates).eq("id", sessionId);
  }

  const isEmergency = transcript && EMERGENCY_KEYWORDS.test(transcript);
  const transcriptText = transcript?.trim() ?? "";
  const summaryText = summaryTrim ?? "";
  const combinedText = `${summaryText}\n${transcriptText}`.trim();
  const businessOutcome = inferBusinessOutcome(combinedText);
  const sentiment = inferSentiment(combinedText);

  if (!leadId) {
    leadId = await ensureLeadForCaller({
      db,
      workspaceId: workspace_id,
      sessionId,
      callerPhone: body.caller_phone ?? null,
    });
  }

  if (sessionId && isEmergency) {
    try {
      await db.from("call_analysis").insert({
        workspace_id,
        call_session_id: sessionId,
        analysis_json: { outcome: "urgent", business_outcome: "urgent", sentiment: "negative" },
        confidence: 1,
        analysis_source: "post_call_keywords",
      });
    } catch {
      // non-blocking
    }
  }

  // GPT-4o post-call: when we have transcript and no summary (or short transcript), enrich with analysis
  if (sessionId && transcript && String(transcript).trim().length >= 50 && process.env.OPENAI_API_KEY) {
    try {
      let leadName: string | undefined;
      let company: string | undefined;
      if (leadId) {
        const { data: lead } = await db.from("leads").select("name, company").eq("id", leadId).maybeSingle();
        if (lead) {
          leadName = (lead as { name?: string }).name;
          company = (lead as { company?: string }).company;
        }
      }
      const analysis = await analyzeClosingCall(transcript, { leadName, company });
      const summaryFromAnalysis = analysis.summary && String(analysis.summary).trim() ? analysis.summary : null;
      if (summaryFromAnalysis && !summaryTrim) {
        await db.from("call_sessions").update({ summary: summaryFromAnalysis }).eq("id", sessionId);
      }
      await db.from("call_analysis").insert({
        workspace_id,
        call_session_id: sessionId,
        analysis_json: {
          outcome: analysis.outcome,
          business_outcome: businessOutcome,
          sentiment,
          next_best_action: analysis.next_best_action,
          followup_plan: analysis.followup_plan,
          summary: analysis.summary,
        },
        confidence: analysis.confidence,
        analysis_source: "gpt4o_post_call",
      });
    } catch {
      // non-blocking
    }
  } else if (sessionId && combinedText) {
    try {
      await db.from("call_analysis").insert({
        workspace_id,
        call_session_id: sessionId,
        analysis_json: {
          outcome: businessOutcome,
          business_outcome: businessOutcome,
          sentiment,
          summary: summaryText || null,
        },
        confidence: 0.6,
        analysis_source: "post_call_rules",
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

  if (sessionId && ["appointment_booked", "lead_captured", "urgent"].includes(businessOutcome)) {
    void sendCallOutcomeEmail({
      workspaceId: workspace_id,
      callSessionId: sessionId,
      outcome: businessOutcome,
      summary: summaryText || transcriptText.slice(0, 220),
      callerPhone: body.caller_phone ?? null,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, call_session_id: sessionId });
}
