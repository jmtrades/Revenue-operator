/**
 * Cron: Nightly network intelligence aggregation
 * Call via cron (e.g. 2am): GET /api/cron/network-intelligence
 * Updates network_patterns by industry bucket.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runNetworkIntelligenceJob } from "@/lib/network-intelligence/job";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runNetworkIntelligenceJob();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[network-intelligence]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
