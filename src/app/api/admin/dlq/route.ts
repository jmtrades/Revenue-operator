/**
 * DLQ: list failed jobs, re-drive.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";

const ADMIN_SECRET = process.env.CRON_SECRET ?? process.env.ADMIN_SECRET;

function auth(req: NextRequest): boolean {
  if (!ADMIN_SECRET) return true;
  return req.headers.get("authorization") === `Bearer ${ADMIN_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const { data } = await db
    .from("job_queue")
    .select("id, job_type, payload, error, created_at")
    .in("status", ["failed", "dlq"])
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { job_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const db = getDb();
  const { data: job } = await db
    .from("job_queue")
    .select("payload, job_type")
    .eq("id", body.job_id)
    .in("status", ["failed", "dlq"])
    .single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const p = (job.payload ?? {}) as { type?: string; webhookId?: string; leadId?: string; workspaceId?: string; eventId?: string };
  if (p.type === "process_webhook" && p.webhookId) {
    // When DOCTRINE_ENFORCED=1, cron will convert to signal and enqueue process_signal.
    await enqueue({ type: "process_webhook", webhookId: p.webhookId });
  } else if (p.type === "decision" && p.leadId && p.workspaceId) {
    await enqueue({ type: "decision", leadId: p.leadId, workspaceId: p.workspaceId, eventId: p.eventId ?? p.leadId });
  } else {
    return NextResponse.json({ error: "Unknown job type" }, { status: 400 });
  }
  await db.from("job_queue").update({ status: "pending", error: null }).eq("id", body.job_id);
  return NextResponse.json({ ok: true, job_id: body.job_id });
}
