/**
 * GET /api/call-intelligence/coaching/history
 * List past coaching results for workspace.
 * Supports ?call_id= filter and ?limit= pagination.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const callIdFilter = req.nextUrl.searchParams.get("call_id");
  const limitParam = req.nextUrl.searchParams.get("limit");

  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
      limit = parsed;
    }
  }

  try {
    const db = getDb();

    let query = db
      .from("call_coaching_results")
      .select("id, call_id, overall_score, coaching_data, created_at")
      .eq("workspace_id", session.workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply call_id filter if provided
    if (callIdFilter) {
      query = query.eq("call_id", callIdFilter);
    }

    const { data: results, error: queryErr } = await query;

    if (queryErr) {
      log("error", "[coaching-history] Query failed:", { error: queryErr.message });
      return NextResponse.json({ error: "Failed to load coaching history" }, { status: 500 });
    }

    const history = (results ?? []).map((result: { id: string; call_id?: string; overall_score?: number; coaching_data?: Record<string, unknown>; created_at?: string }) => ({
      id: result.id,
      call_id: result.call_id || null,
      overall_score: result.overall_score || 0,
      coaching_points_count: Array.isArray((result.coaching_data as Record<string, unknown>)?.coaching_points)
        ? ((result.coaching_data as Record<string, unknown>)?.coaching_points as unknown[]).length
        : 0,
      created_at: result.created_at,
    }));

    return NextResponse.json({
      ok: true,
      count: history.length,
      results: history,
    });
  } catch (err) {
    log("error", "[coaching-history] Unexpected error:", { error: err });
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
