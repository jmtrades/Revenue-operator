/**
 * Active handoffs: responsibility transfers requiring human judgment.
 * Returns who, when, decision needed, lead_id. No chat/message preview.
 * Optionally returns beyond_scope when engine is not in scope (institutional only; no tier/plan).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

function decisionNeededLabel(reason: string): string {
  const labels: Record<string, string> = {
    high_deal_value: "High-value decision",
    vip_lead: "VIP lead",
    anger_detected: "Sensitive response needed",
    negotiation_attempt: "Negotiation",
    policy_sensitive: "Policy-sensitive",
    autonomy_assist_approval_required: "Approval needed",
    emotional_complexity: "Judgment needed",
    guarantee_stagnation: "Progress stalled — needs human follow-through",
  };
  return labels[reason] ?? reason.replace(/_/g, " ");
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const now = new Date().toISOString();
  const { data: rows } = await db
    .from("escalation_logs")
    .select("id, lead_id, escalation_reason, created_at")
    .eq("workspace_id", workspaceId)
    .eq("holding_message_sent", true)
    .not("hold_until", "is", null)
    .gt("hold_until", now)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!rows?.length) {
    return NextResponse.json({ handoffs: [] });
  }

  const leadIds = [...new Set((rows as { lead_id: string }[]).map((r) => r.lead_id))];
  const { data: leads } = await db.from("leads").select("id, name, email").in("id", leadIds);
  const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string }[]).reduce(
    (acc, l) => {
      acc[l.id] = l.name ?? l.email ?? "Lead";
      return acc;
    },
    {} as Record<string, string>
  );

  const handoffs = (rows as { id: string; lead_id: string; escalation_reason: string; created_at: string }[]).map((r) => ({
    id: r.id,
    lead_id: r.lead_id,
    who: leadMap[r.lead_id] ?? "Lead",
    when: r.created_at,
    decision_needed: decisionNeededLabel(r.escalation_reason),
  }));

  let beyond_scope = false;
  try {
    const { isEngineAllowedForWorkspace } = await import("@/lib/operational-engines");
    const allowed = await isEngineAllowedForWorkspace(workspaceId, "commitment_reliability");
    beyond_scope = !allowed;
  } catch {
    // default: within scope
  }

  return NextResponse.json({ handoffs, beyond_scope });
}
