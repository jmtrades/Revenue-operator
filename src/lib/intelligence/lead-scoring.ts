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
  trend?: "rising" | "stable" | "declining";
}

export interface ScoreFactor {
  name: string;
  points: number;
  max_points: number;
  description: string;
}

export type IndustryType = "healthcare" | "legal" | "hvac" | "plumbing" | "real_estate" | "default";

/**
 * Get industry adjustment multiplier based on typical conversion rates
 */
function getIndustryMultiplier(industry?: string): number {
  if (!industry) return 1.0;

  const lower = industry.toLowerCase();
  if (lower.includes("health") || lower.includes("medical") || lower.includes("dental")) return 1.1;
  if (lower.includes("law") || lower.includes("legal")) return 1.05;
  if (lower.includes("hvac") || lower.includes("heating")) return 1.15;
  if (lower.includes("plumb")) return 1.15;
  if (lower.includes("real estate") || lower.includes("realty")) return 0.95;

  return 1.0;
}

/**
 * Calculate behavioral velocity (rate of engagement change)
 */
async function calculateBehavioralVelocity(
  workspaceId: string,
  leadId: string
): Promise<{ points: number; description: string }> {
  const db = getDb();
  const now = Date.now();
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const prev7Days = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: recentCalls } = await db
      .from("call_sessions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .gte("call_started_at", last7Days)
      .not("call_ended_at", "is", null);

    const { data: previousCalls } = await db
      .from("call_sessions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .gte("call_started_at", prev7Days)
      .lt("call_started_at", last7Days)
      .not("call_ended_at", "is", null);

    const recentCount = (recentCalls ?? []).length;
    const previousCount = (previousCalls ?? []).length;

    let points = 0;
    let description = "";

    if (previousCount === 0) {
      // New lead or no previous activity
      points = recentCount > 0 ? 8 : 0;
      description = `First week activity: ${recentCount} calls`;
    } else {
      const velocity = recentCount - previousCount;
      if (velocity >= 2) {
        points = 20; // Strong increase
        description = `Velocity up: ${recentCount} vs ${previousCount} calls week-over-week`;
      } else if (velocity > 0) {
        points = 15; // Moderate increase
        description = `Velocity up: ${recentCount} vs ${previousCount} calls week-over-week`;
      } else if (velocity === 0 && recentCount > 0) {
        points = 10; // Stable engagement
        description = `Stable: ${recentCount} calls both weeks`;
      } else if (velocity < 0) {
        points = 3; // Decreasing
        description = `Velocity down: ${recentCount} vs ${previousCount} calls week-over-week`;
      }
    }

    return { points, description };
  } catch {
    return { points: 0, description: "Unable to calculate behavioral velocity" };
  }
}

/**
 * Calculate response time signal
 */
async function calculateResponseTimeSignal(
  workspaceId: string,
  leadId: string
): Promise<{ points: number; description: string }> {
  const db = getDb();

  try {
    // Get recent calls with response patterns
    const { data: calls } = await db
      .from("call_sessions")
      .select("duration_seconds, call_started_at, outcome")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .not("call_ended_at", "is", null)
      .order("call_started_at", { ascending: false })
      .limit(10);

    const callData = (calls ?? []) as Array<{
      duration_seconds?: number;
      call_started_at?: string;
      outcome?: string;
    }>;

    if (callData.length === 0) {
      return { points: 0, description: "No calls to assess response time" };
    }

    // Calculate average response pattern from call outcomes and durations
    const answeredCalls = callData.filter((c) => (c.duration_seconds ?? 0) > 10);

    if (answeredCalls.length === 0) {
      return { points: 0, description: "Lead not answering calls" };
    }

    const answerRatio = answeredCalls.length / callData.length;

    let points = 0;
    let description = "";

    if (answerRatio >= 0.8) {
      points = 10; // Answers on first ring / very responsive
      description = `Very responsive: ${answeredCalls.length}/${callData.length} calls answered`;
    } else if (answerRatio >= 0.5) {
      points = 7; // Returns within reasonable time
      description = `Responsive: ${answeredCalls.length}/${callData.length} calls answered`;
    } else if (answerRatio >= 0.3) {
      points = 4; // Inconsistent but tries
      description = `Sometimes responsive: ${answeredCalls.length}/${callData.length} calls answered`;
    } else {
      points = 1; // Rarely responds
      description = `Low responsiveness: ${answeredCalls.length}/${callData.length} calls answered`;
    }

    return { points, description };
  } catch {
    return { points: 0, description: "Unable to calculate response time" };
  }
}

