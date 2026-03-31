/**
 * Channel Orchestration - Insights Endpoint
 * GET /api/channel-orchestration/insights
 * Returns workspace-level channel performance metrics and trends.
 * Includes: response rates by channel, optimal times, preferences, 30-day trends.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

interface ChannelMetrics {
  channel: string;
  total_attempts: number;
  successful_responses: number;
  response_rate: number;
  avg_response_time_hours: number;
  trend_change_percent: number;
}

interface TimeSlot {
  hour: number;
  success_rate: number;
  attempt_count: number;
}

interface InsightsResponse {
  workspace_id: string;
  period_days: number;
  metrics: {
    channels: ChannelMetrics[];
    optimal_times: TimeSlot[];
    channel_preference_distribution: Record<string, number>;
    best_performing_channel: string;
    recommended_primary_channel: string;
    total_interactions: number;
  };
  trends: {
    period: string;
    channels_by_trend: Array<{ channel: string; change_percent: number }>;
  };
  timestamp: string;
}

export async function GET(req: NextRequest) {
  try {
    // Auth and workspace validation
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Parse optional parameters
    const periodDays = parseInt(req.nextUrl.searchParams.get("period") || "30", 10);
    if (isNaN(periodDays) || periodDays < 1 || periodDays > 365) {
      return NextResponse.json({ error: "period must be between 1 and 365 days" }, { status: 400 });
    }

    // Fetch insights
    const insights = await getChannelInsights(workspaceId, periodDays);

    return NextResponse.json(
      {
        ...insights,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    log("error", "[channel-orchestration/insights] Error:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getChannelInsights(workspaceId: string, periodDays: number): Promise<InsightsResponse> {
  const db = getDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Fetch all call sessions within the period
  const { data: callSessions } = await db
    .from("call_sessions")
    .select("id, outcome, call_started_at, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", now.toISOString());

  // Fetch all SMS interactions
  const { data: smsLogs } = await db
    .from("sms_logs")
    .select("id, status, sent_at, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", now.toISOString());

  // Fetch all email interactions
  const { data: emailLogs } = await db
    .from("email_logs")
    .select("id, status, sent_at, created_at, opened_at, clicked_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", now.toISOString());

  // Fetch lead preferences
  const { data: leads } = await db
    .from("leads")
    .select("id, call_preference, sms_preference, email_preference")
    .eq("workspace_id", workspaceId);

  // Calculate call metrics
  const callMetrics = calculateCallMetrics(
    (callSessions ?? []) as Array<{ outcome?: string; call_started_at?: string; created_at?: string }>
  );
  const smsMetrics = calculateSmsMetrics(
    (smsLogs ?? []) as Array<{ status?: string; sent_at?: string; created_at?: string }>
  );
  const emailMetrics = calculateEmailMetrics(
    (emailLogs ?? []) as Array<{ status?: string; sent_at?: string; opened_at?: string; clicked_at?: string; created_at?: string }>
  );

  // Calculate optimal times from successful calls
  const optimalTimes = calculateOptimalTimes(
    (callSessions ?? []) as Array<{ outcome?: string; call_started_at?: string }>
  );

  // Calculate preference distribution
  const prefDistribution = calculatePreferenceDistribution(
    (leads ?? []) as Array<{ call_preference?: boolean; sms_preference?: boolean; email_preference?: boolean }>
  );

  // Combine metrics
  const allMetrics = [callMetrics, smsMetrics, emailMetrics].filter(Boolean);

  // Find best performing channel
  const bestChannel = allMetrics.reduce((best, current) => {
    if (!best || (current?.response_rate ?? 0) > (best.response_rate ?? 0)) {
      return current;
    }
    return best;
  });

  // Calculate trends (compare first half vs second half)
  const trendAnalysis = calculateTrends(
    (callSessions ?? []) as Array<{ created_at?: string; outcome?: string }>,
    (smsLogs ?? []) as Array<{ created_at?: string; status?: string }>,
    (emailLogs ?? []) as Array<{ created_at?: string; status?: string }>,
    periodStart
  );

  return {
    workspace_id: workspaceId,
    period_days: periodDays,
    metrics: {
      channels: allMetrics,
      optimal_times: optimalTimes,
      channel_preference_distribution: prefDistribution,
      best_performing_channel: bestChannel?.channel ?? "call",
      recommended_primary_channel: getRecommendedPrimaryChannel(allMetrics, prefDistribution),
      total_interactions: (callSessions?.length ?? 0) + (smsLogs?.length ?? 0) + (emailLogs?.length ?? 0),
    },
    trends: {
      period: `Last ${periodDays} days`,
      channels_by_trend: trendAnalysis,
    },
    timestamp: new Date().toISOString(),
  };
}

function calculateCallMetrics(
  sessions: Array<{ outcome?: string; call_started_at?: string; created_at?: string }>
): ChannelMetrics {
  if (sessions.length === 0) {
    return {
      channel: "call",
      total_attempts: 0,
      successful_responses: 0,
      response_rate: 0,
      avg_response_time_hours: 0,
      trend_change_percent: 0,
    };
  }

  const successful = sessions.filter((s) => s.outcome === "success").length;
  const responseRate = sessions.length > 0 ? successful / sessions.length : 0;

  // Calculate average response time (simplified)
  let totalResponseTime = 0;
  let responseCounts = 0;

  sessions.forEach((s) => {
    if (s.call_started_at && s.created_at) {
      const start = new Date(s.created_at);
      const responded = new Date(s.call_started_at);
      const diffHours = (responded.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diffHours >= 0) {
        totalResponseTime += diffHours;
        responseCounts++;
      }
    }
  });

  const avgResponseTime = responseCounts > 0 ? totalResponseTime / responseCounts : 0;

  return {
    channel: "call",
    total_attempts: sessions.length,
    successful_responses: successful,
    response_rate: Math.round(responseRate * 100) / 100,
    avg_response_time_hours: Math.round(avgResponseTime * 10) / 10,
    trend_change_percent: 0, // Calculated separately in trends
  };
}

function calculateSmsMetrics(
  logs: Array<{ status?: string; sent_at?: string; created_at?: string }>
): ChannelMetrics {
  if (logs.length === 0) {
    return {
      channel: "sms",
      total_attempts: 0,
      successful_responses: 0,
      response_rate: 0,
      avg_response_time_hours: 0,
      trend_change_percent: 0,
    };
  }

  // Count delivered/responded SMS
  const delivered = logs.filter((l) => l.status === "delivered" || l.status === "responded").length;
  const responseRate = logs.length > 0 ? delivered / logs.length : 0;

  return {
    channel: "sms",
    total_attempts: logs.length,
    successful_responses: delivered,
    response_rate: Math.round(responseRate * 100) / 100,
    avg_response_time_hours: 0.25, // SMS is typically very fast
    trend_change_percent: 0,
  };
}

function calculateEmailMetrics(
  logs: Array<{ status?: string; sent_at?: string; opened_at?: string; clicked_at?: string; created_at?: string }>
): ChannelMetrics {
  if (logs.length === 0) {
    return {
      channel: "email",
      total_attempts: 0,
      successful_responses: 0,
      response_rate: 0,
      avg_response_time_hours: 0,
      trend_change_percent: 0,
    };
  }

  // Count opened emails as "response"
  const responded = logs.filter((l) => l.opened_at || l.clicked_at).length;
  const responseRate = logs.length > 0 ? responded / logs.length : 0;

  // Calculate average time to open
  let totalOpenTime = 0;
  let openCounts = 0;

  logs.forEach((l) => {
    if (l.opened_at && l.sent_at) {
      const sent = new Date(l.sent_at);
      const opened = new Date(l.opened_at);
      const diffHours = (opened.getTime() - sent.getTime()) / (1000 * 60 * 60);
      if (diffHours >= 0) {
        totalOpenTime += diffHours;
        openCounts++;
      }
    }
  });

  const avgOpenTime = openCounts > 0 ? totalOpenTime / openCounts : 24;

  return {
    channel: "email",
    total_attempts: logs.length,
    successful_responses: responded,
    response_rate: Math.round(responseRate * 100) / 100,
    avg_response_time_hours: Math.round(avgOpenTime * 10) / 10,
    trend_change_percent: 0,
  };
}

function calculateOptimalTimes(sessions: Array<{ outcome?: string; call_started_at?: string }>): TimeSlot[] {
  const hourMap = new Map<number, { successes: number; total: number }>();

  sessions.forEach((s) => {
    if (s.call_started_at) {
      const date = new Date(s.call_started_at);
      const hour = date.getHours();
      const current = hourMap.get(hour) ?? { successes: 0, total: 0 };
      current.total++;
      if (s.outcome === "success") {
        current.successes++;
      }
      hourMap.set(hour, current);
    }
  });

  const slots: TimeSlot[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const data = hourMap.get(hour);
    if (data && data.total > 0) {
      slots.push({
        hour,
        success_rate: Math.round((data.successes / data.total) * 100) / 100,
        attempt_count: data.total,
      });
    }
  }

  return slots.sort((a, b) => b.success_rate - a.success_rate).slice(0, 5);
}

function calculatePreferenceDistribution(
  leads: Array<{ call_preference?: boolean; sms_preference?: boolean; email_preference?: boolean }>
): Record<string, number> {
  const counts = { call: 0, sms: 0, email: 0 };
  const totalLeads = leads.length;

  if (totalLeads === 0) {
    return { call: 0.33, sms: 0.33, email: 0.34 };
  }

  leads.forEach((lead) => {
    if (lead.call_preference) counts.call++;
    if (lead.sms_preference) counts.sms++;
    if (lead.email_preference) counts.email++;
  });

  return {
    call: Math.round((counts.call / totalLeads) * 100) / 100,
    sms: Math.round((counts.sms / totalLeads) * 100) / 100,
    email: Math.round((counts.email / totalLeads) * 100) / 100,
  };
}

function getRecommendedPrimaryChannel(
  metrics: ChannelMetrics[],
  preferences: Record<string, number>
): string {
  // Weight: 70% response rate, 30% preference
  const scores = metrics.map((m) => {
    const pref = preferences[m.channel] ?? 0.33;
    const score = m.response_rate * 0.7 + pref * 0.3;
    return { channel: m.channel, score };
  });

  const best = scores.reduce((a, b) => (a.score > b.score ? a : b));
  return best.channel;
}

function calculateTrends(
  callSessions: Array<{ created_at?: string; outcome?: string }>,
  smsSessions: Array<{ created_at?: string; status?: string }>,
  emailSessions: Array<{ created_at?: string; status?: string }>,
  periodStart: Date
): Array<{ channel: string; change_percent: number }> {
  const periodMid = new Date(periodStart.getTime() + (Date.now() - periodStart.getTime()) / 2);

  const callFirst = callSessions.filter(
    (s) => s.created_at && new Date(s.created_at) < periodMid && s.outcome === "success"
  ).length;
  const callSecond = callSessions.filter(
    (s) => s.created_at && new Date(s.created_at) >= periodMid && s.outcome === "success"
  ).length;
  const callTotalFirst = callSessions.filter(
    (s) => s.created_at && new Date(s.created_at) < periodMid
  ).length;
  const callTotalSecond = callSessions.filter(
    (s) => s.created_at && new Date(s.created_at) >= periodMid
  ).length;

  const smsFirst = smsSessions.filter(
    (s) =>
      s.created_at &&
      new Date(s.created_at) < periodMid &&
      (s.status === "delivered" || s.status === "responded")
  ).length;
  const smsSecond = smsSessions.filter(
    (s) =>
      s.created_at &&
      new Date(s.created_at) >= periodMid &&
      (s.status === "delivered" || s.status === "responded")
  ).length;
  const smsTotalFirst = smsSessions.filter((s) => s.created_at && new Date(s.created_at) < periodMid).length;
  const smsTotalSecond = smsSessions.filter((s) => s.created_at && new Date(s.created_at) >= periodMid).length;

  const emailFirst = emailSessions.filter(
    (s) => s.created_at && new Date(s.created_at) < periodMid
  ).length;
  const emailSecond = emailSessions.filter(
    (s) => s.created_at && new Date(s.created_at) >= periodMid
  ).length;

  const calculateChange = (first: number, total1: number, second: number, total2: number): number => {
    const rate1 = total1 > 0 ? first / total1 : 0;
    const rate2 = total2 > 0 ? second / total2 : 0;
    if (rate1 === 0) return rate2 > 0 ? 100 : 0;
    return Math.round(((rate2 - rate1) / rate1) * 100);
  };

  return [
    {
      channel: "call",
      change_percent: calculateChange(callFirst, callTotalFirst, callSecond, callTotalSecond),
    },
    {
      channel: "sms",
      change_percent: calculateChange(smsFirst, smsTotalFirst, smsSecond, smsTotalSecond),
    },
    {
      channel: "email",
      change_percent: calculateChange(emailFirst, emailSessions.length, emailSecond, emailSessions.length),
    },
  ];
}
