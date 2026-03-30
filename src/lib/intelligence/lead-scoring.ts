/**
 * Automatic Lead Scoring Engine
 * Scores leads 0-100 based on call outcomes, engagement signals, and behavioral patterns.
 * Runs automatically after each call and during cron sweeps.
 */

import { getDb } from "@/lib/db/queries";

export interface LeadScore {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  factors: ScoreFactor[];
  recommendation: string;
  scored_at: string;
}

export interface ScoreFactor {
  name: string;
  points: number;
  max_points: number;
  description: string;
}

/**
 * Calculate a lead's score based on all available signals.
 */
export async function scoreLeadFull(
  workspaceId: string,
  leadId: string
): Promise<LeadScore> {
  const db = getDb();
  const factors: ScoreFactor[] = [];
  let totalPoints = 0;
  const maxTotal = 100;

  try {
    // 1. Call engagement (0-30 points)
    const { data: calls } = await db
      .from("call_sessions")
      .select("duration_seconds, outcome, call_started_at, sentiment")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .not("call_ended_at", "is", null)
      .order("call_started_at", { ascending: false })
      .limit(20);

    const callData = (calls ?? []) as Array<{
      duration_seconds?: number;
      outcome?: string;
      call_started_at?: string;
      sentiment?: string;
    }>;

    let callPoints = 0;
    if (callData.length === 0) {
      callPoints = 5; // New lead, some base interest
      factors.push({ name: "Call engagement", points: 5, max_points: 30, description: "New lead — no calls yet" });
    } else {
      const answered = callData.filter(c => (c.duration_seconds ?? 0) > 10).length;
      const answerRate = answered / callData.length;
      const avgDuration = callData.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / callData.length;

      // Answer rate scoring (0-15)
      if (answerRate >= 0.8) callPoints += 15;
      else if (answerRate >= 0.5) callPoints += 10;
      else if (answerRate >= 0.3) callPoints += 5;
      else callPoints += 2;

      // Call duration scoring (0-15)
      if (avgDuration >= 300) callPoints += 15; // 5+ min avg = very engaged
      else if (avgDuration >= 120) callPoints += 10;
      else if (avgDuration >= 30) callPoints += 5;
      else callPoints += 1;

      factors.push({
        name: "Call engagement",
        points: callPoints,
        max_points: 30,
        description: `${answered}/${callData.length} calls answered, avg ${Math.round(avgDuration)}s duration`,
      });
    }
    totalPoints += callPoints;

    // 2. Outcome quality (0-25 points)
    let outcomePoints = 0;
    const positiveOutcomes = ["appointment_confirmed", "payment_made", "payment_promised", "followup_scheduled"];
    const negativeOutcomes = ["opted_out", "hostile", "wrong_number", "legal_risk"];
    const neutralOutcomes = ["connected", "information_provided", "call_back_requested"];

    const latestOutcome = callData[0]?.outcome;
    if (positiveOutcomes.includes(latestOutcome ?? "")) {
      outcomePoints = 25;
    } else if (neutralOutcomes.includes(latestOutcome ?? "")) {
      outcomePoints = 15;
    } else if (latestOutcome === "no_answer") {
      outcomePoints = 5;
    } else if (negativeOutcomes.includes(latestOutcome ?? "")) {
      outcomePoints = 0;
    } else {
      outcomePoints = 10; // Unknown/other
    }

    // Bonus for multiple positive outcomes
    const positiveCount = callData.filter(c => positiveOutcomes.includes(c.outcome ?? "")).length;
    if (positiveCount >= 2) outcomePoints = Math.min(25, outcomePoints + 5);

    factors.push({
      name: "Outcome quality",
      points: outcomePoints,
      max_points: 25,
      description: latestOutcome ? `Latest: ${latestOutcome.replace(/_/g, " ")}` : "No outcome data",
    });
    totalPoints += outcomePoints;

    // 3. Sentiment (0-15 points)
    let sentimentPoints = 8; // Default neutral
    const sentiments = callData.map(c => c.sentiment).filter(Boolean);
    if (sentiments.length > 0) {
      const positiveRatio = sentiments.filter(s => s === "positive").length / sentiments.length;
      const negativeRatio = sentiments.filter(s => s === "negative").length / sentiments.length;
      if (positiveRatio >= 0.6) sentimentPoints = 15;
      else if (positiveRatio >= 0.3) sentimentPoints = 10;
      else if (negativeRatio >= 0.5) sentimentPoints = 2;
      else sentimentPoints = 8;
    }
    factors.push({
      name: "Sentiment",
      points: sentimentPoints,
      max_points: 15,
      description: sentiments.length > 0 ? `${sentiments.filter(s => s === "positive").length}/${sentiments.length} positive` : "No sentiment data",
    });
    totalPoints += sentimentPoints;

    // 4. Recency (0-15 points)
    let recencyPoints = 0;
    if (callData.length > 0 && callData[0].call_started_at) {
      const lastCall = new Date(callData[0].call_started_at);
      const daysSince = (Date.now() - lastCall.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 1) recencyPoints = 15;
      else if (daysSince <= 3) recencyPoints = 12;
      else if (daysSince <= 7) recencyPoints = 9;
      else if (daysSince <= 14) recencyPoints = 6;
      else if (daysSince <= 30) recencyPoints = 3;
      else recencyPoints = 1;

      factors.push({
        name: "Recency",
        points: recencyPoints,
        max_points: 15,
        description: `Last contact ${Math.round(daysSince)} days ago`,
      });
    } else {
      factors.push({ name: "Recency", points: 0, max_points: 15, description: "No contact history" });
    }
    totalPoints += recencyPoints;

    // 5. Profile completeness (0-15 points)
    const { data: leadRow } = await db
      .from("leads")
      .select("name, phone, email, company, metadata")
      .eq("id", leadId)
      .maybeSingle();

    const lead = leadRow as { name?: string; phone?: string; email?: string; company?: string; metadata?: Record<string, unknown> } | null;
    let profilePoints = 0;
    if (lead) {
      if (lead.name && lead.name !== "New Lead" && lead.name !== "Inbound caller") profilePoints += 3;
      if (lead.phone) profilePoints += 3;
      if (lead.email) profilePoints += 4;
      if (lead.company) profilePoints += 3;
      if (lead.metadata && Object.keys(lead.metadata).length > 0) profilePoints += 2;
    }
    factors.push({
      name: "Profile completeness",
      points: profilePoints,
      max_points: 15,
      description: `${profilePoints}/15 fields populated`,
    });
    totalPoints += profilePoints;

    // Calculate grade
    const score = Math.min(maxTotal, Math.max(0, totalPoints));
    const grade: LeadScore["grade"] = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";

    // Generate recommendation
    let recommendation = "";
    if (grade === "A") recommendation = "Hot lead — prioritize for immediate outreach or appointment booking";
    else if (grade === "B") recommendation = "Warm lead — continue nurture sequence, schedule follow-up call";
    else if (grade === "C") recommendation = "Lukewarm — send value-add content, try different approach";
    else if (grade === "D") recommendation = "Cold — reduce frequency, switch to email-only nurture";
    else recommendation = "Very cold or disqualified — minimal contact, review for removal";

    // Persist score
    try {
      await db.from("leads").update({
        qualification_score: score,
        scored_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", leadId);
    } catch {
      // Non-blocking — columns may not exist yet
    }

    return {
      score,
      grade,
      factors,
      recommendation,
      scored_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[lead-scoring]", err instanceof Error ? err.message : String(err));
    return {
      score: 50,
      grade: "C",
      factors: [{ name: "Error", points: 50, max_points: 100, description: "Scoring error — using default" }],
      recommendation: "Unable to score — default to standard nurture",
      scored_at: new Date().toISOString(),
    };
  }
}

/**
 * Score a lead after a call completes (lightweight version called from post-call webhook).
 */
export async function scoreLeadPostCall(
  workspaceId: string,
  leadId: string,
  callOutcome?: string,
  sentiment?: string,
  duration?: number
): Promise<number> {
  // Quick heuristic scoring for real-time use
  let score = 50; // Base

  // Outcome adjustments
  const boosts: Record<string, number> = {
    appointment_confirmed: 30,
    payment_made: 25,
    payment_promised: 20,
    followup_scheduled: 15,
    connected: 10,
    information_provided: 5,
    call_back_requested: 10,
  };
  const penalties: Record<string, number> = {
    opted_out: -50,
    hostile: -40,
    wrong_number: -50,
    legal_risk: -50,
    no_answer: -5,
    complaint: -20,
  };

  score += boosts[callOutcome ?? ""] ?? 0;
  score += penalties[callOutcome ?? ""] ?? 0;

  // Sentiment adjustment
  if (sentiment === "positive") score += 10;
  else if (sentiment === "negative") score -= 15;

  // Duration adjustment
  if (duration && duration > 300) score += 10;
  else if (duration && duration > 60) score += 5;
  else if (duration && duration < 15) score -= 5;

  score = Math.min(100, Math.max(0, score));

  // Quick persist
  const db = getDb();
  try {
    await db.from("leads").update({
      qualification_score: score,
      scored_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", leadId).eq("workspace_id", workspaceId);
  } catch {
    // Non-blocking
  }

  return score;
}

/**
 * Auto-score recent leads that don't have scores yet.
 * Called from cron job.
 */
export async function autoScoreRecentLeads(): Promise<number> {
  const db = getDb();
  let scored = 0;

  try {
    // Find leads with recent calls but no score
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: unscored } = await db
      .from("leads")
      .select("id, workspace_id")
      .is("qualification_score", null)
      .gte("updated_at", sevenDaysAgo)
      .limit(100);

    for (const lead of (unscored ?? []) as Array<{ id: string; workspace_id: string }>) {
      try {
        await scoreLeadFull(lead.workspace_id, lead.id);
        scored++;
      } catch {
        // Skip this lead
      }
    }
  } catch {
    // Table columns may not exist
  }

  return scored;
}
