/**
 * Pipeline: leads by state with deal info
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
    .select("id, name, email, company, state, last_activity_at")
    .eq("workspace_id", workspaceId)
    .order("last_activity_at", { ascending: false });

  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id, value_cents, status")
    .eq("workspace_id", workspaceId);

  const dealsByLead = (deals ?? []).reduce(
    (acc: Record<string, { id: string; value_cents: number; status: string }[]>, d: { lead_id: string; id: string; value_cents: number; status: string }) => {
      if (!acc[d.lead_id]) acc[d.lead_id] = [];
      acc[d.lead_id].push(d);
      return acc;
    },
    {}
  );

  const pipeline = (leads ?? []).map((l: { id: string; name: string | null; email: string | null; company: string | null; state: string; last_activity_at: string }) => ({
    ...l,
    deals: dealsByLead[l.id] ?? [],
  }));

  const byState = pipeline.reduce(
    (acc: Record<string, typeof pipeline>, p: { state: string }) => {
      if (!acc[p.state]) acc[p.state] = [];
      acc[p.state].push(p as (typeof pipeline)[number]);
      return acc;
    },
    {} as Record<string, typeof pipeline>
  );

  return NextResponse.json({ pipeline, by_state: byState });
}
