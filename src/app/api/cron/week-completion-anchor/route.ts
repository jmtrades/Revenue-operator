/**
 * Cron: Friday at business close + 45 min, no unresolved handoffs → "This week concluded normally."
 * Run every 15 min (cron: 15 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runWeekCompletionAnchor } from "@/lib/temporal-anchoring";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runWeekCompletionAnchor();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
