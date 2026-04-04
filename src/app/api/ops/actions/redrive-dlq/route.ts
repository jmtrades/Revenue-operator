/**
 * Ops: Re-drive DLQ (re-queue failed jobs)
 * Optionally filter by workspace_id from job payload.
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

  let body: { workspace_id?: string; job_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  let query = db.from("job_queue").select("id, payload, job_type").in("status", ["failed", "dlq"]);
  if (body.job_ids?.length) {
    query = query.in("id", body.job_ids);
  }
  const { data: jobs } = await query.limit(50);

  let redriven = 0;
  for (const j of jobs ?? []) {
    const r = j as { id: string; payload: Record<string, unknown>; job_type: string };
    const p = r.payload ?? {};
    const workspaceId = p.workspace_id as string | undefined;
    if (body.workspace_id && workspaceId !== body.workspace_id) continue;

    const type = (r.job_type ?? p.type) as string;
    if (type === "process_webhook" && p.webhookId) {
      // When DOCTRINE_ENFORCED=1, cron will run convertLegacyWebhookToSignalAndEnqueue (no legacy path).
      await enqueue({ type: "process_webhook", webhookId: p.webhookId as string });
    } else if (type === "decision" && p.leadId && p.workspaceId) {
      await enqueue({ type: "decision", leadId: p.leadId as string, workspaceId: p.workspaceId as string, eventId: (p.eventId as string) ?? (p.leadId as string) });
    } else if (type === "reactivation" && p.leadId) {
      await enqueue({ type: "reactivation", leadId: p.leadId as string });
    } else continue;

    const { error: updateErr } = await db.from("job_queue").update({ status: "pending", error: null }).eq("id", r.id);
    if (!updateErr) redriven++;
  }

  await logStaffAction(
    session.id,
    "redrive_dlq",
    { workspace_id: body.workspace_id, redriven },
    body.workspace_id ?? undefined
  );

  return NextResponse.json({ ok: true, redriven });
}
