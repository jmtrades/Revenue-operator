/**
 * Deal Death Signals
 * Returns opportunities that are silently dying.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { detectDealDeath } from "@/lib/intelligence/deal-death";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const signals: Array<{
    deal_id: string;
    lead_id: string;
    severity: string;
    pattern_matched: string;
    message: string;
    lead?: { name?: string; email?: string; company?: string };
  }> = [];

  for (const d of deals ?? []) {
    const deal = d as { id: string; lead_id: string };
    const signal = await detectDealDeath(workspaceId, deal.id, deal.lead_id);
    if (signal) {
      signals.push({
        deal_id: signal.deal_id,
        lead_id: signal.lead_id,
        severity: signal.severity,
        pattern_matched: signal.pattern_matched,
        message: signal.message,
      });
    }
  }

  const leadIds = signals.map((s) => s.lead_id);
  const { data: leads } = leadIds.length
    ? await db.from("leads").select("id, name, email, company").in("id", leadIds)
    : { data: [] };
  const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).reduce(
    (acc, l) => { acc[l.id] = l; return acc; },
    {} as Record<string, { name?: string; email?: string; company?: string }>
  );

  const withLeads = signals.map((s) => ({ ...s, lead: leadMap[s.lead_id] }));

  return NextResponse.json({ signals: withLeads });
}
