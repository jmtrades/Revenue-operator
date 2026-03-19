/**
 * Voice Usage Analytics API
 * GET: Get voice usage stats for workspace
 * POST: Record voice usage event
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

    // Get optional date range filters
    const startDate = req.nextUrl.searchParams.get("start_date");
    const endDate = req.nextUrl.searchParams.get("end_date");

    let query = db
      .from("voice_usage")
      .select("id, voice_id, tts_model, created_at, input_chars, audio_duration_ms, ttfb_ms, total_latency_ms, cost_cents, error")
      .eq("workspace_id", workspaceId);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: usage, error } = await query.order("created_at", { ascending: false }).limit(1000);

    if (error) {
      console.error("[API] voice usage GET error:", error);
      return NextResponse.json({ error: "Failed to fetch usage data" }, { status: 500 });
    }

    const usageData = (usage ?? []) as Array<{
      id: string;
      voice_id: string;
      tts_model: string;
      created_at: string;
      input_chars: number;
      audio_duration_ms: number;
      ttfb_ms: number | null;
      total_latency_ms: number | null;
      cost_cents: number;
      error: string | null;
    }>;

    // Calculate summary statistics
    const totalCostCents = usageData.reduce((sum, u) => sum + u.cost_cents, 0);
    const totalDurationMs = usageData.reduce((sum, u) => sum + u.audio_duration_ms, 0);
    const totalCalls = usageData.length;
    const avgTtfbMs = usageData.length > 0 ? Math.round(usageData.reduce((sum, u) => sum + (u.ttfb_ms ?? 0), 0) / usageData.length) : 0;

    // Group by date, voice_id, and tts_model
    const grouped = usageData.reduce(
      (acc, u) => {
        const date = new Date(u.created_at).toISOString().split("T")[0];
        const key = `${date}-${u.voice_id}-${u.tts_model}`;

        if (!acc[key]) {
          acc[key] = {
            date,
            voice_id: u.voice_id,
            tts_model: u.tts_model,
            call_count: 0,
            total_cost_cents: 0,
            total_duration_ms: 0,
            avg_ttfb_ms: 0,
            error_count: 0,
          };
        }

        acc[key].call_count += 1;
        acc[key].total_cost_cents += u.cost_cents;
        acc[key].total_duration_ms += u.audio_duration_ms;
        acc[key].avg_ttfb_ms += u.ttfb_ms ?? 0;
        if (u.error) acc[key].error_count += 1;

        return acc;
      },
      {} as Record<
        string,
        {
          date: string;
          voice_id: string;
          tts_model: string;
          call_count: number;
          total_cost_cents: number;
          total_duration_ms: number;
          avg_ttfb_ms: number;
          error_count: number;
        }
      >
    );

    // Convert to array and calculate averages
    const usageByGroup = Object.values(grouped).map((g) => ({
      ...g,
      avg_ttfb_ms: g.call_count > 0 ? Math.round(g.avg_ttfb_ms / g.call_count) : 0,
    }));

    return NextResponse.json({
      usage: usageByGroup,
      summary: {
        total_cost_cents: totalCostCents,
        total_duration_ms: totalDurationMs,
        total_calls: totalCalls,
        avg_ttfb_ms: avgTtfbMs,
      },
    });
  } catch (error) {
    console.error("[API] voice usage GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      input_chars,
      audio_duration_ms,
      ttfb_ms,
      total_latency_ms,
      cost_cents,
      emotion_used,
      industry,
      sample_rate,
      was_streaming,
      error,
      call_session_id,
    } = body;

    if (!voice_id || !tts_model) {
      return NextResponse.json({ error: "voice_id and tts_model are required" }, { status: 400 });
    }

    const db = getDb();

    const { data: usage, error: insertError } = await db
      .from("voice_usage")
      .insert([
        {
          workspace_id: workspaceId,
          voice_id,
          tts_model,
          input_chars: input_chars ?? 0,
          audio_duration_ms: audio_duration_ms ?? 0,
          ttfb_ms: ttfb_ms ?? null,
          total_latency_ms: total_latency_ms ?? null,
          cost_cents: cost_cents ?? 0,
          emotion_used: emotion_used ?? null,
          industry: industry ?? null,
          sample_rate: sample_rate ?? 24000,
          was_streaming: was_streaming ?? false,
          error: error ?? null,
          call_session_id: call_session_id ?? null,
        },
      ])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("[API] voice usage POST error:", insertError);
      return NextResponse.json({ error: "Failed to record usage" }, { status: 500 });
    }
    if (!usage) {
      return NextResponse.json({ error: "Failed to record usage" }, { status: 500 });
    }

    return NextResponse.json({ id: usage.id }, { status: 201 });
  } catch (error) {
    console.error("[API] voice usage POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
