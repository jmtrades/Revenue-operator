/**
 * Lead Intelligence Engine — Core Brain for Autonomous Revenue Brain
 * Integrates ALL signals into a single rich intelligence profile.
 * Deterministic rule-based computation — no inference, no freeform AI.
 */

import { getDb } from "@/lib/db/queries";
import { scoreLeadFull } from "./lead-scoring";
import { getNextBestAction } from "./next-best-action";
import { getLeadMemory } from "@/lib/lead-memory";

export interface LeadIntelligence {
  lead_id: string;
  workspace_id: string;

  // Lifecycle
  lifecycle_phase: string;
  days_in_current_phase: number;
  total_touchpoints: number;

  // Scores (0-100)
  urgency_score: number;
  intent_score: number;
  engagement_score: number;

  // Probabilities (0-1)
  conversion_probability: number;
  churn_risk: number;

  // Risk flags
  risk_flags: string[];

  // Decision output
  next_best_action: string;
  action_reason: string;
  action_timing: "immediate" | "scheduled" | "deferred";
  action_channel: string;
  action_confidence: number;

  // Context
  last_outcome: string | null;
  last_sentiment: string | null;
  last_contact_at: string | null;
  hours_since_last_contact: number;

  // Metadata
  computed_at: string;
  signal_count: number;
  version: number;
}

/**
 * Compute comprehensive lead intelligence from all available signals.
 */
