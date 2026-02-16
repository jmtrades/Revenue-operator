/**
 * Cron: Deal Death Detection
 * Scans for silently dying opportunities, records signals, schedules interventions.
 * Run daily e.g. 0 8 * * * (8am)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { detectDealDeath, recordDealDeathSignal } from "@/lib/intelligence/deal-death";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();

  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id, workspace_id")
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const recorded: string[] = [];

  for (const d of deals ?? []) {
    const deal = d as { id: string; lead_id: string; workspace_id: string };
    const signal = await detectDealDeath(deal.workspace_id, deal.id, deal.lead_id);
    if (signal) {
      await recordDealDeathSignal(deal.workspace_id, signal, true);
      recorded.push(deal.id);
    }
  }

  return NextResponse.json({
    ok: true,
    deals_scanned: (deals ?? []).length,
    signals_recorded: recorded.length,
    deal_ids: recorded,
  });
}
