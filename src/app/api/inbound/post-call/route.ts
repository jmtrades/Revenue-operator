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
import { sendGoLiveEmail } from "@/lib/email/welcome";
import { analyzeTranscriptForAnalytics } from "@/lib/analytics/post-call-insights";
import { assertSameOrigin } from "@/lib/http/csrf";

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
        status: "NEW",
      })
      .select("id")
      .maybeSingle();
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
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

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

  try {
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
    const { data: sess } = await db.from("call_sessions").select("lead_id").eq("id", sessionId).maybeSingle();
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
    } catch (err) {
      console.error("[post-call] call_analysis insert (gpt4o) failed:", err instanceof Error ? err.message : String(err));
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
    } catch (err) {
      console.error("[post-call] call_analysis insert (rules) failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // Post-call analytics: extract outcome, transfer reason, topics, unanswered questions for optimization
  if (sessionId && transcript && String(transcript).trim().length >= 80) {
    void (async () => {
      try {
        const insight = await analyzeTranscriptForAnalytics(transcript);
        if (!insight) return;
        await db.from("call_analytics").insert({
          workspace_id: workspace_id,
          call_session_id: sessionId,
          call_outcome: insight.call_outcome,
          transfer_reason: insight.transfer_reason,
          topics_discussed: insight.topics_discussed.length ? insight.topics_discussed : null,
          unanswered_questions: insight.unanswered_questions.length ? insight.unanswered_questions : null,
        });

        // Persist unanswered questions as knowledge gaps
        if (insight.unanswered_questions?.length) {
          for (const question of insight.unanswered_questions.slice(0, 5)) {
            const q = String(question).trim();
            if (!q || q.length < 10) continue;
            // Check if similar gap already exists (fuzzy match on first 60 chars)
            const prefix = q.slice(0, 60).toLowerCase();
            const { data: existing } = await db
              .from("knowledge_gaps")
              .select("id, occurrences")
              .eq("workspace_id", workspace_id)
              .eq("status", "open")
              .ilike("question", `${prefix}%`)
              .limit(1)
              .maybeSingle();
            const existingRow = existing as { id: string; occurrences: number } | null;
            if (existingRow) {
              // Increment occurrence count
              await db.from("knowledge_gaps")
                .update({ occurrences: existingRow.occurrences + 1, last_seen_at: new Date().toISOString() })
                .eq("id", existingRow.id);
            } else {
              // Create new gap
              await db.from("knowledge_gaps").insert({
                workspace_id: workspace_id,
                question: q,
                occurrences: 1,
                call_session_id: sessionId,
              });
            }
          }
        }

        // If transferred for a recurring reason, suggest adding knowledge
        if (insight.transfer_reason && insight.transfer_reason.length > 0) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const reasonLower = insight.transfer_reason.toLowerCase();
          const { count } = await db
            .from("call_analytics")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspace_id)
            .not("transfer_reason", "is", null)
            .gte("created_at", sevenDaysAgo);
          const totalWithTransfer = Number(count ?? 0);
          if (totalWithTransfer >= 2) {
            const title =
              reasonLower.includes("pricing") || reasonLower.includes("price")
                ? "Calls transferred for pricing questions"
                : reasonLower.includes("person") || reasonLower.includes("someone")
                  ? "Calls transferred to specific person"
                  : `Calls transferred: ${insight.transfer_reason}`;
            const { data: existingRows } = await db
              .from("optimization_suggestions")
              .select("id, title")
              .eq("workspace_id", workspace_id)
              .eq("dismissed", false)
              .limit(50);
            const prefix = title.slice(0, 50);
            const existing = (existingRows ?? []).find(
              (r: { title?: string | null }) => r.title && (r.title === title || r.title.startsWith(prefix) || prefix.startsWith(r.title.slice(0, 50))),
            );
            if (!existing) {
              await db.from("optimization_suggestions").insert({
                workspace_id: workspace_id,
                title,
                description: `${totalWithTransfer} calls in the last 7 days were transferred. Consider adding this to your knowledge base so the AI can handle it.`,
                action_label: "Add to knowledge",
                action_href: "/app/knowledge",
              });
            }
          }
        }
      } catch (err) {
        console.error("[post-call] analytics/optimization insert failed:", err instanceof Error ? err.message : String(err));
      }
    })();
  }

  // ─── AUTO FOLLOW-UP: Zero-intervention outcome-based follow-up ───
  if (leadId && sessionId) {
    void (async () => {
      try {
        const { triggerAutoFollowUp } = await import("@/lib/intelligence/auto-followup");
        // Determine outcome type from analysis
        let outcomeType: string = "unknown";
        if (businessOutcome === "appointment_booked") outcomeType = "appointment_confirmed";
        else if (businessOutcome === "lead_captured") outcomeType = "connected";
        else if (businessOutcome === "transfer_requested") outcomeType = "routed";
        else if (businessOutcome === "message_taken") outcomeType = "call_back_requested";
        else if (businessOutcome === "urgent") outcomeType = "escalation_required";
        else if (businessOutcome === "info_provided") outcomeType = "information_provided";

        await triggerAutoFollowUp({
          workspace_id,
          lead_id: leadId!,
          call_session_id: sessionId!,
          outcome: outcomeType as import("@/lib/intelligence/outcome-taxonomy").OutcomeType,
          sentiment,
          duration_seconds: body.duration_seconds,
        });

        // Auto-score lead after every call (lightweight heuristic — instant)
        const { scoreLeadPostCall } = await import("@/lib/intelligence/lead-scoring");
        await scoreLeadPostCall(workspace_id, leadId!, businessOutcome, sentiment, body.duration_seconds);

        // Trigger comprehensive AI scoring async (non-blocking, fire-and-forget)
        // Only for calls with meaningful transcripts to avoid wasting API calls
        if (body.transcript && body.transcript.length > 200) {
          import("@/lib/lead-scoring/ai-scorer").then(({ scoreLeadWithAI }) => {
            scoreLeadWithAI(workspace_id, leadId!).catch((aiErr) => {
              console.error("[ai-scorer] async score error:", aiErr instanceof Error ? aiErr.message : String(aiErr));
            });
          }).catch(() => { /* ai-scorer module not available */ });
        }

        // Autonomous Brain: recompute intelligence after call (non-blocking)
        // This is the most critical brain trigger — every call outcome reshapes the brain's model
        try {
          const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
          const intelligence = await computeLeadIntelligence(workspace_id, leadId!);
          await persistLeadIntelligence(intelligence);
        } catch {
          // Non-blocking: brain will catch up via cron
        }
      } catch (err) {
        console.error("[auto-followup] trigger error:", err instanceof Error ? err.message : String(err));
      }
    })();
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
      await enqueueAction(cmd).catch((err) => { console.error("[inbound/post-call] error:", err instanceof Error ? err.message : err); });
    }
  }

  if (sessionId && ["appointment_booked", "lead_captured", "urgent"].includes(businessOutcome)) {
    void sendCallOutcomeEmail({
      workspaceId: workspace_id,
      callSessionId: sessionId,
      outcome: businessOutcome,
      summary: summaryText || transcriptText.slice(0, 220),
      callerPhone: body.caller_phone ?? null,
    }).catch((err) => { console.error("[inbound/post-call] error:", err instanceof Error ? err.message : err); });
  }

  // Slack/Teams call summary notifications (Task 24)
  if (sessionId) {
    void (async () => {
      try {
        const { notifyCallSummary } = await import("@/lib/integrations/slack");
        let leadName: string | null = null;
        let durationSeconds: number | null = body.duration_seconds ?? null;
        if (leadId) {
          const { data: leadRow } = await db.from("leads").select("name").eq("id", leadId).maybeSingle();
          leadName = (leadRow as { name?: string | null } | null)?.name ?? null;
        }
        if (durationSeconds == null) {
          const { data: sess } = await db.from("call_sessions").select("call_started_at, call_ended_at").eq("id", sessionId).maybeSingle();
          if (sess) {
            const s = sess as { call_started_at?: string | null; call_ended_at?: string | null };
            const start = s.call_started_at ? new Date(s.call_started_at).getTime() : null;
            const end = s.call_ended_at ? new Date(s.call_ended_at).getTime() : null;
            if (start != null && end != null) durationSeconds = Math.round((end - start) / 1000);
          }
        }
        await notifyCallSummary(workspace_id, {
          call_session_id: sessionId,
          lead_name: leadName,
          caller_phone: body.caller_phone ?? null,
          outcome: businessOutcome,
          summary: summaryText || transcriptText.slice(0, 500) || null,
          duration_seconds: durationSeconds,
        });
      } catch (err) {
        console.error("[post-call] slack/teams notification failed:", err instanceof Error ? err.message : String(err));
      }
    })();
  }

  const { count: completedCount } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace_id)
    .not("call_ended_at", "is", null);
  if (Number(completedCount) === 1) {
    const { data: ws } = await db.from("workspaces").select("name, owner_id").eq("id", workspace_id).maybeSingle();
    const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
    if (ownerId) {
      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (email) {
        void sendGoLiveEmail(email, (ws as { name?: string | null } | null)?.name ?? null).catch((err) => { console.error("[inbound/post-call] error:", err instanceof Error ? err.message : err); });
      }
    }
  }

  return NextResponse.json({ ok: true, call_session_id: sessionId });
  } catch (err) {
    console.error("[post-call]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Post-call processing failed" }, { status: 500 });
  }
}
