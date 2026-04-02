/**
 * Call coaching summary: what worked, missed signals, recommended next step.
 * Returns existing coaching if stored, or generates lightweight coaching from transcript.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await getSession(req);
    if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: callId } = await params;
    const db = getDb();

    const { data: session } = await db
      .from("call_sessions")
      .select("id, lead_id, workspace_id, outcome, summary, call_started_at, call_ended_at, metadata")
      .eq("id", callId)
      .maybeSingle();

    if (!session) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    const s = session as {
      workspace_id?: string; outcome?: string | null;
      summary?: string | null; call_started_at?: string | null; call_ended_at?: string | null;
      metadata?: Record<string, unknown> | null;
    };
    if (s.workspace_id) {
      const accessErr = await requireWorkspaceAccess(req, s.workspace_id);
      if (accessErr) return accessErr;
    }

    // Try reading from call_coaching table first (revenue_operator schema)
    // Real columns: coaching_type, suggestion, confidence
    try {
      const { data: coachingRows } = await db
        .from("call_coaching")
        .select("coaching_type, suggestion, confidence")
        .eq("call_session_id", callId);

      if (coachingRows && (coachingRows as unknown[]).length > 0) {
        const rows = coachingRows as Array<{ coaching_type: string; suggestion: string; confidence: number }>;
        const whatWorked: string[] = [];
        const missedSignals: string[] = [];
        let recommendedNextStep = "Follow up within 24 hours to maintain engagement.";

        for (const row of rows) {
          if (row.coaching_type === "strength" || row.coaching_type === "what_worked") {
            whatWorked.push(row.suggestion);
          } else if (row.coaching_type === "missed_signal" || row.coaching_type === "weakness") {
            missedSignals.push(row.suggestion);
          } else if (row.coaching_type === "next_step" || row.coaching_type === "recommendation") {
            recommendedNextStep = row.suggestion;
          }
        }

        if (whatWorked.length > 0 || missedSignals.length > 0) {
          return NextResponse.json({
            what_worked: whatWorked.length > 0 ? whatWorked : ["Call was handled without critical errors."],
            missed_signals: missedSignals.length > 0 ? missedSignals : ["No major missed signals detected."],
            recommended_next_step: recommendedNextStep,
            available: true,
            source: "stored",
          });
        }
      }
    } catch {
      // Table may not exist or query failed — continue to generate coaching from transcript
    }

    // Generate lightweight coaching from call data if we have a transcript
    const meta = s.metadata ?? {};
    const transcript = typeof (meta as Record<string, unknown>).transcript === "string"
      ? (meta as Record<string, unknown>).transcript as string
      : JSON.stringify((meta as Record<string, unknown>).transcript ?? "");
    if (transcript.length < 50) {
      return NextResponse.json({
        coaching: null,
        available: false,
        reason: "insufficient_transcript",
      });
    }

    const outcome = s.outcome ?? "unknown";
    const sentiment = typeof (meta as Record<string, unknown>).sentiment === "string"
      ? (meta as Record<string, unknown>).sentiment as string : "neutral";
    const duration = s.call_started_at && s.call_ended_at
      ? Math.max(0, (new Date(s.call_ended_at).getTime() - new Date(s.call_started_at).getTime()) / 1000)
      : 0;

    // Lightweight rule-based coaching (no LLM call required)
    const whatWorked: string[] = [];
    const missedSignals: string[] = [];
    let recommendedNextStep = "Follow up within 24 hours to maintain engagement.";

    const lower = transcript.toLowerCase();

    // Positive signals
    if (lower.includes("appointment") || lower.includes("schedule") || lower.includes("book")) {
      whatWorked.push("Successfully guided conversation toward scheduling.");
    }
    if (lower.includes("thank you") || lower.includes("appreciate") || lower.includes("great")) {
      whatWorked.push("Maintained positive rapport with the caller.");
    }
    if (duration > 60 && duration < 600) {
      whatWorked.push("Call duration was optimal — long enough for substance, short enough for efficiency.");
    }
    if (sentiment === "positive") {
      whatWorked.push("Caller sentiment was positive throughout the conversation.");
    }

    // Missed signals
    if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
      if (!lower.includes("quote") && !lower.includes("estimate")) {
        missedSignals.push("Caller asked about pricing but no estimate or quote was offered.");
      }
    }
    if (lower.includes("urgent") || lower.includes("emergency") || lower.includes("asap")) {
      if (outcome !== "transfer_requested" && outcome !== "urgent") {
        missedSignals.push("Caller expressed urgency but call was not escalated or prioritized.");
      }
    }
    if (duration < 30 && outcome !== "appointment_booked") {
      missedSignals.push("Call was very short — may have missed opportunity to qualify or engage.");
    }
    if (lower.includes("already called") || lower.includes("called before") || lower.includes("again")) {
      missedSignals.push("Caller mentioned previous contact — check if prior context was acknowledged.");
    }
    if (sentiment === "negative" || sentiment === "frustrated") {
      missedSignals.push("Negative caller sentiment detected. Review tone and approach.");
    }

    // Recommended next step based on outcome
    if (outcome === "appointment_booked") {
      recommendedNextStep = "Send appointment confirmation and reminder 24 hours before the scheduled time.";
    } else if (outcome === "transfer_requested" || outcome === "urgent") {
      recommendedNextStep = "Ensure transfer was completed and follow up to confirm resolution.";
    } else if (outcome === "voicemail" || outcome === "no_answer") {
      recommendedNextStep = "Retry call within 2-4 hours. Consider sending an SMS as backup.";
    } else if (sentiment === "negative") {
      recommendedNextStep = "Have a senior team member reach out personally to address concerns.";
    } else if (outcome === "lead_captured") {
      recommendedNextStep = "Score the lead and enroll in the appropriate follow-up sequence.";
    }

    // Default entries if nothing matched
    if (whatWorked.length === 0) {
      whatWorked.push("Call was handled without critical errors.");
    }
    if (missedSignals.length === 0) {
      missedSignals.push("No major missed signals detected.");
    }

    return NextResponse.json({
      what_worked: whatWorked,
      missed_signals: missedSignals,
      recommended_next_step: recommendedNextStep,
      available: true,
      source: "auto_generated",
    });
  } catch (error) {
    log("error", "calls.coaching.GET", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
