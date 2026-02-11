/**
 * Ops Dashboard API
 * Staff-only. Global visibility across customers.
 * All ops routes require staff session — no OPS_SECRET fallback.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireStaffSession, logStaffAction } from "@/lib/ops/auth";

export async function GET() {
  const session = await requireStaffSession().catch((r) => r as Response);
  if (session instanceof Response) return session;

  const db = getDb();

  const { count: activeCount } = await db
    .from("workspaces")
    .select("id", { count: "exact", head: true });

  let atRiskCount = 0;
  try {
    const { count } = await db
      .from("workspace_health")
      .select("id", { count: "exact", head: true })
      .lt("health_score", 50);
    atRiskCount = count ?? 0;
  } catch {
    // workspace_health may be empty
  }

  let unackCount = 0;
  let recentAlerts: unknown[] = [];
  try {
    const { data: unackAlerts } = await db
      .from("ops_alerts")
      .select("id")
      .is("acknowledged_at", null);
    unackCount = unackAlerts?.length ?? 0;

    const { data: alerts } = await db
      .from("ops_alerts")
      .select("alert_type, workspace_id, severity, created_at, workspace_name, actionable")
      .order("created_at", { ascending: false })
      .limit(10);
    recentAlerts = alerts ?? [];
  } catch {
    // ops_alerts may not exist yet
  }

  await logStaffAction(session.id, "ops_dashboard_view", { view: "dashboard" });

  return NextResponse.json({
    active_workspaces: activeCount ?? 0,
    at_risk_customers: atRiskCount,
    unack_alerts: unackCount,
    recent_alerts: recentAlerts,
  });
}
