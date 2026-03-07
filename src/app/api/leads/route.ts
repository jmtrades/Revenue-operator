/**
 * List leads for workspace (GET). Create a lead (POST).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

function leadScoreFromInput(input: { name?: string; phone?: string; email?: string; service_requested?: string; source?: string }): number {
  let score = 0;
  if (input.name?.trim()) score += 10;
  if (input.phone?.trim()) score += 20;
  if (input.email?.trim()) score += 10;
  if (input.service_requested?.trim()) score += 15;
  const src = (input.source ?? "").toLowerCase();
  if (src === "inbound_call") score += 15;
  else if (src === "website") score += 10;
  else if (src === "referral") score += 20;
  return Math.min(100, score);
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: leads } = await db
    .from("leads")
    .select("id, name, email, phone, company, state, last_activity_at, opt_out, metadata")
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

  const withDeals = (leads ?? []).map((l: { id: string; name?: string; email?: string; phone?: string; company?: string; state: string; last_activity_at: string; opt_out?: boolean; metadata?: Record<string, unknown> }) => ({
    ...l,
    deal_id: dealByLead[l.id]?.id,
    value_cents: dealByLead[l.id]?.value_cents ?? 0,
  }));

  return NextResponse.json({ leads: withDeals });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: { name: string; phone?: string; email?: string; service_requested?: string; source?: string; status?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, phone, email, service_requested, source, status, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const phoneStr = (phone ?? "").toString().trim();
  if (!phoneStr) return NextResponse.json({ error: "Phone is required" }, { status: 400 });

  const state = (status ?? "new").toLowerCase().replace(/\s+/g, "_");
  const stateMap: Record<string, string> = {
    new: "new",
    contacted: "contacted",
    qualified: "qualified",
    appointment_set: "appointment_set",
    won: "won",
    lost: "lost",
  };
  const dbState = stateMap[state] ?? "new";

  const score = leadScoreFromInput({ name, phone: phoneStr, email, service_requested, source });
  const metadata: Record<string, unknown> = {
    source: (source ?? "other").trim() || "other",
    service_requested: (service_requested ?? "").trim() || null,
    notes: (notes ?? "").trim() || null,
    score,
  };

  const db = getDb();
  const { data: lead, error } = await db
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      name: name.trim(),
      phone: phoneStr,
      email: (email ?? "").trim() || null,
      company: (service_requested ?? "").trim() || null,
      state: dbState,
      metadata,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(lead);
}
