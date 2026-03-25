/**
 * Voice Quality Metrics API
 * GET: Get voice quality metrics
 * POST: Record quality log
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    // Get optional date range filters
    const startDate = req.nextUrl.searchParams.get("start_date");
    const endDate = req.nextUrl.searchParams.get("end_date");

    let query = db
      .from("voice_quality_logs")
      .select(
        "id, voice_id, tts_model, created_at, avg_ttfb_ms, max_ttfb_ms, avg_mos_score, audio_glitches, barge_in_count, silence_ratio, user_sentiment, call_duration_seconds, total_tts_calls, total_stt_calls, error_count"
      )
      .eq("workspace_id", workspaceId);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, error } = await query.order("created_at", { ascending: false }).limit(1000);

    if (error) {
      console.error("[API] voice quality GET error:", error);
      return NextResponse.json({ error: "Failed to fetch quality logs" }, { status: 500 });
    }

    const logData = (logs ?? []) as Array<{
      id: string;
      voice_id: string;
      tts_model: string | null;
      created_at: string;
      avg_ttfb_ms: number | null;
      max_ttfb_ms: number | null;
      avg_mos_score: number | null;
      audio_glitches: number;
      barge_in_count: number;
      silence_ratio: number | null;
      user_sentiment: string | null;
      call_duration_seconds: number | null;
      total_tts_calls: number;
      total_stt_calls: number;
      error_count: number;
    }>;

    // Calculate summary statistics
    const avgMosScore = logData.length > 0 ? parseFloat((logData.reduce((sum, l) => sum + (l.avg_mos_score ?? 0), 0) / logData.length).toFixed(2)) : 0;
    const avgTtfb = logData.length > 0 ? Math.round(logData.reduce((sum, l) => sum + (l.avg_ttfb_ms ?? 0), 0) / logData.length) : 0;
    const totalCalls = logData.reduce((sum, l) => sum + l.total_tts_calls + l.total_stt_calls, 0);
    const totalErrors = logData.reduce((sum, l) => sum + l.error_count, 0);
    const errorRate = totalCalls > 0 ? parseFloat((totalErrors / totalCalls).toFixed(4)) : 0;

    return NextResponse.json({
      logs: logData,
      summary: {
        avg_mos: avgMosScore,
        avg_ttfb: avgTtfb,
        error_rate: errorRate,
        total_calls: totalCalls,
      },
    });
  } catch (error) {
    console.error("[API] voice quality GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const body = await req.json();
    const {
      voice_id,
      tts_model,
      avg_ttfb_ms,
      max_ttfb_ms,
      avg_mos_score,
      audio_glitches,
      barge_in_count,
      silence_ratio,
      user_sentiment,
      call_duration_seconds,
      total_tts_calls,
      total_stt_calls,
      error_count,
      call_session_id,
    } = body;

    if (!voice_id) {
      return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
    }

    const db = getDb();

    const { data: log, error: insertError } = await db
      .from("voice_quality_logs")
      .insert([
        {
          workspace_id: workspaceId,
          voice_id,
          tts_model: tts_model ?? null,
          avg_ttfb_ms: avg_ttfb_ms ?? null,
          max_ttfb_ms: max_ttfb_ms ?? null,
          avg_mos_score: avg_mos_score ?? null,
          audio_glitches: audio_glitches ?? 0,
          barge_in_count: barge_in_count ?? 0,
          silence_ratio: silence_ratio ?? null,
          user_sentiment: user_sentiment ?? null,
          call_duration_seconds: call_duration_seconds ?? null,
          total_tts_calls: total_tts_calls ?? 0,
          total_stt_calls: total_stt_calls ?? 0,
          error_count: error_count ?? 0,
          call_session_id: call_session_id ?? null,
        },
      ])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("[API] voice quality POST error:", insertError);
      return NextResponse.json({ error: "Failed to record quality log" }, { status: 500 });
    }
    if (!log) {
      return NextResponse.json({ error: "Failed to record quality log" }, { status: 500 });
    }

    return NextResponse.json({ id: log.id }, { status: 201 });
  } catch (error) {
    console.error("[API] voice quality POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
