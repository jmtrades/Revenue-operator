/**
 * Cron: operational_presence_daily — once per workspace per local day.
 * Sends "Nothing required today" only when: no handoff in 24h, not paused, no login in 12h, not suppressed.
 * Run every 15 min (e.g. 15 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runOperationalPresenceDaily } from "@/lib/operational-presence/daily";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const results = await runOperationalPresenceDaily();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
