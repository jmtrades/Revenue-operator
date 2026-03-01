/**
 * GET /api/analytics/summary — Workspace metrics for dashboard.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();
  let calls = 0;
  let appointments = 0;
  let upcoming = 0;
  try {
    const { count: c } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    calls = c ?? 0;
  } catch {
    // ignore
  }
  try {
    const { count: a } = await db.from("appointments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["confirmed"]);
    appointments = a ?? 0;
    const { count: u } = await db.from("appointments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("start_time", new Date().toISOString());
    upcoming = u ?? 0;
  } catch {
    // ignore
  }
  return NextResponse.json({ calls_last_7_days: calls, appointments_total: appointments, appointments_upcoming: upcoming });
}
