/**
 * Campaign execution: process active campaigns (stub — increment called or enqueue outbound).
 * Add to core cron to run periodically.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";

const DAILY_OUTBOUND_LIMITS: Record<string, number> = {
  solo: 100,
  business: 300,
  scale: 1000,
  enterprise: 2500,
};

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;
  const db = getDb();
  let processed = 0;
  let throttledWorkspaces = 0;
  try {
    const { data: active } = await db
      .from("campaigns")
      .select("id, workspace_id, total_contacts, called")
      .eq("status", "active")
      .limit(50);
    const activeRows = (active ?? []) as Array<{
      id: string;
      workspace_id: string;
      total_contacts: number;
      called: number;
    }>;
    if (activeRows.length === 0) {
      return NextResponse.json({ ok: true, processed, throttled_workspaces: throttledWorkspaces });
    }

    const workspaceIds = [...new Set(activeRows.map((r) => r.workspace_id))];
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id, billing_tier")
      .in("id", workspaceIds);
    const tierByWorkspace = new Map(
      ((workspaces ?? []) as Array<{ id: string; billing_tier?: string | null }>).map((w) => [
        w.id,
        (w.billing_tier ?? "solo").toLowerCase(),
      ]),
    );

    const counterDate = new Date().toISOString().slice(0, 10);
    const { data: existingCounters } = await db
      .from("campaign_daily_counters")
      .select("workspace_id, processed_count")
      .eq("counter_date", counterDate)
      .in("workspace_id", workspaceIds);
    const processedByWorkspace = new Map<string, number>(
      ((existingCounters ?? []) as Array<{ workspace_id: string; processed_count: number }>).map((r) => [
        r.workspace_id,
        Number(r.processed_count) || 0,
      ]),
    );

    for (const row of activeRows) {
      const tier = tierByWorkspace.get(row.workspace_id) ?? "solo";
      const dailyCap = DAILY_OUTBOUND_LIMITS[tier] ?? DAILY_OUTBOUND_LIMITS.solo;
      const used = processedByWorkspace.get(row.workspace_id) ?? 0;
      const workspaceRemaining = Math.max(0, dailyCap - used);
      if (workspaceRemaining <= 0) {
        throttledWorkspaces += 1;
        continue;
      }

      const campaignRemaining = Math.max(0, Number(row.total_contacts || 0) - Number(row.called || 0));
      if (campaignRemaining <= 0) continue;

      // Keep each cron tick bounded while honoring workspace-level daily caps.
      const toProcess = Math.min(workspaceRemaining, campaignRemaining, 25);
      if (toProcess <= 0) continue;

      const nextCalled = Number(row.called || 0) + toProcess;
      const { error: updateErr } = await db
        .from("campaigns")
        .update({ called: nextCalled, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (!updateErr) {
        processed += toProcess;
        processedByWorkspace.set(row.workspace_id, used + toProcess);
      }
    }

    const counterRows = [...processedByWorkspace.entries()].map(([workspace_id, count]) => ({
      workspace_id,
      counter_date: counterDate,
      processed_count: count,
      updated_at: new Date().toISOString(),
    }));
    if (counterRows.length > 0) {
      await db
        .from("campaign_daily_counters")
        .upsert(counterRows, { onConflict: "workspace_id,counter_date" });
    }
  } catch {
    // campaigns table may not exist
  }
  return NextResponse.json({ ok: true, processed, throttled_workspaces: throttledWorkspaces });
}
