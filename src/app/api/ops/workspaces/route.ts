/**
 * Ops: List workspaces with health (reason_codes, last_seen_at, integration_status)
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireStaffSession, logStaffAction } from "@/lib/ops/auth";

export async function GET() {
  const session = await requireStaffSession().catch((r) => r as Response);
  if (session instanceof Response) return session;

  const db = getDb();
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, name, status, created_at");

  const { data: healthRows } = await db
    .from("workspace_health")
    .select("workspace_id, health_score, reason_codes, last_seen_at, integration_status");

  const healthByWs = new Map(
    (healthRows ?? []).map((h) => [
      (h as { workspace_id: string }).workspace_id,
      h as { health_score?: number; reason_codes?: string[]; last_seen_at?: string; integration_status?: Record<string, unknown> },
    ])
  );

  const { data: zoomRows } = await db.from("zoom_accounts").select("workspace_id");
  const zoomConnected = new Set((zoomRows ?? []).map((z) => (z as { workspace_id: string }).workspace_id));

  const list = (workspaces ?? []).map((w) => {
    const h = healthByWs.get((w as { id: string }).id);
    const hasZoom = zoomConnected.has((w as { id: string }).id);
    return {
      id: (w as { id: string }).id,
      name: (w as { name?: string }).name,
      status: (w as { status?: string }).status,
      created_at: (w as { created_at?: string }).created_at,
      health_score: h?.health_score ?? null,
      reason_codes: h?.reason_codes ?? [],
      last_seen_at: h?.last_seen_at ?? null,
      integration_status: { ...(h?.integration_status ?? {}), zoom: hasZoom },
    };
  });

  await logStaffAction(session.id, "ops_workspaces_view", {});

  return NextResponse.json({ workspaces: list });
}
