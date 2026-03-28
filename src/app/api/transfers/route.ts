import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export const dynamic = "force-dynamic";

/** List recent call transfers */
export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "7", 10);
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10), 50);

  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    let query = db
      .from("call_transfers")
      .select("id, call_session_id, transfer_type, target_number, target_name, status, initiated_at, completed_at, duration_seconds, reason, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get summary stats
    const { data: statsData } = await db
      .from("call_transfers")
      .select("status, transfer_type")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString());

    const stats = {
      total: (statsData ?? []).length,
      completed: (statsData ?? []).filter((s: Record<string, unknown>) => s.status === "completed").length,
      failed: (statsData ?? []).filter((s: Record<string, unknown>) => s.status === "failed").length,
      in_progress: (statsData ?? []).filter((s: Record<string, unknown>) => s.status === "in_progress").length,
      by_type: {
        cold: (statsData ?? []).filter((s: Record<string, unknown>) => s.transfer_type === "cold").length,
        warm: (statsData ?? []).filter((s: Record<string, unknown>) => s.transfer_type === "warm").length,
        conference: (statsData ?? []).filter((s: Record<string, unknown>) => s.transfer_type === "conference").length,
      },
    };

    return NextResponse.json({
      transfers: (data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id,
        call_session_id: t.call_session_id,
        transfer_type: t.transfer_type ?? "cold",
        target_number: t.target_number ?? "",
        target_name: t.target_name ?? "Unknown",
        status: t.status ?? "pending",
        initiated_at: t.initiated_at ?? t.created_at,
        completed_at: t.completed_at ?? null,
        duration_seconds: t.duration_seconds ?? 0,
        reason: t.reason ?? "",
        created_at: t.created_at,
      })),
      stats,
    });
  } catch (err) {
    log("error", "api.transfers.list_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to list transfers" }, { status: 500 });
  }
}
