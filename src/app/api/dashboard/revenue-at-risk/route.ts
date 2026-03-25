/**
 * GET /api/dashboard/revenue-at-risk?workspace_id=...
 * Returns revenue leak categories with estimated dollar amounts.
 *
 * Categories:
 *   missed_calls     — calls missed in last 7 days with no callback
 *   cold_leads       — leads not contacted in 30+ days
 *   no_shows         — appointments marked no-show in last 14 days, not rescheduled
 *   open_quotes      — leads in QUOTE state with no follow-up in 7+ days
 *   dormant_customers — leads marked WON/CUSTOMER with no activity in 180+ days
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

interface LeakCategory {
  key: string;
  label: string;
  count: number;
  estimatedRevenue: number;
  action: string;
  actionLabel: string;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  // Get average deal value from workspace settings (fallback to $350)
  let avgDealValue = 350;
  try {
    const { data: ctx } = await db
      .from("workspace_business_context")
      .select("pricing_range")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const ctxRow = ctx as { pricing_range?: string | null } | null;
    if (ctxRow?.pricing_range) {
      // Try to parse a numeric value from pricing range like "$200-$500"
      const nums = ctxRow.pricing_range.match(/\d+/g);
      if (nums && nums.length >= 2) {
        avgDealValue = Math.round((parseInt(nums[0]) + parseInt(nums[1])) / 2);
      } else if (nums && nums.length === 1) {
        avgDealValue = parseInt(nums[0]);
      }
    }
  } catch {
    // Use default
  }

  const leaks: LeakCategory[] = [];
  const now = new Date();

  // 1. Unanswered calls not followed up (last 7 days)
  try {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("direction", "inbound")
      .in("status", ["missed", "no_answer", "abandoned"])
      .gte("call_started_at", sevenDaysAgo.toISOString());

    const missedCount = count ?? 0;
    if (missedCount > 0) {
      leaks.push({
        key: "missed_calls",
        label: "Unanswered calls without callback",
        count: missedCount,
        estimatedRevenue: missedCount * avgDealValue,
        action: "/dashboard/recovery",
        actionLabel: "Call them back now",
      });
    }
  } catch {
    // Table may not exist
  }

  // 2. Cold leads (no contact in 30+ days)
  try {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .not("state", "in", '("ARCHIVED","LOST","DISQUALIFIED","WON")')
      .lt("updated_at", thirtyDaysAgo.toISOString());

    const coldCount = count ?? 0;
    if (coldCount > 0) {
      leaks.push({
        key: "cold_leads",
        label: "Leads gone cold (30+ days)",
        count: coldCount,
        estimatedRevenue: Math.round(coldCount * avgDealValue * 0.3), // 30% close rate on re-engagement
        action: "/dashboard/campaigns/new",
        actionLabel: "Run re-engagement campaign",
      });
    }
  } catch {
    // Table may not exist
  }

  // 3. No-shows not rescheduled (last 14 days)
  try {
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { count } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "no_show")
      .gte("start_time", fourteenDaysAgo.toISOString());

    const noshowCount = count ?? 0;
    if (noshowCount > 0) {
      leaks.push({
        key: "no_shows",
        label: "No-shows not rescheduled",
        count: noshowCount,
        estimatedRevenue: Math.round(noshowCount * avgDealValue * 0.6), // 60% reschedule rate
        action: "/dashboard/recovery",
        actionLabel: "Reschedule these",
      });
    }
  } catch {
    // Table may not exist
  }

  // 4. Open quotes without follow-up (7+ days)
  try {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("state", ["QUOTE", "PROPOSAL"])
      .lt("updated_at", sevenDaysAgo.toISOString());

    const quoteCount = count ?? 0;
    if (quoteCount > 0) {
      leaks.push({
        key: "open_quotes",
        label: "Quotes/proposals without follow-up",
        count: quoteCount,
        estimatedRevenue: Math.round(quoteCount * avgDealValue * 0.4), // 40% close rate
        action: "/dashboard/campaigns/new",
        actionLabel: "Follow up on these",
      });
    }
  } catch {
    // Table may not exist
  }

  // 5. Past customers who haven't returned (180+ days)
  try {
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

    const { count } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("state", ["WON", "CUSTOMER"])
      .lt("updated_at", sixMonthsAgo.toISOString());

    const dormantCount = count ?? 0;
    if (dormantCount > 0) {
      leaks.push({
        key: "dormant_customers",
        label: "Past customers gone quiet (6+ months)",
        count: dormantCount,
        estimatedRevenue: Math.round(dormantCount * avgDealValue * 0.2), // 20% win-back rate
        action: "/dashboard/campaigns/new",
        actionLabel: "Run win-back campaign",
      });
    }
  } catch {
    // Table may not exist
  }

  const totalAtRisk = leaks.reduce((sum, l) => sum + l.estimatedRevenue, 0);

  return NextResponse.json({
    total_at_risk: totalAtRisk,
    avg_deal_value: avgDealValue,
    categories: leaks,
  });
}
