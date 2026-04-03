/**
 * Agent Self-Improvement Loop
 * Analyzes call outcomes to identify successful patterns and areas for improvement.
 * Feeds insights back into the agent's system prompt via learnedBehaviors.
 */

import { getDb } from "@/lib/db/queries";

export interface ImprovementInsight {
  insight: string;
  confidence: number; // 0-1
  evidence: string;
  action: "add_behavior" | "modify_objection" | "update_greeting" | "adjust_pace" | "none";
}

/**
 * Analyze recent calls and generate improvement insights.
 * Should run after every 10-20 calls or on a daily schedule.
 */
export async function generateImprovementInsights(
  workspaceId: string,
  lookbackDays: number = 7
): Promise<ImprovementInsight[]> {
  const db = getDb();
  const insights: ImprovementInsight[] = [];

  try {
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    // Get recent calls with outcomes and durations
    const { data: recentCalls } = await db
      .from("call_sessions")
      .select("id, duration_seconds, outcome, sentiment, call_started_at, transcript_text")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", since)
      .not("call_ended_at", "is", null)
      .order("call_started_at", { ascending: false })
      .limit(100);

    const calls = (recentCalls ?? []) as Array<{
      id: string;
      duration_seconds?: number;
      outcome?: string;
      sentiment?: string;
      call_started_at?: string;
      transcript_text?: string;
    }>;

    if (calls.length < 5) return insights; // Not enough data

    // Metric 1: Answer rate trend
    const answeredCalls = calls.filter(c => (c.duration_seconds ?? 0) > 10);
    const answerRate = answeredCalls.length / calls.length;

    if (answerRate < 0.3) {
      insights.push({
        insight: "Low answer rate detected. Consider calling during different hours or leading with a more compelling opening.",
        confidence: 0.8,
        evidence: `${Math.round(answerRate * 100)}% answer rate over ${calls.length} calls`,
        action: "adjust_pace",
      });
    }

    // Metric 2: Average call duration for answered calls
    const avgDuration = answeredCalls.length > 0
      ? answeredCalls.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / answeredCalls.length
      : 0;

    if (avgDuration < 60 && answeredCalls.length >= 5) {
      insights.push({
        insight: "Average call duration is very short (under 1 minute). The opening might not be engaging enough. Try asking a question in the first 10 seconds instead of pitching.",
        confidence: 0.7,
        evidence: `Average call: ${Math.round(avgDuration)}s across ${answeredCalls.length} answered calls`,
        action: "add_behavior",
      });
    } else if (avgDuration > 600) {
      insights.push({
        insight: "Calls are running long (10+ minutes average). Consider being more direct about the ask and summarizing earlier.",
        confidence: 0.6,
        evidence: `Average call: ${Math.round(avgDuration / 60)} minutes`,
        action: "adjust_pace",
      });
    }

    // Metric 3: Conversion rate (appointments + payments)
    const conversions = calls.filter(c =>
      ["appointment_confirmed", "payment_made", "payment_promised", "followup_scheduled"].includes(c.outcome ?? "")
    );
    const conversionRate = conversions.length / Math.max(1, answeredCalls.length);

    if (conversionRate >= 0.3) {
      insights.push({
        insight: "Strong conversion rate! Current approach is working well. Keep the same energy and style.",
        confidence: 0.9,
        evidence: `${Math.round(conversionRate * 100)}% conversion rate`,
        action: "none",
      });
    } else if (conversionRate < 0.1 && answeredCalls.length >= 10) {
      insights.push({
        insight: "Low conversion rate despite connecting with callers. Try stronger calls-to-action and confirm interest before ending calls.",
        confidence: 0.7,
        evidence: `${Math.round(conversionRate * 100)}% conversion rate (${conversions.length}/${answeredCalls.length} answered calls)`,
        action: "add_behavior",
      });
    }

    // Metric 4: Negative sentiment ratio
    const negatives = calls.filter(c => c.sentiment === "negative");
    const negativeRate = negatives.length / calls.length;

    if (negativeRate > 0.3) {
      insights.push({
        insight: "High negative sentiment detected. Soften the opening approach and lead with value instead of asks. Use more empathetic language.",
        confidence: 0.75,
        evidence: `${Math.round(negativeRate * 100)}% of calls had negative sentiment`,
        action: "add_behavior",
      });
    }

    // Metric 5: Opt-out rate
    const optOuts = calls.filter(c => c.outcome === "opted_out");
    const optOutRate = optOuts.length / calls.length;

    if (optOutRate > 0.15) {
      insights.push({
        insight: "High opt-out rate. Reduce call frequency, improve targeting, and always ask permission to continue before pitching.",
        confidence: 0.85,
        evidence: `${Math.round(optOutRate * 100)}% opt-out rate (${optOuts.length} opt-outs)`,
        action: "add_behavior",
      });
    }

    // Metric 6: Common objections from transcripts (simple keyword analysis)
    const transcripts = calls
      .filter(c => c.transcript_text && c.transcript_text.length > 50)
      .map(c => c.transcript_text!.toLowerCase());

    if (transcripts.length >= 5) {
      const objectionPatterns = [
        { pattern: /too expensive|too much|can't afford|price is high/i, label: "pricing objections" },
        { pattern: /already have|already use|happy with/i, label: "competitor loyalty" },
        { pattern: /not interested|don't need|no thanks/i, label: "flat rejections" },
        { pattern: /busy|bad time|call back later/i, label: "timing objections" },
        { pattern: /who are you|how did you get|stop calling/i, label: "trust/legitimacy concerns" },
      ];

      for (const { pattern, label } of objectionPatterns) {
        const matches = transcripts.filter(t => pattern.test(t)).length;
        const rate = matches / transcripts.length;
        if (rate > 0.2) {
          insights.push({
            insight: `Frequent ${label} detected (${Math.round(rate * 100)}% of calls). Prepare stronger responses for this objection type.`,
            confidence: 0.7,
            evidence: `${matches}/${transcripts.length} transcripts contain ${label}`,
            action: "modify_objection",
          });
        }
      }
    }

    // Metric 7: Time-of-day performance
    const hourPerformance: Record<number, { answered: number; total: number }> = {};
    for (const call of calls) {
      if (!call.call_started_at) continue;
      const hour = new Date(call.call_started_at).getHours();
      if (!hourPerformance[hour]) hourPerformance[hour] = { answered: 0, total: 0 };
      hourPerformance[hour].total++;
      if ((call.duration_seconds ?? 0) > 10) hourPerformance[hour].answered++;
    }

    let bestHour = -1;
    let bestRate = 0;
    let worstHour = -1;
    let worstRate = 1;
    for (const [h, stats] of Object.entries(hourPerformance)) {
      if (stats.total < 3) continue;
      const rate = stats.answered / stats.total;
      if (rate > bestRate) { bestRate = rate; bestHour = Number(h); }
      if (rate < worstRate) { worstRate = rate; worstHour = Number(h); }
    }

    if (bestHour >= 0 && bestRate - worstRate > 0.2) {
      insights.push({
        insight: `Best call hours: around ${bestHour}:00 (${Math.round(bestRate * 100)}% answer rate). Worst: ${worstHour}:00 (${Math.round(worstRate * 100)}%). Prioritize calls during peak hours.`,
        confidence: 0.65,
        evidence: `Based on ${calls.length} calls`,
        action: "none",
      });
    }

    return insights;
  } catch (_err) {
    // Error in self-improvement analysis (error details omitted to protect PII)
    return insights;
  }
}

/**
 * Apply insights as learned behaviors that get injected into the system prompt.
 */
export async function applyInsightsToAgent(
  workspaceId: string,
  insights: ImprovementInsight[]
): Promise<number> {
  const db = getDb();
  let applied = 0;

  for (const insight of insights) {
    if (insight.action === "none") continue;
    if (insight.confidence < 0.6) continue;

    try {
      // Check if similar insight already exists
      const { data: existing } = await db
        .from("call_intelligence_insights")
        .select("id")
        .eq("workspace_id", workspaceId)
        .ilike("recommendation", `%${insight.insight.slice(0, 40)}%`)
        .limit(1)
        .maybeSingle();

      if (existing) continue; // Already have this insight

      await db.from("call_intelligence_insights").insert({
        workspace_id: workspaceId,
        recommendation: insight.insight,
        confidence: insight.confidence,
        evidence: insight.evidence,
        action_type: insight.action,
        applied: insight.confidence >= 0.7, // Auto-apply high-confidence insights
        created_at: new Date().toISOString(),
      });

      applied++;
    } catch {
      // Non-blocking — table may not exist
    }
  }

  return applied;
}

/**
 * Full self-improvement cycle: analyze → generate insights → apply.
 * Called from cron or after every 10 calls.
 */
export async function runSelfImprovementCycle(workspaceId: string): Promise<{
  insights_generated: number;
  insights_applied: number;
}> {
  const insights = await generateImprovementInsights(workspaceId);
  const applied = await applyInsightsToAgent(workspaceId, insights);
  return { insights_generated: insights.length, insights_applied: applied };
}
