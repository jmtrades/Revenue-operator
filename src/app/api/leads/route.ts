/**
 * List leads for workspace
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
    .select("id, name, email, company, state, last_activity_at, opt_out")
    .eq("workspace_id", workspaceId)
    .order("last_activity_at", { ascending: false })
    .limit(100);

  const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
  const { data: deals } = leadIds.length
    ? await db.from("deals").select("lead_id, id, value_cents, status").in("lead_id", leadIds).neq("status", "lost")
    : { data: [] };
  const dealByLead = ((deals ?? []) as { lead_id: string; id: string; value_cents?: number }[]).reduce(
    (acc, d) => { acc[d.lead_id] = d; return acc; },
    {} as Record<string, { id: string; value_cents?: number }>
  );

  const withDeals = (leads ?? []).map((l: { id: string; name?: string; email?: string; company?: string; state: string; last_activity_at: string; opt_out?: boolean }) => ({
    ...l,
    deal_id: dealByLead[l.id]?.id,
    value_cents: dealByLead[l.id]?.value_cents ?? 0,
  }));

  return NextResponse.json({ leads: withDeals });
}
