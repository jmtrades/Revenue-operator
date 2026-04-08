export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const REASON_LABELS: Record<string, string> = {
  low_probability: "Low close probability",
  outside_business_hours: "Outside business hours",
  cooldown_active: "Cooldown period active",
  opt_out: "Lead opted out",
  policy_restriction: "Policy restriction",
  stage_limit: "Stage limit reached",
  warmup_limit: "Workspace warmup limit",
  workspace_paused: "Workspace paused",
  no_allowed_actions: "No allowed actions for current state",
  vip_excluded: "VIP excluded from messaging",
  channel_unavailable: "Channel unavailable",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: leadId } = await params;
    const db = getDb();
    const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).maybeSingle();
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const accessErr = await requireWorkspaceAccess(req, (lead as { workspace_id: string }).workspace_id);
    if (accessErr) return accessErr;

    const { data: latest } = await db
      .from("inaction_reasons")
      .select("reason, details, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) {
      return NextResponse.json({ inaction: null });
    }

    const r = latest as { reason: string; details?: Record<string, unknown>; created_at: string };
    const label = REASON_LABELS[r.reason] ?? r.reason;
    return NextResponse.json({
      inaction: {
        reason: r.reason,
        label,
        details: r.details ?? {},
        created_at: r.created_at,
      },
      message: `Team waiting because: ${label.toLowerCase()}.`,
    });
  } catch (err) {
    console.error("inaction-reason route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