/**
 * Calculate commitment signals
 */
function calculateCommitmentSignals(callData: Array<{ outcome?: string }>): {
  points: number;
  description: string;
} {
  let points = 0;
  const signals: string[] = [];

  const outcomeCounts = callData.reduce(
    (acc, call) => {
      const outcome = call.outcome ?? "";
      acc[outcome] = (acc[outcome] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (outcomeCounts.appointment_confirmed && outcomeCounts.appointment_confirmed > 0) {
    points += 15;
    signals.push("appointment booked");
  }
  if (outcomeCounts.pricing_inquiry && outcomeCounts.pricing_inquiry > 0) {
    points += 10;
    signals.push("asked for pricing");
  }
  if (
    outcomeCounts.implementation_inquiry ||
    outcomeCounts.technical_inquiry
  ) {
    points += 12;
    signals.push("asked how to get started");
  }
  if (outcomeCounts.timeline_mentioned && outcomeCounts.timeline_mentioned > 0) {
    points += 8;
    signals.push("mentioned timeline");
  }
  if (outcomeCounts.budget_mentioned && outcomeCounts.budget_mentioned > 0) {
    points += 6;
    signals.push("mentioned budget");
  }

  const description =
    signals.length > 0 ? `Commitment signals: ${signals.join(", ")}` : "No commitment signals detected";

  return { points: Math.min(15, points), description };
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
    // 1. Call engagement (0-20 points) - REBALANCED
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
      callPoints = 3; // New lead, some base interest (reduced from 5)
      factors.push({ name: "Call engagement", points: 3, max_points: 20, description: "New lead — no calls yet" });
    } else {
      const answered = callData.filter(c => (c.duration_seconds ?? 0) > 10).length;
      const answerRate = answered / callData.length;
      const avgDuration = callData.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / callData.length;

      // Answer rate scoring (0-10)
      if (answerRate >= 0.8) callPoints += 10;
      else if (answerRate >= 0.5) callPoints += 6;
      else if (answerRate >= 0.3) callPoints += 3;
      else callPoints += 1;

      // Call duration scoring (0-10)
      if (avgDuration >= 300) callPoints += 10; // 5+ min avg = very engaged
      else if (avgDuration >= 120) callPoints += 6;
      else if (avgDuration >= 30) callPoints += 3;
      else callPoints += 1;

      factors.push({
        name: "Call engagement",
        points: Math.min(20, callPoints),
        max_points: 20,
        description: `${answered}/${callData.length} calls answered, avg ${Math.round(avgDuration)}s duration`,
      });
    }
    totalPoints += callPoints;

    // 2. Outcome quality (0-15 points) - REBALANCED
    let outcomePoints = 0;
    const positiveOutcomes = ["appointment_confirmed", "payment_made", "payment_promised", "followup_scheduled"];
    const negativeOutcomes = ["opted_out", "hostile", "wrong_number", "legal_risk"];
    const neutralOutcomes = ["connected", "information_provided", "call_back_requested"];

    const latestOutcome = callData[0]?.outcome;
    if (positiveOutcomes.includes(latestOutcome ?? "")) {
      outcomePoints = 15;
    } else if (neutralOutcomes.includes(latestOutcome ?? "")) {
      outcomePoints = 9;
    } else if (latestOutcome === "no_answer") {
      outcomePoints = 3;
    } else if (negativeOutcomes.includes(latestOutcome ?? "")) {
      outcomePoints = 0;
    } else {
      outcomePoints = 6; // Unknown/other
    }

    // Bonus for multiple positive outcomes
    const positiveCount = callData.filter(c => positiveOutcomes.includes(c.outcome ?? "")).length;
    if (positiveCount >= 2) outcomePoints = Math.min(15, outcomePoints + 3);

    factors.push({
      name: "Outcome quality",
      points: outcomePoints,
      max_points: 15,
      description: latestOutcome ? `Latest: ${latestOutcome.replace(/_/g, " ")}` : "No outcome data",
    });
    totalPoints += outcomePoints;

    // 3. Sentiment (0-10 points) - REBALANCED
    let sentimentPoints = 5; // Default neutral
    const sentiments = callData.map(c => c.sentiment).filter(Boolean);
    if (sentiments.length > 0) {
      const positiveRatio = sentiments.filter(s => s === "positive").length / sentiments.length;
      const negativeRatio = sentiments.filter(s => s === "negative").length / sentiments.length;
      if (positiveRatio >= 0.6) sentimentPoints = 10;
      else if (positiveRatio >= 0.3) sentimentPoints = 6;
      else if (negativeRatio >= 0.5) sentimentPoints = 1;
      else sentimentPoints = 5;
    }
    factors.push({
      name: "Sentiment",
      points: sentimentPoints,
      max_points: 10,
      description: sentiments.length > 0 ? `${sentiments.filter(s => s === "positive").length}/${sentiments.length} positive` : "No sentiment data",
    });
    totalPoints += sentimentPoints;

    // 4. Recency (0-10 points) - REBALANCED
    let recencyPoints = 0;
    if (callData.length > 0 && callData[0].call_started_at) {
      const lastCall = new Date(callData[0].call_started_at);
      const daysSince = (Date.now() - lastCall.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 1) recencyPoints = 10;
      else if (daysSince <= 3) recencyPoints = 8;
      else if (daysSince <= 7) recencyPoints = 6;
      else if (daysSince <= 14) recencyPoints = 4;
      else if (daysSince <= 30) recencyPoints = 2;
      else recencyPoints = 1;

      factors.push({
        name: "Recency",
        points: recencyPoints,
        max_points: 10,
        description: `Last contact ${Math.round(daysSince)} days ago`,
      });
    } else {
      factors.push({ name: "Recency", points: 0, max_points: 10, description: "No contact history" });
    }
    totalPoints += recencyPoints;

    // 5. Profile completeness (0-5 points) - REBALANCED
    const { data: leadRow } = await db
      .from("leads")
      .select("name, phone, email, company, metadata, industry")
      .eq("id", leadId)
      .maybeSingle();

    const lead = leadRow as {
      name?: string;
      phone?: string;
      email?: string;
      company?: string;
      metadata?: Record<string, unknown>;
      industry?: string;
    } | null;

    let profilePoints = 0;
    if (lead) {
      if (lead.name && lead.name !== "New Lead" && lead.name !== "Inbound caller") profilePoints += 1;
      if (lead.phone) profilePoints += 1;
      if (lead.email) profilePoints += 1;
      if (lead.company) profilePoints += 1;
      if (lead.metadata && Object.keys(lead.metadata).length > 0) profilePoints += 1;
    }
    factors.push({
      name: "Profile completeness",
      points: Math.min(5, profilePoints),
      max_points: 5,
      description: `${profilePoints}/5 fields populated`,
    });
    totalPoints += profilePoints;

    // 6. Behavioral velocity (0-20 points) - NEW
    const velocityResult = await calculateBehavioralVelocity(workspaceId, leadId);
    factors.push({
      name: "Behavioral velocity",
      points: velocityResult.points,
      max_points: 20,
      description: velocityResult.description,
    });
    totalPoints += velocityResult.points;

    // 7. Response time signal (0-10 points) - NEW
    const responseResult = await calculateResponseTimeSignal(workspaceId, leadId);
    factors.push({
      name: "Response time signal",
      points: responseResult.points,
      max_points: 10,
      description: responseResult.description,
    });
    totalPoints += responseResult.points;

    // 8. Commitment signals (0-15 points) - NEW
    const commitmentResult = calculateCommitmentSignals(callData);
    factors.push({
      name: "Commitment signals",
      points: commitmentResult.points,
      max_points: 15,
      description: commitmentResult.description,
    });
    totalPoints += commitmentResult.points;

    // Apply industry adjustment multiplier
    const industryMultiplier = getIndustryMultiplier(lead?.industry);
    const adjustedScore = totalPoints * industryMultiplier;

    // Cap at 100
    const score = Math.min(maxTotal, Math.max(0, adjustedScore));

    // Calculate score trend (compare to 7 days ago)
    let trend: LeadScore["trend"] = "stable";
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: previousScore } = await db
        .from("leads")
        .select("qualification_score")
        .eq("id", leadId)
        .lt("scored_at", sevenDaysAgo)
        .order("scored_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousScore && typeof previousScore.qualification_score === "number") {
        const scoreDiff = score - previousScore.qualification_score;
        if (scoreDiff >= 5) trend = "rising";
        else if (scoreDiff <= -5) trend = "declining";
        else trend = "stable";
      }
    } catch {
      // Default to stable if comparison fails
    }

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
      trend,
    };
  } catch (err) {
    // Error in lead scoring (error details omitted to protect PII)
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