export async function computeLeadIntelligence(
  workspaceId: string,
  leadId: string
): Promise<LeadIntelligence> {
  const db = getDb();
  const computedAt = new Date().toISOString();
  let signalCount = 0;

  try {
    // 1. Fetch lead row
    const { data: leadRow } = await db
      .from("leads")
      .select("id, state, created_at, last_activity_at")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const lead = leadRow as {
      id: string;
      state: string;
      created_at: string;
      last_activity_at: string;
    } | null;

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    signalCount += 1;

    // 2. Fetch recent call sessions (max 20)
    const { data: callSessions } = await db
      .from("call_sessions")
      .select("duration_seconds, outcome, call_started_at, sentiment")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .not("call_ended_at", "is", null)
      .order("call_started_at", { ascending: false })
      .limit(20);

    const calls = (callSessions ?? []) as Array<{
      duration_seconds?: number;
      outcome?: string;
      call_started_at?: string;
      sentiment?: string;
    }>;

    signalCount += calls.length > 0 ? 1 : 0;

    // 3. Fetch canonical signals count
    const { count: signalCounts } = await db
      .from("canonical_signals")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId);

    signalCount += signalCounts ? Math.min(1, Math.ceil(signalCounts / 10)) : 0;

    // 4. Fetch recent outcomes (max 10)
    const { data: outcomes } = await db
      .from("universal_outcomes")
      .select("outcome_type, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    const recentOutcomes = (outcomes ?? []) as Array<{
      outcome_type: string;
      created_at: string;
    }>;

    signalCount += recentOutcomes.length > 0 ? 1 : 0;

    // 5. Fetch lead memory
    const memory = await getLeadMemory(workspaceId, leadId);
    signalCount += memory ? 1 : 0;

    // 6. Call lead scoring engine
    const score = await scoreLeadFull(workspaceId, leadId);
    signalCount += 1;

    // 7. Compute lifecycle metrics
    const stateCreatedAt = new Date(lead.created_at);
    const daysSinceStateEntry = Math.floor(
      (Date.now() - stateCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 8. Compute last contact info
    const lastContactTime = calls.length > 0 ? new Date(calls[0].call_started_at!) : new Date(lead.last_activity_at);
    const hoursSinceLastContact = Math.floor(
      (Date.now() - lastContactTime.getTime()) / (1000 * 60 * 60)
    );

    // 9. Compute urgency score (0-100)
    // Decays based on inactivity: fresh = 80, 7 days = 50, 14 days = 30, 30+ days = 10
    let urgencyScore = 80;
    if (hoursSinceLastContact > 720) urgencyScore = 10; // 30+ days
    else if (hoursSinceLastContact > 336) urgencyScore = 30; // 14+ days
    else if (hoursSinceLastContact > 168) urgencyScore = 50; // 7+ days
    else if (hoursSinceLastContact > 24) urgencyScore = 65; // 1+ days

    // Boost if appointment is near or payment promised (check memory/outcomes)
    const hasPaymentPromise = recentOutcomes.some((o) => o.outcome_type === "payment_promised");
    const hasAppointment = recentOutcomes.some((o) => o.outcome_type === "appointment_confirmed");
    if (hasPaymentPromise || hasAppointment) urgencyScore = Math.min(100, urgencyScore + 20);

    // 10. Compute intent score (0-100)
    // Based on outcome quality, engagement pattern, and booking signals
    let intentScore = 40; // Base neutral
    const positiveOutcomes = [
      "appointment_confirmed",
      "payment_made",
      "payment_promised",
      "followup_scheduled",
    ];
    const negativeOutcomes = ["opted_out", "hostile", "wrong_number", "legal_risk"];

    const positiveOutcomeCount = recentOutcomes.filter((o) =>
      positiveOutcomes.includes(o.outcome_type)
    ).length;
    const negativeOutcomeCount = recentOutcomes.filter((o) =>
      negativeOutcomes.includes(o.outcome_type)
    ).length;

    // Scale by positive outcomes
    intentScore = 40 + positiveOutcomeCount * 15 - negativeOutcomeCount * 20;
    intentScore = Math.max(0, Math.min(100, intentScore));

    // 11. Compute engagement score (from lead score)
    // Map score grade to engagement: A=90, B=75, C=60, D=40, F=20
    const engagementScore =
      score.grade === "A"
        ? 90
        : score.grade === "B"
          ? 75
          : score.grade === "C"
            ? 60
            : score.grade === "D"
              ? 40
              : 20;

    // 12. Compute conversion probability (0-1)
    // Weighted: 40% score grade, 35% outcome quality, 25% engagement trend
    const gradeWeight =
      score.grade === "A"
        ? 0.9
        : score.grade === "B"
          ? 0.7
          : score.grade === "C"
            ? 0.5
            : score.grade === "D"
              ? 0.3
              : 0.1;
    const outcomeWeight =
      positiveOutcomeCount > 0 ? Math.min(1, 0.3 + positiveOutcomeCount * 0.15) : 0.2;
    const engagementTrend =
      calls.length > 1
        ? calls.slice(0, 3).filter((c) => (c.duration_seconds ?? 0) > 30).length / Math.min(3, calls.length)
        : 0.5;

    const conversionProbability = gradeWeight * 0.4 + outcomeWeight * 0.35 + engagementTrend * 0.25;

    // 13. Compute churn risk (0-1)
    // High inactivity, negative sentiment, no positive signals = high risk
    let churnRisk = 0;
    if (hoursSinceLastContact > 720) churnRisk += 0.3; // 30+ days
    else if (hoursSinceLastContact > 336) churnRisk += 0.15; // 14+ days

    const recentSentiments = calls.slice(0, 5).map((c) => c.sentiment);
    const negativeSentimentRatio =
      recentSentiments.filter((s) => s === "negative").length / Math.max(1, recentSentiments.length);
    churnRisk += negativeSentimentRatio * 0.4;

    if (negativeOutcomeCount >= 2) churnRisk += 0.2;
    churnRisk = Math.min(1, churnRisk);

    // 14. Compute risk flags
    const riskFlags: string[] = [];

    // Anger flag
    if (
      recentSentiments.filter((s) => s === "negative").length >= 2 ||
      recentOutcomes.some((o) => o.outcome_type === "hostile")
    ) {
      riskFlags.push("anger");
    }

    // Opt-out signal
    if (recentOutcomes.some((o) => o.outcome_type === "opted_out")) {
      riskFlags.push("opt_out_signal");
    }

    // Going cold (no contact >7 days)
    if (hoursSinceLastContact > 168) {
      riskFlags.push("going_cold");
    }

    // No show risk (booked but low engagement)
    if (
      recentOutcomes.some((o) => o.outcome_type === "appointment_confirmed") &&
      engagementScore < 50
    ) {
      riskFlags.push("no_show_risk");
    }

    // Stale (>30 days no contact)
    if (hoursSinceLastContact > 720) {
      riskFlags.push("stale");
    }

    // 15. Determine next best action
    const nbaResult = await getNextBestAction({
      leadId,
      state: lead.state,
      intent: positiveOutcomeCount > 0 ? "interested" : "exploring",
      riskFlags,
      dealId: undefined,
    });

    // 16. Map action to channel
    const channelMap: Record<string, string> = {
      ask_clarification: "multi",
      send_proof: "email",
      reframe_value: "call",
      book_call: "call",
      schedule_followup: "sms",
      reactivate_later: "email",
      escalate_human: "multi",
    };

    const actionChannel = channelMap[nbaResult.action] || "multi";

    // 17. Determine action timing
    // Safety-critical risk flags → immediate (escalation/pause must fire, not be deferred)
    // High urgency or explicit escalation → immediate
    // Everything else → scheduled
    let actionTiming: "immediate" | "scheduled" | "deferred" = "scheduled";
    if (riskFlags.includes("opt_out_signal")) {
      actionTiming = "immediate"; // Pause must fire immediately
    } else if (riskFlags.includes("anger")) {
      actionTiming = "immediate"; // Escalation must fire immediately
    } else if (urgencyScore > 75 || nbaResult.action === "escalate_human") {
      actionTiming = "immediate";
    }

    // 18. Get last outcome and sentiment
    const lastOutcome = recentOutcomes.length > 0 ? recentOutcomes[0].outcome_type : null;
    const lastSentiment =
      calls.length > 0 && calls[0].sentiment ? calls[0].sentiment : null;

    return {
      lead_id: leadId,
      workspace_id: workspaceId,
      lifecycle_phase: lead.state,
      days_in_current_phase: daysSinceStateEntry,
      total_touchpoints: calls.length + recentOutcomes.length,
      urgency_score: Math.round(urgencyScore),
      intent_score: Math.round(intentScore),
      engagement_score: engagementScore,
      conversion_probability: Math.round(conversionProbability * 100) / 100,
      churn_risk: Math.round(churnRisk * 100) / 100,
      risk_flags: riskFlags,
      next_best_action: nbaResult.action,
      action_reason: nbaResult.reasoning,
      action_timing: actionTiming,
      action_channel: actionChannel,
      action_confidence: nbaResult.confidence,
      last_outcome: lastOutcome,
      last_sentiment: lastSentiment,
      last_contact_at: lastContactTime.toISOString(),
      hours_since_last_contact: hoursSinceLastContact,
      computed_at: computedAt,
      signal_count: signalCount,
      version: 1,
    };
  } catch (err) {
    console.error(
      "[lead-brain] computeLeadIntelligence error:",
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

/**
 * Persist lead intelligence to database (non-blocking).
 */
export async function persistLeadIntelligence(
  intelligence: LeadIntelligence
): Promise<{ ok: boolean }> {
  const db = getDb();
  try {
    // Attempt upsert
    await db.from("lead_intelligence").upsert(
      {
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        lifecycle_phase: intelligence.lifecycle_phase,
        days_in_current_phase: intelligence.days_in_current_phase,
        total_touchpoints: intelligence.total_touchpoints,
        urgency_score: intelligence.urgency_score,
        intent_score: intelligence.intent_score,
        engagement_score: intelligence.engagement_score,
        conversion_probability: intelligence.conversion_probability,
        churn_risk: intelligence.churn_risk,
        risk_flags_json: intelligence.risk_flags,
        next_best_action: intelligence.next_best_action,
        action_reason: intelligence.action_reason,
        action_timing: intelligence.action_timing,
        action_channel: intelligence.action_channel,
        action_confidence: intelligence.action_confidence,
        last_outcome: intelligence.last_outcome,
        last_sentiment: intelligence.last_sentiment,
        last_contact_at: intelligence.last_contact_at,
        hours_since_last_contact: intelligence.hours_since_last_contact,
        computed_at: intelligence.computed_at,
        signal_count: intelligence.signal_count,
        version: intelligence.version,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,workspace_id" }
    );
    return { ok: true };
  } catch (err) {
    // Non-blocking — log but don't throw
    console.error(
      "[lead-brain] persistLeadIntelligence error:",
      err instanceof Error ? err.message : String(err)
    );
    return { ok: false };
  }
}

/**
 * Retrieve persisted lead intelligence from database.
 */
export async function getLeadIntelligence(
  workspaceId: string,
  leadId: string
): Promise<LeadIntelligence | null> {
  const db = getDb();
  try {
    const { data } = await db
      .from("lead_intelligence")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (!data) return null;

    return {
      lead_id: (data as Record<string, unknown>).lead_id as string,
      workspace_id: (data as Record<string, unknown>).workspace_id as string,
      lifecycle_phase: (data as Record<string, unknown>).lifecycle_phase as string,
      days_in_current_phase: (data as Record<string, unknown>).days_in_current_phase as number,
      total_touchpoints: (data as Record<string, unknown>).total_touchpoints as number,
      urgency_score: (data as Record<string, unknown>).urgency_score as number,
      intent_score: (data as Record<string, unknown>).intent_score as number,
      engagement_score: (data as Record<string, unknown>).engagement_score as number,
      conversion_probability: (data as Record<string, unknown>).conversion_probability as number,
      churn_risk: (data as Record<string, unknown>).churn_risk as number,
      risk_flags: ((data as Record<string, unknown>).risk_flags_json as string[]) || [],
      next_best_action: (data as Record<string, unknown>).next_best_action as string,
      action_reason: (data as Record<string, unknown>).action_reason as string,
      action_timing: (data as Record<string, unknown>).action_timing as
        | "immediate"
        | "scheduled"
        | "deferred",
      action_channel: (data as Record<string, unknown>).action_channel as string,
      action_confidence: (data as Record<string, unknown>).action_confidence as number,
      last_outcome: ((data as Record<string, unknown>).last_outcome as string) || null,
      last_sentiment: ((data as Record<string, unknown>).last_sentiment as string) || null,
      last_contact_at: (data as Record<string, unknown>).last_contact_at as string,
      hours_since_last_contact: (data as Record<string, unknown>).hours_since_last_contact as number,
      computed_at: (data as Record<string, unknown>).computed_at as string,
      signal_count: (data as Record<string, unknown>).signal_count as number,
      version: (data as Record<string, unknown>).version as number,
    };
  } catch (err) {
    // Table may not exist yet — return null gracefully
    return null;
  }
}
