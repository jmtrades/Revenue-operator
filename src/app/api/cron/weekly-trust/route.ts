/**
 * Cron: Weekly trust email.
 * Sends retention anchor email every Monday at 9am.
 * Run: 0 9 * * 1 (or adjust timezone)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyTrustEmails } from "@/lib/email/weekly-trust";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await sendWeeklyTrustEmails();

  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    total: results.length,
    results,
  });
}
