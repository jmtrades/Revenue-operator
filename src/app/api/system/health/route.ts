/**
 * GET /api/system/health
 * Public, doctrine-safe readiness: ok, core_recent, db_reachable, public_corridor_ok.
 * No secrets, no ids, deterministic defaults on error.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getCronHeartbeats } from "@/lib/runtime/cron-heartbeat";

const CORE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRecent(iso: string | null | undefined, windowMs: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= windowMs;
}

export async function GET(_req: NextRequest) {
  let core_recent = false;
  let db_reachable = false;
  let public_corridor_ok = false;

  try {
    try {
      const heartbeats = await getCronHeartbeats();
      const coreAt = heartbeats["core"] ?? heartbeats["connector-inbox"] ?? null;
      core_recent = isRecent(coreAt, CORE_WINDOW_MS);
    } catch {
      core_recent = false;
    }

    try {
      const db = getDb();
      const { error } = await db.from("workspaces").select("id").limit(1);
      db_reachable = !error;
    } catch {
      db_reachable = false;
    }

    try {
      const db = getDb();
      const { error } = await db.from("shared_transactions").select("id").limit(1);
      public_corridor_ok = !error;
    } catch {
      public_corridor_ok = false;
    }
  } catch {
    core_recent = false;
    db_reachable = false;
    public_corridor_ok = false;
  }

  const ok = core_recent && db_reachable && public_corridor_ok;

  return NextResponse.json({
    ok,
    core_recent,
    db_reachable,
    public_corridor_ok,
  });
}
