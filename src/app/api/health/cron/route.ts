/**
 * Cron health: CRON_SECRET set, and (optional) recent successful process-queue run.
 * JSON only; no UI.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

const RECENT_MINUTES = 15;

export async function GET() {
  const cronSecretSet = !!process.env.CRON_SECRET;
  const out: Record<string, unknown> = {
    cron_secret_set: cronSecretSet,
    timestamp: new Date().toISOString(),
  };

  if (!cronSecretSet) {
    return NextResponse.json(
      { ...out, status: "degraded", message: "CRON_SECRET is not set" },
      { status: 200 }
    );
  }

  try {
    const db = getDb();
    const since = new Date(Date.now() - RECENT_MINUTES * 60 * 1000).toISOString();
    const { data } = await db
      .from("job_queue")
      .select("id")
      .eq("status", "completed")
      .gte("processed_at", since)
      .limit(1)
      .maybeSingle();

    const recentSuccess = !!data;
    out.recent_success = recentSuccess;
    out.recent_minutes = RECENT_MINUTES;
    if (!recentSuccess) {
      out.status = "warning";
      out.message = `No completed job in job_queue in the last ${RECENT_MINUTES} minutes. If using Redis queue this may be expected.`;
    } else {
      out.status = "ok";
    }
  } catch (e) {
    out.status = "error";
    out.recent_success = false;
    out.message = String(e instanceof Error ? e.message : e);
  }

  return NextResponse.json(out, { status: 200 });
}
