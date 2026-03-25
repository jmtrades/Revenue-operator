/**
 * Ops: Run recovery sweep for workspace
 * Enqueues reactivation jobs for eligible leads.
 * Requires staff write access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { requireStaffWriteAccess, logStaffAction } from "@/lib/ops/auth";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await requireStaffWriteAccess().catch((r) => r as Response);
  if (session instanceof Response) return session;

  let body: { workspace_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: leads } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("state", ["REACTIVATE", "CONTACTED", "ENGAGED"])
    .eq("opt_out", false);

  let enqueued = 0;
  for (const l of leads ?? []) {
    await enqueue({ type: "reactivation", leadId: (l as { id: string }).id });
    enqueued++;
  }

  await logStaffAction(session.id, "run_recovery_sweep", { workspace_id: workspaceId, enqueued }, workspaceId);

  return NextResponse.json({ ok: true, enqueued });
}
