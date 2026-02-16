/**
 * Cron: silence defines completion — when handoffs go to zero, send "Nothing else requires review."
 * Run every 15–30 min (cron: 15 * * * * or 30 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runSilenceDefinesCompletion } from "@/lib/organizational-embedding";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runSilenceDefinesCompletion();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
