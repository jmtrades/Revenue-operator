export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const db = getDb();

  const { data: relationships, error: relError } = await db
    .from("reseller_relationships")
    .select(
      `
      id,
      child_workspace_id,
      status,
      created_at,
      child_workspace:child_workspace_id(id, name, status)
    `,
    )
    .eq("parent_workspace_id", session.workspaceId);

  if (relError) {
    return NextResponse.json({ error: "Failed to load sub-accounts" }, { status: 500 });
  }

  const subAccounts = relationships ?? [];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: analytics, error: analyticsError } = await db
    .from("reseller_analytics")
    .select("*")
    .in(
      "workspace_id",
      subAccounts.map((r: { child_workspace_id: string }) => r.child_workspace_id),
    )
    .eq("month", currentMonth);

  if (analyticsError) {
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }

  const analyticsMap: Record<string, { total_calls: number; total_leads: number; total_revenue: number }> = {};
  (analytics ?? []).forEach((a: { workspace_id: string; total_calls: number; total_leads: number; total_revenue: number }) => {
    analyticsMap[a.workspace_id] = {
      total_calls: a.total_calls,
      total_leads: a.total_leads,
      total_revenue: Number(a.total_revenue),
    };
  });

  const totalSubAccounts = subAccounts.length;
  const activeSubAccounts = subAccounts.filter((r: { status: string }) => r.status === "active").length;

  let totalCalls = 0;
  let totalLeads = 0;
  let totalRevenue = 0;

  const usageByAccount = subAccounts.map((r: any) => {
    const wsAnalytics = analyticsMap[r.child_workspace_id] || { total_calls: 0, total_leads: 0, total_revenue: 0 };
    totalCalls += wsAnalytics.total_calls;
    totalLeads += wsAnalytics.total_leads;
    totalRevenue += wsAnalytics.total_revenue;

    const cw = Array.isArray(r.child_workspace) ? r.child_workspace[0] : r.child_workspace;
    return {
      id: r.child_workspace_id,
      name: cw?.name ?? "Unknown",
      calls: wsAnalytics.total_calls,
      leads: wsAnalytics.total_leads,
      revenue: wsAnalytics.total_revenue,
      status: r.status,
    };
  });

  const mrr = totalRevenue / 12;

  return NextResponse.json({
    workspace_id: session.workspaceId,
    analytics: {
      total_sub_accounts: totalSubAccounts,
      active_sub_accounts: activeSubAccounts,
      total_calls: totalCalls,
      total_leads: totalLeads,
      total_revenue: totalRevenue,
      mrr: Math.round(mrr * 100) / 100,
      usage_by_account: usageByAccount,
    },
  });
}
