/**
 * Cron: daily certainty at 08:00 workspace local. One sentence. No marketing.
 * Run every 15 min (e.g. 0,15,30,45 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runMorningCertaintyCron } from "@/lib/adoption-acceleration/morning-certainty";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runMorningCertaintyCron();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
