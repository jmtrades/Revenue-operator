/**
 * Cron: daily trust email — "X conversations didn't go quiet today"
 * Run once per day, e.g. 18 * * * * (6pm)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendDailyTrustEmails } from "@/lib/email/daily-trust";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await sendDailyTrustEmails();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
