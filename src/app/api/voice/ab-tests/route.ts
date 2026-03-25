/**
 * Voice A/B Testing API
 * GET: List A/B tests for workspace
 * POST: Create new A/B test
 * PATCH: Update A/B test (declare winner, change status)
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

    const { data: tests, error } = await db
      .from("voice_ab_tests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API] voice ab-tests GET error:", error);
      return NextResponse.json({ error: "Failed to fetch A/B tests" }, { status: 500 });
    }

    return NextResponse.json({ tests: tests ?? [] });
  } catch (error) {
    console.error("[API] voice ab-tests GET error:", error);
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
    const { name, voice_a, voice_b, traffic_split, start_date, end_date } = body;

    if (!name || !voice_a || !voice_b) {
      return NextResponse.json({ error: "name, voice_a, and voice_b are required" }, { status: 400 });
    }

    const db = getDb();

    const { data: test, error: insertError } = await db
      .from("voice_ab_tests")
      .insert([
        {
          workspace_id: workspaceId,
          name,
          voice_a,
          voice_b,
          traffic_split: traffic_split ?? 0.5,
          status: "draft",
          start_date: start_date ?? null,
          end_date: end_date ?? null,
          total_calls_a: 0,
          total_calls_b: 0,
          avg_satisfaction_a: 0,
          avg_satisfaction_b: 0,
          conversion_rate_a: 0,
          conversion_rate_b: 0,
          winner: null,
        },
      ])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("[API] voice ab-tests POST error:", insertError);
      return NextResponse.json({ error: "Failed to create A/B test" }, { status: 500 });
    }
    if (!test) {
      return NextResponse.json({ error: "Failed to create A/B test" }, { status: 500 });
    }

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error("[API] voice ab-tests POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const body = await req.json();
    const { id, status, winner, total_calls_a, total_calls_b, avg_satisfaction_a, avg_satisfaction_b, conversion_rate_a, conversion_rate_b } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = getDb();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (winner !== undefined) updateData.winner = winner;
    if (total_calls_a !== undefined) updateData.total_calls_a = total_calls_a;
    if (total_calls_b !== undefined) updateData.total_calls_b = total_calls_b;
    if (avg_satisfaction_a !== undefined) updateData.avg_satisfaction_a = avg_satisfaction_a;
    if (avg_satisfaction_b !== undefined) updateData.avg_satisfaction_b = avg_satisfaction_b;
    if (conversion_rate_a !== undefined) updateData.conversion_rate_a = conversion_rate_a;
    if (conversion_rate_b !== undefined) updateData.conversion_rate_b = conversion_rate_b;
    updateData.updated_at = new Date().toISOString();

    const { data: test, error: updateError } = await db
      .from("voice_ab_tests")
      .update(updateData)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[API] voice ab-tests PATCH error:", updateError);
      return NextResponse.json({ error: "Failed to update A/B test" }, { status: 500 });
    }

    if (!test) {
      return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("[API] voice ab-tests PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
