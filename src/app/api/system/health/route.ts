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
  let voice_server_ok = false;
  let voice_checked_at: string | null = null;
  let voice_latency_ms: number | null = null;
  let voice_health: Record<string, unknown> | null = null;
  let voice_status: Record<string, unknown> | null = null;

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

    // Voice server health: doctrine-safe (no secrets), best-effort.
    try {
      const voiceUrl = process.env.VOICE_SERVER_URL;
      if (voiceUrl) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const start = Date.now();
        const resp = await fetch(`${voiceUrl}/health`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        }).catch(() => null);
        if (resp && resp.ok) {
          voice_latency_ms = Date.now() - start;
          voice_health = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
          voice_checked_at = new Date().toISOString();
          voice_server_ok = true;
        }
        clearTimeout(timeout);

        // Pull /status for active sessions + voices (best-effort).
        if (voice_server_ok) {
          const statusResp = await fetch(`${voiceUrl}/status`, {
            method: "GET",
            cache: "no-store",
          }).catch(() => null);
          if (statusResp?.ok) {
            voice_status = (await statusResp.json().catch(() => null)) as Record<string, unknown> | null;
          }
        }
      }
    } catch {
      voice_server_ok = false;
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
    voice_server_ok,
    voice_checked_at,
    voice_latency_ms,
    voice_health,
    voice_status,
  });
}
