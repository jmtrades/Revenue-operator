/**
 * Admin calls deep analytics: call volume, duration, outcomes, quality metrics, agent performance.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const result: Record<string, any> = {};

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = todayStart.toISOString();
  const weekAgoIso = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Total calls, calls today, calls this week
  try {
    const { count: totalCalls } = await db.from("call_sessions").select("id", { count: "exact", head: true });
    const { count: callsToday } = await db.from("call_sessions").select("id", { count: "exact", head: true }).gte("started_at", todayIso);
    const { count: callsWeek } = await db.from("call_sessions").select("id", { count: "exact", head: true }).gte("started_at", weekAgoIso);

    result.calls_summary = {
      total: totalCalls ?? 0,
      today: callsToday ?? 0,
      this_week: callsWeek ?? 0,
    };
  } catch (err) {
    result.calls_summary = { error: "Failed to fetch call summary" };
  }

  // Calls by direction (derive from metadata or default to unknown)
  try {
    const { data: calls } = await db.from("call_sessions").select("metadata");
    let inbound = 0,
      outbound = 0,
      unknown = 0;
    (calls ?? []).forEach((c: any) => {
      const meta = c.metadata || {};
      const direction = meta.direction || "unknown";
      if (direction === "inbound") inbound += 1;
      else if (direction === "outbound") outbound += 1;
      else unknown += 1;
    });

    result.calls_by_direction = {
      inbound,
      outbound,
      unknown,
    };
  } catch (err) {
    result.calls_by_direction = { error: "Failed to fetch call directions" };
  }

  // Average call duration (calculate from started_at and ended_at)
  try {
    const { data: calls } = await db.from("call_sessions").select("started_at, ended_at");
    if (calls && calls.length > 0) {
      let totalDuration = 0;
      let completedCalls = 0;
      calls.forEach((c: any) => {
        if (c.started_at && c.ended_at) {
          const start = new Date(c.started_at).getTime();
          const end = new Date(c.ended_at).getTime();
          totalDuration += (end - start) / 1000; // Convert to seconds
          completedCalls += 1;
        }
      });
      result.average_call_duration_seconds = completedCalls > 0 ? totalDuration / completedCalls : 0;
    } else {
      result.average_call_duration_seconds = 0;
    }
  } catch (err) {
    result.average_call_duration_seconds = 0;
  }

  // Call outcomes distribution
  try {
    const { data: calls } = await db.from("call_sessions").select("outcome");
    const outcomes: Record<string, number> = {};
    (calls ?? []).forEach((c: any) => {
      const outcome = c.outcome || "unknown";
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    });

    result.call_outcomes = outcomes;
  } catch (err) {
    result.call_outcomes = { error: "Failed to fetch call outcomes" };
  }

  // Calls by workspace (top 10)
  try {
    const { data: calls } = await db.from("call_sessions").select("workspace_id, id").order("started_at", { ascending: false });
    const callsByWorkspace: Record<string, number> = {};
    (calls ?? []).forEach((c: any) => {
      const wsId = c.workspace_id || "unknown";
      callsByWorkspace[wsId] = (callsByWorkspace[wsId] || 0) + 1;
    });

    const topCalls = Object.entries(callsByWorkspace)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([workspace_id, count]) => ({ workspace_id, count }));

    result.calls_by_workspace_top10 = topCalls;
  } catch (err) {
    result.calls_by_workspace_top10 = [];
  }

  // Call quality metrics averages
  try {
    const { data: metrics } = await db.from("call_quality_metrics").select("speech_clarity_score, confidence_score, human_likeness_score, escalation_triggered");

    if (metrics && metrics.length > 0) {
      let avgClarity = 0,
        avgConfidence = 0,
        avgHumanLikeness = 0;
      let escalationCount = 0;

      metrics.forEach((m: any) => {
        if (m.speech_clarity_score) avgClarity += m.speech_clarity_score;
        if (m.confidence_score) avgConfidence += m.confidence_score;
        if (m.human_likeness_score) avgHumanLikeness += m.human_likeness_score;
        if (m.escalation_triggered) escalationCount += 1;
      });

      result.call_quality_metrics = {
        avg_speech_clarity_score: avgClarity / metrics.length,
        avg_confidence_score: avgConfidence / metrics.length,
        avg_human_likeness_score: avgHumanLikeness / metrics.length,
        escalation_rate: escalationCount / metrics.length,
      };
    } else {
      result.call_quality_metrics = {
        avg_speech_clarity_score: 0,
        avg_confidence_score: 0,
        avg_human_likeness_score: 0,
        escalation_rate: 0,
      };
    }
  } catch (err) {
    result.call_quality_metrics = { error: "Failed to fetch call quality metrics" };
  }

  // Agent performance: calls per workspace, avg duration per workspace
  try {
    const { data: calls } = await db.from("call_sessions").select("workspace_id, started_at, ended_at");
    const wsStats: Record<string, { calls: number; total_duration: number; avg_duration: number }> = {};

    (calls ?? []).forEach((c: any) => {
      const wsId = c.workspace_id || "unassigned";
      if (!wsStats[wsId]) {
        wsStats[wsId] = { calls: 0, total_duration: 0, avg_duration: 0 };
      }
      wsStats[wsId].calls += 1;

      // Calculate duration from started_at and ended_at
      if (c.started_at && c.ended_at) {
        const start = new Date(c.started_at).getTime();
        const end = new Date(c.ended_at).getTime();
        wsStats[wsId].total_duration += (end - start) / 1000; // Convert to seconds
      }
    });

    Object.keys(wsStats).forEach((wsId) => {
      wsStats[wsId].avg_duration = wsStats[wsId].total_duration / wsStats[wsId].calls;
    });

    result.workspace_performance = wsStats;
  } catch (err) {
    result.workspace_performance = { error: "Failed to fetch workspace performance" };
  }

  return NextResponse.json(result);
}
