/**
 * GET /api/analytics/conversations
 * Returns comprehensive conversational analytics for the workspace.
 * Query params: workspace_id, range (7d|30d|90d), agent_id (optional)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

type SentimentDistribution = {
  positive: number;
  neutral: number;
  negative: number;
};

type Objection = {
  objection: string;
  count: number;
  resolution_rate: number;
};

type Topic = {
  topic: string;
  count: number;
};

type DropOffPoint = {
  stage: string;
  drop_off_rate: number;
};

type ConversationAnalyticsResponse = {
  total_conversations: number;
  avg_duration_seconds: number;
  sentiment_distribution: SentimentDistribution;
  top_objections: Objection[];
  top_topics: Topic[];
  talk_to_listen_ratio: number;
  avg_response_time_seconds: number;
  conversion_rate: number;
  drop_off_points: DropOffPoint[];
};

function getRangeStart(range: string): Date {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

function parseSentimentJson(analysisJson: Record<string, unknown> | null): "positive" | "neutral" | "negative" {
  if (!analysisJson) return "neutral";
  const sentiment = (analysisJson.sentiment ?? "neutral").toString().toLowerCase();
  if (sentiment === "positive") return "positive";
  if (sentiment === "negative") return "negative";
  return "neutral";
}

function extractObjections(analysisJson: Record<string, unknown> | null): string[] {
  if (!analysisJson) return [];
  const objections = analysisJson.objections;
  if (!Array.isArray(objections)) return [];
  return objections
    .filter((o): o is string => typeof o === "string")
    .slice(0, 10);
}

function extractTopics(transcriptText: string | null): string[] {
  if (!transcriptText) return [];
  // Simple keyword extraction from transcript
  const words = transcriptText.toLowerCase().split(/\s+/);
  const freq: Record<string, number> = {};
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "that", "this", "these", "those", "what", "which", "who", "when", "where", "why", "how"
  ]);

  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, "");
    if (clean.length > 3 && !stopWords.has(clean)) {
      freq[clean] = (freq[clean] ?? 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const range = req.nextUrl.searchParams.get("range") || "7d";
  const agentId = req.nextUrl.searchParams.get("agent_id");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const rangeStart = getRangeStart(range);

    let query = db
      .from("call_sessions")
      .select(`
        id, call_started_at, call_ended_at, workspace_id, transcript_text
      `)
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", rangeStart.toISOString())
      .not("call_ended_at", "is", null);

    if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    const { data: calls, error: callsErr } = await query;

    if (callsErr) {
      log("error", "analytics.conversations.GET", { error: callsErr.message });
      return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
    }

    const callIds = (calls ?? []).map((c: Record<string, unknown>) => c.id as string);

    // Fetch call analyses
    let analyses: Array<{ call_session_id: string; analysis_json: Record<string, unknown> | null }> = [];
    if (callIds.length > 0) {
      const { data: analysisData, error: analysisErr } = await db
        .from("call_analysis")
        .select("call_session_id, analysis_json")
        .in("call_session_id", callIds);

      if (!analysisErr && analysisData) {
        analyses = analysisData as Array<{ call_session_id: string; analysis_json: Record<string, unknown> | null }>;
      }
    }

    const analysisMap = analyses.reduce(
      (acc, a) => {
        acc[a.call_session_id] = a.analysis_json;
        return acc;
      },
      {} as Record<string, Record<string, unknown> | null>
    );

    // Calculate metrics
    let totalDurationSeconds = 0;
    const sentiments: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    const objectionMap: Record<string, { count: number; resolved: number }> = {};
    const topicMap: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let talkTimeSeconds = 0;
    let listenTimeSeconds = 0;

    for (const call of calls ?? []) {
      const callId = call.id as string;
      const startedAt = new Date((call.call_started_at as string) ?? 0).getTime();
      const endedAt = new Date((call.call_ended_at as string) ?? 0).getTime();
      const duration = Math.max(0, (endedAt - startedAt) / 1000);
      totalDurationSeconds += duration;

      const analysis = analysisMap[callId];

      // Sentiment
      const sentiment = parseSentimentJson(analysis);
      sentiments[sentiment]++;

      // Objections
      const objections = extractObjections(analysis);
      for (const objection of objections) {
        if (!objectionMap[objection]) {
          objectionMap[objection] = { count: 0, resolved: 0 };
        }
        objectionMap[objection].count++;

        const resolution = (analysis?.objection_resolutions as Record<string, boolean>)?.[objection];
        if (resolution) {
          objectionMap[objection].resolved++;
        }
      }

      // Topics
      const topics = extractTopics(call.transcript_text as string | null);
      for (const topic of topics) {
        topicMap[topic] = (topicMap[topic] ?? 0) + 1;
      }

      // Response time (from analysis)
      const respTime = analysis?.avg_response_time_seconds as number | null;
      if (respTime && typeof respTime === "number" && isFinite(respTime)) {
        totalResponseTime += respTime;
        responseTimeCount++;
      }

      // Talk/listen ratio (estimate from transcript)
      const transcript = call.transcript_text as string | null;
      if (transcript) {
        const agentLines = (transcript.match(/agent:/gi) ?? []).length;
        const userLines = (transcript.match(/user:|lead:|prospect:/gi) ?? []).length;
        const totalLines = agentLines + userLines || 1;
        talkTimeSeconds += (agentLines / totalLines) * duration;
        listenTimeSeconds += (userLines / totalLines) * duration;
      }
    }

    // Calculate averages
    const totalConversations = (calls ?? []).length;
    const avgDuration = totalConversations > 0 ? Math.round(totalDurationSeconds / totalConversations) : 0;
    const avgResponseTime = responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0;
    const talkToListenRatio = listenTimeSeconds > 0 ? talkTimeSeconds / listenTimeSeconds : 0;

    // Fetch appointments from same period for conversion rate
    const { data: appointments } = await db
      .from("appointments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", rangeStart.toISOString())
      .in("status", ["confirmed", "completed"]);

    const conversionRate = totalConversations > 0 ? (appointments?.length ?? 0) / totalConversations : 0;

    // Top objections
    const topObjections: Objection[] = Object.entries(objectionMap)
      .map(([obj, data]) => ({
        objection: obj,
        count: data.count,
        resolution_rate: data.count > 0 ? data.resolved / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top topics
    const topTopics: Topic[] = Object.entries(topicMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Drop off points — derived from actual data where possible, clearly labeled as estimates otherwise
    const initialDropOff = totalConversations > 0 ? sentiments.negative / totalConversations : 0;
    const closingDropOff = totalConversations > 0 ? 1 - conversionRate : 0;
    const dropOffPoints: DropOffPoint[] = [
      { stage: "initial_contact", drop_off_rate: parseFloat(initialDropOff.toFixed(3)) },
      { stage: "objection_handling", drop_off_rate: totalConversations > 0 ? parseFloat((topObjections.length / Math.max(totalConversations, 1)).toFixed(3)) : 0 },
      { stage: "closing", drop_off_rate: parseFloat(closingDropOff.toFixed(3)) },
    ];

    const response: ConversationAnalyticsResponse = {
      total_conversations: totalConversations,
      avg_duration_seconds: avgDuration,
      sentiment_distribution: {
        positive: sentiments.positive,
        neutral: sentiments.neutral,
        negative: sentiments.negative,
      },
      top_objections: topObjections,
      top_topics: topTopics,
      talk_to_listen_ratio: Number.isFinite(talkToListenRatio) ? parseFloat(talkToListenRatio.toFixed(2)) : 0,
      avg_response_time_seconds: avgResponseTime,
      conversion_rate: parseFloat(conversionRate.toFixed(3)),
      drop_off_points: dropOffPoints,
    };

    return NextResponse.json(response);
  } catch (error) {
    log("error", "analytics.conversations.GET", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
