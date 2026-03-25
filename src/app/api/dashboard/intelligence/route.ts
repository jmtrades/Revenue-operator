/**
 * Dashboard Intelligence API
 * GET: Returns AI learning metrics for the workspace
 * Shows knowledge growth, call analysis, topic extraction, and confidence scores
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const prevMonthStart = new Date(startOfMonth);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

    // 1. Knowledge items count — derive from knowledge_gaps (resolved) + agent knowledge_base FAQ
    let knowledgeItems = 0;
    let knowledgeItemsAddedThisMonth = 0;
    try {
      const { count: kbTotal } = await db
        .from("knowledge_gaps")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);
      knowledgeItems = kbTotal ?? 0;

      const { count: kbMonth } = await db
        .from("knowledge_gaps")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonth.toISOString());
      knowledgeItemsAddedThisMonth = kbMonth ?? 0;
    } catch {
      // knowledge_gaps table may not exist
    }

    // 2. Call analysis — topics, sentiment, patterns from call_sessions
    let callsAnalyzed = 0;
    let topicsLearned: string[] = [];
    let sentimentPositive = 0;
    let sentimentTotal = 0;

    try {
      const { data: sessions } = await db
        .from("call_sessions")
        .select("id, topics, outcome, summary")
        .eq("workspace_id", workspaceId)
        .not("summary", "is", null);

      if (sessions) {
        callsAnalyzed = sessions.length;

        // Extract unique topics from call sessions
        const topicSet = new Set<string>();
        for (const s of sessions) {
          const sessionTopics = (s as { topics?: string[] }).topics;
          if (Array.isArray(sessionTopics)) {
            for (const t of sessionTopics) {
              topicSet.add(t);
            }
          }
        }
        topicsLearned = Array.from(topicSet).slice(0, 20);

        // Sentiment from outcomes
        for (const s of sessions) {
          const outcome = (s as { outcome?: string }).outcome ?? "";
          sentimentTotal++;
          if (
            outcome === "booked" ||
            outcome === "qualified" ||
            outcome === "satisfied" ||
            outcome === "resolved"
          ) {
            sentimentPositive++;
          }
        }
      }
    } catch {
      // call_sessions may not have topics column yet
    }

    // 3. Voice quality logs for confidence score
    let avgCallConfidence = 0;
    try {
      const { data: qualityLogs } = await db
        .from("voice_quality_logs")
        .select("avg_ttfb_ms, error_count, total_tts_calls, user_sentiment")
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonth.toISOString());

      if (qualityLogs && qualityLogs.length > 0) {
        // Confidence = weighted score based on low TTFB, low errors, positive sentiment
        let confidenceSum = 0;
        for (const log of qualityLogs) {
          const l = log as {
            avg_ttfb_ms: number;
            error_count: number;
            total_tts_calls: number;
            user_sentiment: string;
          };
          let score = 80; // base
          if (l.avg_ttfb_ms < 300) score += 10;
          else if (l.avg_ttfb_ms > 600) score -= 10;
          if (l.error_count === 0) score += 5;
          else if (l.error_count > 3) score -= 15;
          if (l.user_sentiment === "positive") score += 5;
          else if (l.user_sentiment === "negative") score -= 10;
          confidenceSum += Math.max(0, Math.min(100, score));
        }
        avgCallConfidence = Math.round(confidenceSum / qualityLogs.length);
      } else {
        // Fallback: estimate from call outcomes
        avgCallConfidence =
          sentimentTotal > 0 ? Math.round((sentimentPositive / sentimentTotal) * 100) : 0;
      }
    } catch {
      avgCallConfidence =
        sentimentTotal > 0 ? Math.round((sentimentPositive / sentimentTotal) * 100) : 0;
    }

    // 4. Objection patterns — count from knowledge items tagged as objection or from call transcripts
    let objectionPatterns = 0;
    try {
      const { count: objectionCount } = await db
        .from("knowledge_gaps")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .ilike("question", "%objection%");
      objectionPatterns = objectionCount ?? 0;
    } catch {
      // Not critical
    }
    // Also count unique "difficult" topics
    const difficultTopics = topicsLearned.filter(
      (t) =>
        t.toLowerCase().includes("pricing") ||
        t.toLowerCase().includes("complaint") ||
        t.toLowerCase().includes("cancel") ||
        t.toLowerCase().includes("refund") ||
        t.toLowerCase().includes("wait") ||
        t.toLowerCase().includes("cost")
    );
    objectionPatterns = Math.max(objectionPatterns, difficultTopics.length);

    // 5. Improvement trend — compare this month vs last month call confidence
    let improvementTrend = 0;
    try {
      const { data: prevSessions } = await db
        .from("call_sessions")
        .select("id, outcome")
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", prevMonthStart.toISOString())
        .lt("call_started_at", startOfMonth.toISOString())
        .not("outcome", "is", null);

      if (prevSessions && prevSessions.length > 5) {
        const prevPositive = prevSessions.filter(
          (s) => {
            const outcome = (s as { outcome?: string }).outcome ?? "";
            return outcome === "booked" || outcome === "qualified" || outcome === "satisfied";
          }
        ).length;
        const prevRate = (prevPositive / prevSessions.length) * 100;
        const currentRate = sentimentTotal > 0 ? (sentimentPositive / sentimentTotal) * 100 : 0;
        improvementTrend = Math.round(currentRate - prevRate);
      }
    } catch {
      // Not critical
    }

    // 6. Common questions from knowledge items
    let commonQuestions: string[] = [];
    try {
      const { data: kbItems } = await db
        .from("knowledge_gaps")
        .select("question")
        .eq("workspace_id", workspaceId)
        .order("last_seen_at", { ascending: false })
        .limit(5);

      if (kbItems) {
        commonQuestions = kbItems
          .map((item) => (item as { question: string }).question)
          .filter(Boolean);
      }
    } catch {
      // Not critical
    }

    return NextResponse.json({
      knowledge_items: knowledgeItems,
      knowledge_items_added_this_month: knowledgeItemsAddedThisMonth,
      topics_learned: topicsLearned,
      objection_patterns: objectionPatterns,
      avg_call_confidence: avgCallConfidence,
      calls_analyzed: callsAnalyzed,
      sentiment_positive_pct:
        sentimentTotal > 0 ? Math.round((sentimentPositive / sentimentTotal) * 100) : 0,
      common_questions: commonQuestions,
      improvement_trend: improvementTrend,
    });
  } catch (error) {
    console.error("[API] dashboard/intelligence error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
