/**
 * Cron: daily trust email — "X conversations didn't go quiet today"
 * Run once per day, e.g. 18 * * * * (6pm)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendDailyTrustEmails } from "@/lib/email/daily-trust";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await sendDailyTrustEmails();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
