/**
 * GET /api/installation/readiness?workspace_id=...
 * Booleans only: communication_connected, calendar_connected, payments_connected, record_connected, system_ready.
 * "Connected" means evidence/data exists in that domain, not OAuth configuration.
 * Requires session and workspace access when session is enabled.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getWorkspaceReadiness } from "@/lib/runtime/workspace-readiness";
import { getDb } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const readiness = await getWorkspaceReadiness(workspaceId);
  const db = getDb();

  const [calendarRow, recordRow] = await Promise.all([
    db.from("bookings").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
    db.from("shared_transactions").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
  ]);

  const communication_connected = readiness.messaging_connected;
  const calendar_connected = !!calendarRow.data;
  const payments_connected = readiness.payments_connected;
  const record_connected = !!recordRow.data;
  const system_ready =
    communication_connected && calendar_connected && payments_connected && record_connected;

  return NextResponse.json({
    communication_connected,
    calendar_connected,
    payments_connected,
    record_connected,
    system_ready,
  });
}
