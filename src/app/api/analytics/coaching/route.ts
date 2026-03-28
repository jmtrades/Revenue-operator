import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getABTestResults, getPhaseFlowMetrics } from "@/lib/analytics/conversation-analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const type = request.nextUrl.searchParams.get("type") ?? "overview";
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "7", 10);

  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();

    if (type === "ab_test") {
      const results = await getABTestResults(workspaceId, days);
      return NextResponse.json({ ab_test: results });
    }

    if (type === "phase_flow") {
      const flow = await getPhaseFlowMetrics(workspaceId, days);
      return NextResponse.json({ phase_flow: flow });
    }

    if (type === "reports") {
      const { data: recentReports } = await db
        .from("coaching_reports")
        .select("id, call_session_id, overall_score, grade, talk_ratio, question_count, empathy_statements, close_attempts, insights, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      return NextResponse.json({
        reports: (recentReports ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          call_session_id: r.call_session_id,
          overall_score: r.overall_score ?? 0,
          grade: r.grade ?? "C",
          talk_ratio: r.talk_ratio ?? 0,
          question_count: r.question_count ?? 0,
          empathy_statements: r.empathy_statements ?? 0,
          close_attempts: r.close_attempts ?? 0,
          insights: Array.isArray(r.insights) ? r.insights : [],
          created_at: r.created_at,
        })),
      });
    }

    // Default: overview with coaching stats
    const { data: reports } = await db
      .from("coaching_reports")
      .select("overall_score, grade, talk_ratio, question_count, empathy_statements, close_attempts, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    const reportList = (reports ?? []) as Array<{
      overall_score: number;
      grade: string;
      talk_ratio: number;
      question_count: number;
      empathy_statements: number;
      close_attempts: number;
      created_at: string;
    }>;

    const totalReports = reportList.length;
    const avgScore = totalReports > 0 ? Math.round(reportList.reduce((s, r) => s + r.overall_score, 0) / totalReports) : 0;
    const avgTalkRatio = totalReports > 0 ? reportList.reduce((s, r) => s + (r.talk_ratio ?? 0), 0) / totalReports : 0;
    const avgQuestionDensity = totalReports > 0 ? reportList.reduce((s, r) => s + (r.question_count ?? 0), 0) / totalReports : 0;
    const avgEmpathy = totalReports > 0 ? reportList.reduce((s, r) => s + (r.empathy_statements ?? 0), 0) / totalReports : 0;

    // Determine overall grade from avg score
    const overallGrade = avgScore >= 90 ? "A" : avgScore >= 80 ? "B" : avgScore >= 70 ? "C" : avgScore >= 60 ? "D" : "F";

    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const r of reportList) {
      if (gradeDistribution[r.grade] !== undefined) gradeDistribution[r.grade]++;
    }

    // NPS summary
    const { data: npsData } = await db
      .from("nps_responses")
      .select("score, classification, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    const npsList = (npsData ?? []) as Array<{ score: number; classification: string }>;
    const npsTotal = npsList.length;
    const promoters = npsList.filter(n => n.classification === "promoter").length;
    const passives = npsList.filter(n => n.classification === "passive").length;
    const detractors = npsList.filter(n => n.classification === "detractor").length;
    const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : null;

    // Escalation summary from call_intelligence logs
    const { data: escalationData } = await db
      .from("conversation_analytics")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
      .not("metadata->escalation_level", "is", null)
      .limit(500);

    const escalations = { watch: 0, warning: 0, critical: 0, escalate: 0, total: 0 };
    for (const row of (escalationData ?? []) as Array<{ metadata: Record<string, unknown> }>) {
      const level = row.metadata?.escalation_level as string;
      if (level && level in escalations) {
        escalations[level as keyof typeof escalations]++;
        escalations.total++;
      }
    }

    // Intelligence engine status from conversation_analytics
    const { count: intelligenceCount } = await db
      .from("conversation_analytics")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("intelligence_enabled", true)
      .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString());

    const { data: avgResponseData } = await db
      .from("conversation_analytics")
      .select("avg_response_ms")
      .eq("workspace_id", workspaceId)
      .eq("intelligence_enabled", true)
      .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
      .limit(100);

    const responseTimes = (avgResponseData ?? []) as Array<{ avg_response_ms: number }>;
    const avgResponseMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((s, r) => s + (r.avg_response_ms ?? 0), 0) / responseTimes.length)
      : 0;

    // A/B test summary
    const abResults = await getABTestResults(workspaceId, days);

    return NextResponse.json({
      // Full coaching data for VoiceAnalyticsCard
      avg_score: avgScore,
      grade: overallGrade,
      talk_ratio_avg: Math.round(avgTalkRatio * 100),
      question_density_avg: Math.round(avgQuestionDensity * 10) / 10,
      empathy_score_avg: Math.round(avgEmpathy * 10) / 10,
      filler_word_rate: 0,
      total_reports: totalReports,
      nps: {
        score: npsScore ?? 0,
        promoters,
        passives,
        detractors,
        total_responses: npsTotal,
      },
      escalations,
      intelligence: {
        enabled: true,
        enhanced_calls: intelligenceCount ?? 0,
        avg_response_ms: avgResponseMs,
        improvement_pct: avgResponseMs > 0 ? Math.round((1 - avgResponseMs / 3000) * 100) : 0,
      },
      // Legacy fields for backward compat
      coaching: {
        total_reports: totalReports,
        avg_score: avgScore,
        avg_talk_ratio: Math.round(avgTalkRatio * 100),
        grade_distribution: gradeDistribution,
        trend: reportList.slice(0, 10).map(r => ({ score: r.overall_score, date: r.created_at })),
      },
      ab_test: abResults,
    });
  } catch (err) {
    log("error", "api.analytics.coaching_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
