/**
 * Speed-to-lead: call new leads within ~60 seconds.
 * Runs every minute via Vercel cron. Finds leads created in the last 90s with a phone number
 * and no existing call_session, then triggers one outbound call per lead (idempotent per lead).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { executeLeadOutboundCall } from "@/lib/outbound/execute-lead-call";

const NEW_LEAD_WINDOW_SEC = 90;
const MAX_CALLS_PER_RUN = 10;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const cutoff = new Date(Date.now() - NEW_LEAD_WINDOW_SEC * 1000).toISOString();

  type LeadRow = { id: string; workspace_id: string; phone: string | null };
  let recentLeads: LeadRow[] = [];
  try {
    const { data, error } = await db
      .from("leads")
      .select("id, workspace_id, phone, created_at")
      .gte("created_at", cutoff)
      .not("phone", "is", null)
      .limit(MAX_CALLS_PER_RUN * 2);
    if (error) throw error;
    recentLeads = (data ?? []) as LeadRow[];
  } catch (err) {
    // Error (details omitted to protect PII): speed-to-lead] Error fetching leads:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "Failed to fetch leads" }, { status: 500 });
  }

  if (recentLeads.length === 0) {
    return NextResponse.json({ ok: true, called: 0 });
  }

  const leadIds = recentLeads.map((l) => l.id).filter(Boolean);
  if (leadIds.length === 0) return NextResponse.json({ ok: true, called: 0 });

  const { data: existingSessions } = await db
    .from("call_sessions")
    .select("lead_id")
    .in("lead_id", leadIds);

  const calledLeadIds = new Set((existingSessions ?? []).map((s: { lead_id: string }) => s.lead_id));
  const candidates = recentLeads.filter(
    (l) => !calledLeadIds.has(l.id) && l.phone && String(l.phone).replace(/\D/g, "").length >= 10
  ).slice(0, MAX_CALLS_PER_RUN);

  if (candidates.length === 0) return NextResponse.json({ ok: true, called: 0 });

  // Only call leads whose workspace has an active phone config
  const workspaceIds = [...new Set(candidates.map((l) => l.workspace_id))];
  const { data: phoneConfigs } = await db
    .from("phone_configs")
    .select("workspace_id")
    .in("workspace_id", workspaceIds)
    .eq("status", "active");

  const activeWorkspaces = new Set((phoneConfigs ?? []).map((p: { workspace_id: string }) => p.workspace_id));
  const toCall = candidates.filter((l) => activeWorkspaces.has(l.workspace_id));

  let called = 0;
  for (const row of toCall) {
    try {
      const result = await executeLeadOutboundCall(row.workspace_id, row.id);
      if (result.ok) called++;
    } catch (err) {
      // Error (details omitted to protect PII): `[speed-to-lead] Failed to call lead ${row.id}:`, err instanceof Error ? err.message : err);
      // Continue to next lead — don't let one failure block others
    }
  }

  return NextResponse.json({ ok: true, called, considered: toCall.length });
}
