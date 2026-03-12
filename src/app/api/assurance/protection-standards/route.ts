/**
 * Protection standards: operational guarantees + violations.
 * User sees what we promise and when we fell short.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const STANDARDS = [
  { id: "uninterested", label: "Will not message uninterested leads", description: "We respect opt-out and low-interest signals." },
  { id: "hours", label: "Will not send outside configured hours", description: "All outreach within business hours." },
  { id: "sentiment", label: "Stops after negative sentiment", description: "We hold back when sentiment is negative." },
  { id: "sensitive", label: "Escalates sensitive conversations", description: "Pricing, legal, high-stakes flagged for you." },
] as const;

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const violations: Array<{ standard_id: string; when: string; detail: string; lead_id?: string }> = [];

  const { data: settings } = await db.from("settings").select("business_hours, min_message_interval_sec").eq("workspace_id", workspaceId).single();
  const bh = (settings as { business_hours?: { start?: string; end?: string; timezone?: string } })?.business_hours ?? {};
  const startHour = parseInt(String(bh.start ?? "09:00").split(":")[0], 10);
  const endHour = parseInt(String(bh.end ?? "17:00").split(":")[0], 10);

  const { data: sentActions } = await db
    .from("action_logs")
    .select("entity_id, action, payload, created_at")
    .eq("workspace_id", workspaceId)
    .in("action", ["send_message", "simulated_send_message"])
    .gte("created_at", weekStart.toISOString());

  const leadIds = [...new Set((sentActions ?? []).map((a: { entity_id: string }) => a.entity_id))];
  const { data: leads } = leadIds.length
    ? await db.from("leads").select("id, opt_out").in("id", leadIds)
    : { data: [] };
  const optOutSet = new Set(((leads ?? []) as { id: string; opt_out?: boolean }[]).filter((l) => l.opt_out).map((l) => l.id));

  for (const a of sentActions ?? []) {
    const act = a as { entity_id: string; action: string; created_at: string; payload?: { simulated?: boolean } };
    if (act.payload?.simulated) continue;
    if (optOutSet.has(act.entity_id)) {
      violations.push({
        standard_id: "uninterested",
        when: act.created_at,
        detail: "Message sent to opted-out lead",
        lead_id: act.entity_id,
      });
    }
    const created = new Date(act.created_at);
    const hour = created.getUTCHours();
    if (hour < startHour || hour > endHour) {
      violations.push({
        standard_id: "hours",
        when: act.created_at,
        detail: `Send at ${created.toISOString()} outside business hours`,
        lead_id: act.entity_id,
      });
    }
  }

  const { data: restraintActions } = await db
    .from("action_logs")
    .select("entity_id, payload, created_at")
    .eq("workspace_id", workspaceId)
    .in("action", ["restraint", "escalation_suggest"])
    .gte("created_at", weekStart.toISOString());

  const standards_with_status = STANDARDS.map((s) => {
    const vs = violations.filter((v) => v.standard_id === s.id);
    return {
      ...s,
      status: vs.length > 0 ? "violated" : "met",
      violations: vs,
    };
  });

  return NextResponse.json({
    standards: standards_with_status,
    violations,
    restraint_actions_count: (restraintActions ?? []).length,
    summary: {
      total_violations: violations.length,
      standards_met: standards_with_status.filter((s) => s.status === "met").length,
      standards_violated: standards_with_status.filter((s) => s.status === "violated").length,
    },
  });
}
