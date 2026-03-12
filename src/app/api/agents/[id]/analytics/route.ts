/**
 * GET /api/agents/[id]/analytics — Agent performance KPIs, trends, comparison, recommendations (Task 26).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 30;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await ctx.params;
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = Math.min(90, Math.max(7, parseInt(daysParam ?? "", 10) || DEFAULT_DAYS));

  const db = getDb();
  const { data: agent, error: agentErr } = await db
    .from("agents")
    .select("id, name, workspace_id, vapi_agent_id")
    .eq("id", agentId)
    .maybeSingle();
  if (agentErr || !agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const workspaceId = (agent as { workspace_id: string }).workspace_id;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  // Call sessions for workspace (agent-specific filter when call_sessions.agent_id exists)
  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, outcome, call_started_at, call_ended_at, summary")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", sinceIso)
    .order("call_started_at", { ascending: false });

  const callList = (sessions ?? []) as Array<{
    id: string;
    outcome?: string | null;
    call_started_at?: string | null;
    call_ended_at?: string | null;
    summary?: string | null;
  }>;

  const completedCalls = callList.filter(
    (c) => c.call_ended_at && (c.outcome === "completed" || !c.outcome)
  );
  const callsHandled = callList.length;
  const totalDurationSec = completedCalls.reduce((acc, c) => {
    if (!c.call_started_at || !c.call_ended_at) return acc;
    const s = new Date(c.call_started_at).getTime();
    const e = new Date(c.call_ended_at).getTime();
    return acc + (e - s) / 1000;
  }, 0);
  const avgDurationSec = completedCalls.length > 0 ? totalDurationSec / completedCalls.length : 0;
  const successRate =
    callsHandled > 0 ? Math.round((completedCalls.length / callsHandled) * 100) : 0;

  // Daily volume
  const byDay = new Map<string, number>();
  for (const c of callList) {
    if (!c.call_started_at) continue;
    const d = new Date(c.call_started_at);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const dailyVolume = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, calls]) => ({ date, calls }));

  // Success rate trend (by week)
  const byWeek = new Map<string, { total: number; completed: number }>();
  for (const c of callList) {
    if (!c.call_started_at) continue;
    const d = new Date(c.call_started_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    const cur = byWeek.get(key) ?? { total: 0, completed: 0 };
    cur.total += 1;
    if (c.call_ended_at && (c.outcome === "completed" || !c.outcome)) cur.completed += 1;
    byWeek.set(key, cur);
  }
  const successRateTrend = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week,
      successRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
      calls: v.total,
    }));

  // Quality: use call_analysis confidence if available
  const sessionIds = callList.slice(0, 100).map((c) => c.id);
  let analyses: Array<{ confidence?: number; analysis_json?: { sentiment?: string } }> = [];
  if (sessionIds.length > 0) {
    const { data } = await db
      .from("call_analysis")
      .select("confidence, analysis_json")
      .in("call_session_id", sessionIds);
    analyses = (data ?? []) as Array<{ confidence?: number; analysis_json?: { sentiment?: string } }>;
  }
  const confidences = (analyses ?? []) as Array<{ confidence?: number; analysis_json?: { sentiment?: string } }>;
  const qualityScore =
    confidences.length > 0
      ? Math.round(
          (confidences.reduce((a, x) => a + (Number(x.confidence) || 0), 0) / confidences.length) * 100
        )
      : null;
  const positiveCount = analyses.filter(
    (a) => (a.analysis_json?.sentiment ?? "") === "positive"
  ).length;
  const satisfactionPct =
    analyses.length > 0 ? Math.round((positiveCount / analyses.length) * 100) : null;

  // Outcome breakdown for "top performing"
  const outcomeCounts: Record<string, number> = {};
  for (const c of callList) {
    const o = c.outcome ?? "completed";
    outcomeCounts[o] = (outcomeCounts[o] ?? 0) + 1;
  }
  const topOutcomes = Object.entries(outcomeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([outcome, count]) => ({ outcome, count }));

  // Common intents from summaries (simplified: first 20 words of each summary)
  const summaryWords = new Map<string, number>();
  for (const c of callList) {
    const s = (c.summary ?? "").trim().toLowerCase();
    if (!s) continue;
    const words = s.split(/\s+/).filter((w) => w.length > 4).slice(0, 15);
    for (const w of words) {
      summaryWords.set(w, (summaryWords.get(w) ?? 0) + 1);
    }
  }
  const commonIntents = Array.from(summaryWords.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([intent, count]) => ({ intent, count }));

  // Other agents in workspace for comparison
  const { data: otherAgents } = await db
    .from("agents")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .neq("id", agentId);
  const comparison = (otherAgents ?? []) as Array<{ id: string; name: string }>;

  // Recommendations (simple rules)
  const recommendations: string[] = [];
  if (successRateTrend.length >= 2) {
    const last = successRateTrend[successRateTrend.length - 1]?.successRate ?? 0;
    const prev = successRateTrend[successRateTrend.length - 2]?.successRate ?? 0;
    if (last < prev && last < 70) {
      recommendations.push("Success rate dropped recently. Consider reviewing recent calls and adjusting your script or hours.");
    }
  }
  const dayOfWeekCounts = new Map<number, number>();
  for (const c of callList) {
    if (!c.call_started_at) continue;
    const day = new Date(c.call_started_at).getDay();
    dayOfWeekCounts.set(day, (dayOfWeekCounts.get(day) ?? 0) + 1);
  }
  const friday = dayOfWeekCounts.get(5) ?? 0;
  const avgPerDay = callsHandled / Math.max(1, dailyVolume.length);
  if (avgPerDay > 0 && friday < avgPerDay * 0.5 && callsHandled > 10) {
    recommendations.push("Fewer calls on Fridays. You could adjust availability or messaging for weekend follow-up.");
  }
  if (avgDurationSec > 0 && avgDurationSec < 60 && completedCalls.length > 5) {
    recommendations.push("Calls are short on average. Make sure the agent is capturing key details and offering next steps.");
  }
  if (recommendations.length === 0 && callsHandled > 0) {
    recommendations.push("Keep monitoring. Add more FAQs or adjust greeting if you see common questions in summaries.");
  }

  return NextResponse.json({
    kpis: {
      callsHandled,
      avgDurationSec: Math.round(avgDurationSec),
      successRate,
      qualityScore,
      satisfactionPct,
    },
    dailyVolume,
    successRateTrend,
    topOutcomes,
    commonIntents,
    comparison: comparison.map((a) => ({ id: a.id, name: a.name })),
    recommendations,
    periodDays: days,
  });
}
