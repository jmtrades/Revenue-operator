/**
 * Cron: process pending CRM sync queue jobs (Task 19).
 * Run every 1–2 min (e.g. via /api/cron/core). Uses getDb() (service role when set) so all workspaces' jobs are processed.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getPendingSyncJobs, processSyncJob } from "@/lib/integrations/sync-engine";

const BATCH_SIZE = 20;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const jobs = await getPendingSyncJobs(BATCH_SIZE);
  let processed = 0;
  for (const job of jobs) {
    const result = await processSyncJob(job.id);
    if (result.ok) processed += 1;
  }

  return NextResponse.json({ ok: true, processed, total: jobs.length });
}
