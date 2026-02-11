/**
 * Conversations and future calls that will stop receiving attention when trial ends
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: leads } = await db
    .from("leads")
    .select("id, name, email, company")
    .eq("workspace_id", workspaceId)
    .neq("opt_out", true)
    .in("state", ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED", "REACTIVATE"])
    .order("last_activity_at", { ascending: false })
    .limit(10);

  const conversations = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).map(
    (l) => ({
      id: l.id,
      name: l.name ?? l.email ?? "Unknown",
      company: l.company,
    })
  );

  const { data: bookedDeals } = await db
    .from("deals")
    .select("id, lead_id, value_cents")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const leadIds = [...new Set((bookedDeals ?? []).map((d: { lead_id: string }) => d.lead_id))];
  const { data: dealLeads } = leadIds.length
    ? await db.from("leads").select("id, name, email, company").in("id", leadIds)
    : { data: [] };
  const leadMap = ((dealLeads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).reduce(
    (acc, l) => { acc[l.id] = l; return acc; },
    {} as Record<string, { name?: string; email?: string; company?: string }>
  );

  const future_calls = ((bookedDeals ?? []) as { id: string; lead_id: string; value_cents?: number }[]).map((d) => {
    const l = leadMap[d.lead_id];
    return {
      deal_id: d.id,
      lead_id: d.lead_id,
      name: l?.name ?? l?.email ?? "Unknown",
      company: l?.company,
      value_cents: d.value_cents ?? 0,
    };
  });

  return NextResponse.json({ conversations, future_calls });
}
