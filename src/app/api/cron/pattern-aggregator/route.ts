/**
 * Cron: Nightly pattern aggregator
 * Call via cron (e.g. 3am): GET /api/cron/pattern-aggregator
 * Updates behavioral_patterns from action_logs + outcomes.
 * Privacy: only aggregated stats, no PII.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runPatternAggregator } from "@/lib/network/pattern-aggregator";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPatternAggregator();
    return NextResponse.json({ ok: true, patterns_updated: result.patterns_updated });
  } catch (err) {
    console.error("[pattern-aggregator]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
