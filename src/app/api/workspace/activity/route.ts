/**
 * GET /api/workspace/activity — List recent audit log entries for the workspace (settings changes).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 30));
  const db = getDb();

  const { data: rows, error } = await db
    .from("audit_log")
    .select("id, action_type, details_json, recorded_at")
    .eq("workspace_id", session.workspaceId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (rows ?? []).map((r: { id: string; action_type: string; details_json?: unknown; recorded_at: string }) => ({
    id: r.id,
    action_type: r.action_type,
    details: r.details_json ?? {},
    recorded_at: r.recorded_at,
  }));

  return NextResponse.json({ entries });
}
