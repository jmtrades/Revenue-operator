/**
 * Ops: Actionable alerts queue with severity
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireStaffSession, logStaffAction } from "@/lib/ops/auth";

export async function GET() {
  const session = await requireStaffSession().catch((r) => r as Response);
  if (session instanceof Response) return session;

  const db = getDb();
  const { data: alerts } = await db
    .from("ops_alerts")
    .select("id, alert_type, workspace_id, workspace_name, severity, payload, actionable, acknowledged_at, created_at")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  await logStaffAction(session.id, "ops_alerts_view", {});

  return NextResponse.json({ alerts: alerts ?? [] });
}
