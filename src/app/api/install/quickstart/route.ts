/**
 * POST /api/install/quickstart
 * Creates or ensures workspace readiness state, owner identity, connectors baseline.
 * Returns { ok: true } only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { ensureWorkspaceInstallationState } from "@/lib/installation";
import { getWorkspaceReadiness } from "@/lib/runtime/workspace-readiness";
import { ensureInstallationState } from "@/lib/adoption-acceleration/installation-state";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  if (!workspaceId || typeof workspaceId !== "string") {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  await ensureWorkspaceInstallationState(workspaceId).catch((err) => { console.error("[install/quickstart] error:", err instanceof Error ? err.message : err); });
  const readiness = await getWorkspaceReadiness(workspaceId);
  await ensureInstallationState(workspaceId, {
    messagingConnected: readiness.messaging_connected,
    paymentsConnected: readiness.payments_connected,
  }).catch((err) => { console.error("[install/quickstart] error:", err instanceof Error ? err.message : err); });

  return NextResponse.json({ ok: true });
}
