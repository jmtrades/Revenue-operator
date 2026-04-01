/**
 * Cron: process pending CRM sync queue jobs (Task 19).
 * Run every 1–2 min (e.g. via /api/cron/core). Uses getDb() (service role when set) so all workspaces' jobs are processed.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getPendingSyncJobs, processSyncJob } from "@/lib/integrations/sync-engine";
import { log } from "@/lib/logger";

const BATCH_SIZE = 20;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  let jobs: Awaited<ReturnType<typeof getPendingSyncJobs>> = [];
  try {
    jobs = await getPendingSyncJobs(BATCH_SIZE);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "cron.process-sync-queue.fetch-failed", { error: msg });
    return NextResponse.json({ ok: false, error: msg, processed: 0, total: 0 });
  }

  if (jobs.length > 0) {
    log("info", "cron/process-sync-queue.pending", { count: jobs.length });
  }

  let processed = 0;
  const errors: string[] = [];
  for (const job of jobs) {
    const result = await processSyncJob(job.id);
    if (result.ok) {
      processed += 1;
    } else {
      errors.push(`${job.id}: ${result.error}`);
      log("error", "cron.process-sync-queue.job-failed", { jobId: job.id, error: result.error });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    processed,
    total: jobs.length,
    ...(errors.length > 0 && { errors: errors.slice(0, 5) }),
  });
}
