/**
 * GET /api/usage — Usage metering: calls and messages count for workspace, plus plan limits.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const DEFAULT_LIMITS = { calls: 200, messages: 500 };
const PLAN_LIMITS: Record<string, { calls: number; messages: number }> = {
  solo: { calls: 200, messages: 500 },
  growth: { calls: 1000, messages: 2000 },
  team: { calls: 5000, messages: 10000 },
  enterprise: { calls: 50000, messages: 100000 },
};

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();
  let calls = 0;
  let messages = 0;
  try {
    const { count: c } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    calls = c ?? 0;
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
  const calls_pct = limits.calls > 0 ? Math.round((calls / limits.calls) * 100) : 0;
  const messages_pct = limits.messages > 0 ? Math.round((messages / limits.messages) * 100) : 0;

  return NextResponse.json({
    calls,
    messages,
    calls_limit: limits.calls,
    messages_limit: limits.messages,
    calls_pct: Math.min(100, calls_pct),
    messages_pct: Math.min(100, messages_pct),
  });
}
