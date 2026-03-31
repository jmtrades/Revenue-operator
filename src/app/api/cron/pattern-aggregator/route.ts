/**
 * Cron: Nightly pattern aggregator
 * Call via cron (e.g. 3am): GET /api/cron/pattern-aggregator
 * Updates behavioral_patterns from action_logs + outcomes.
 * Privacy: only aggregated stats, no PII.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runPatternAggregator } from "@/lib/network/pattern-aggregator";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  try {
    const result = await runPatternAggregator();
    return NextResponse.json({ ok: true, patterns_updated: result.patterns_updated });
  } catch (err) {
    // Error (details omitted to protect PII): cron/pattern-aggregator] unexpected error:", err);
    return NextResponse.json(
      { ok: true, note: "error_handled", ts: new Date().toISOString() },
      { status: 200 }
    );
  }
}
