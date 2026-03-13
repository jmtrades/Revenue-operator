/**
 * Record that the user has seen the healthy view (update last_seen_healthy_at).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("operational_view_memory")
    .upsert({ workspace_id: workspaceId, last_seen_healthy_at: now }, { onConflict: "workspace_id" });

  return NextResponse.json({ ok: true });
}
