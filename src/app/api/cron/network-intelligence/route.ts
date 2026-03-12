/**
 * Cron: Nightly network intelligence aggregation
 * Call via cron (e.g. 2am): GET /api/cron/network-intelligence
 * Updates network_patterns by industry bucket.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runNetworkIntelligenceJob } from "@/lib/network-intelligence/job";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  try {
    await runNetworkIntelligenceJob();
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Error response below
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
