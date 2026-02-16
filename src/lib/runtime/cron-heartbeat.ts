/**
 * Record cron heartbeat after successful run for /api/health.
 */

import { getDb } from "@/lib/db/queries";

export async function recordCronHeartbeat(jobName: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("system_cron_heartbeats")
    .upsert({ job_name: jobName, last_ran_at: now }, { onConflict: "job_name" });
}

export async function getCronHeartbeats(): Promise<Record<string, string | null>> {
  const db = getDb();
  const { data: rows } = await db
    .from("system_cron_heartbeats")
    .select("job_name, last_ran_at");
  const out: Record<string, string | null> = {};
  for (const r of rows ?? []) {
    const row = r as { job_name: string; last_ran_at: string | null };
    out[row.job_name] = row.last_ran_at ?? null;
  }
  return out;
}
