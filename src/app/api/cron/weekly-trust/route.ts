/**
 * Cron: Weekly trust email.
 * Sends retention anchor email every Monday at 9am.
 * Run: 0 9 * * 1 (or adjust timezone)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { sendWeeklyTrustEmails } from "@/lib/email/weekly-trust";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

async function getHandler(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await sendWeeklyTrustEmails();

  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    total: results.length,
    results,
  });
}

export const GET = withErrorHandling(getHandler);
