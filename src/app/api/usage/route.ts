/**
 * GET /api/usage — Usage metering: calls and messages count for workspace, plus plan limits.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const DEFAULT_LIMITS = { minutes: 400, messages: 500 };
const PLAN_LIMITS: Record<string, { minutes: number; messages: number }> = {
  solo: { minutes: 400, messages: 500 },
  growth: { minutes: 1500, messages: 2000 },
  team: { minutes: 5000, messages: 10000 },
  enterprise: { minutes: 50000, messages: 100000 },
};

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();
  let calls = 0;
  let messages = 0;
  let totalMinutes = 0;
  try {
    const { data: callData, count: c } = await db
      .from("call_sessions")
      .select("id, duration_seconds, started_at", { count: "exact" })
      .eq("workspace_id", workspaceId);
    calls = c ?? 0;
    totalMinutes = Math.ceil(
      (callData || []).reduce((sum, cRow) => sum + ((cRow as { duration_seconds?: number }).duration_seconds || 0), 0) / 60
    );
  } catch {
    // ignore
  }
  try {
    const { data: leads } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (leadIds.length > 0) {
      const { data: convs } = await db.from("conversations").select("id").in("lead_id", leadIds);
      const ids = (convs ?? []).map((c: { id: string }) => c.id);
      if (ids.length > 0) {
        const { count: m } = await db.from("messages").select("id", { count: "exact", head: true }).in("conversation_id", ids);
        messages = m ?? 0;
      }
    }
  } catch {
    // ignore
  }

  let tier = "solo";
  try {
    const { data: ws } = await db.from("workspaces").select("billing_tier").eq("id", workspaceId).maybeSingle();
    if (ws && typeof (ws as { billing_tier?: string }).billing_tier === "string") {
      tier = (ws as { billing_tier: string }).billing_tier;
    }
  } catch {
    // ignore
  }
  const limits = PLAN_LIMITS[tier] ?? DEFAULT_LIMITS;
  const minutes_pct = limits.minutes > 0 ? Math.round((totalMinutes / limits.minutes) * 100) : 0;
  const messages_pct = limits.messages > 0 ? Math.round((messages / limits.messages) * 100) : 0;

  return NextResponse.json({
    calls,
    minutes_used: totalMinutes,
    minutes_limit: limits.minutes,
    minutes_pct: Math.min(100, minutes_pct),
    messages,
    messages_limit: limits.messages,
    messages_pct: Math.min(100, messages_pct),
  });
}
