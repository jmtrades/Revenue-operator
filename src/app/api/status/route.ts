/**
 * Public status endpoint — simplified shape for embedding in external status
 * pages, marketing sites, or customer dashboards. No PII; no workspace data.
 *
 * Unlike /api/health (deep probe, uncached), this response is cached at the
 * edge for 10 seconds to survive traffic spikes without hammering upstreams.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

const PROBE_TIMEOUT_MS = 2_500;

async function quickCheck(fn: () => Promise<boolean>, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  try {
    const timed = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs),
    );
    return await Promise.race([fn(), timed]);
  } catch {
    return false;
  }
}

export async function GET() {
  const [apiOk, dbOk] = await Promise.all([
    // API itself is obviously up if we got here.
    Promise.resolve(true),
    quickCheck(async () => {
      const db = getDb();
      const { error } = await db.from("workspaces").select("id").limit(1);
      return !error;
    }),
  ]);

  const operational = apiOk && dbOk;

  return NextResponse.json(
    {
      status: operational ? "operational" : "degraded",
      components: {
        api: apiOk ? "operational" : "degraded",
        database: dbOk ? "operational" : "degraded",
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: operational ? 200 : 503,
      headers: {
        // Edge-cache for 10s — enough to absorb traffic spikes without returning
        // stale data to anyone watching for incidents.
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    },
  );
}
