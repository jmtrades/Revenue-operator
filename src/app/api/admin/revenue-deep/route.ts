/* eslint-disable @typescript-eslint/no-explicit-any -- Admin-only routes with Supabase dynamic queries */
/**
 * Admin revenue deep analytics: MRR, ARR, expansion, contraction, churn.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";

// Billing tier pricing map
const TIER_PRICING: Record<string, number> = {
  solo: 147, starter: 147,
  business: 297, growth: 297,
  scale: 597,
  enterprise: 997, agency: 997,
};

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const result: Record<string, any> = {};

  // Get all workspaces with billing info
  try {
    const { data: workspaces } = await db.from("workspaces").select("id, billing_tier, billing_interval, stripe_subscription_id, created_at, status");

    if (!workspaces) {
      result.mrr = 0;
      result.arr = 0;
      return NextResponse.json(result);
    }

    let mrr = 0;
    let arr = 0;
    const revenueByPlan: Record<string, number> = {};
    const revenueByInterval: Record<string, number> = { monthly: 0, annual: 0 };

    workspaces.forEach((ws: any) => {
      const tier = ws.billing_tier?.toLowerCase() || "solo";
      const price = TIER_PRICING[tier] || 0;

      if (ws.status !== "paused" && ws.stripe_subscription_id) {
        if (ws.billing_interval === "annual") {
          arr += price * 12;
          revenueByInterval.annual += price * 12;
        } else {
          mrr += price;
          revenueByInterval.monthly += price;
        }
      }

      revenueByPlan[tier] = (revenueByPlan[tier] || 0) + price;
    });

    result.mrr = mrr;
    result.arr = arr;
    result.revenue_by_plan = revenueByPlan;
    result.revenue_by_interval = revenueByInterval;
  } catch (err) {
    result.error = "Failed to fetch revenue data";
  }

  // Monthly revenue trend (from revenue_events using created_at)
  try {
    const { data: revEvents } = await db.from("revenue_events").select("created_at, amount, event_type").order("created_at", { ascending: true });

    if (revEvents && revEvents.length > 0) {
      const trendByMonth: Record<string, { new: number; expansion: number; contraction: number; churn: number }> = {};

      revEvents.forEach((evt: any) => {
        const monthKey = evt.created_at.split("T")[0].split("-").slice(0, 2).join("-");
        if (!trendByMonth[monthKey]) {
          trendByMonth[monthKey] = { new: 0, expansion: 0, contraction: 0, churn: 0 };
        }

        if (evt.event_type === "new") trendByMonth[monthKey].new += evt.amount || 0;
        else if (evt.event_type === "expansion") trendByMonth[monthKey].expansion += evt.amount || 0;
        else if (evt.event_type === "contraction") trendByMonth[monthKey].contraction += evt.amount || 0;
        else if (evt.event_type === "churn") trendByMonth[monthKey].churn += evt.amount || 0;
      });

      result.monthly_revenue_trend = Object.entries(trendByMonth)
        .sort()
        .map(([month, data]) => ({ month, ...data }));
    } else {
      result.monthly_revenue_trend = [];
    }
  } catch (err) {
    result.monthly_revenue_trend = [];
  }

  // Expansion/contraction/churn summary from revenue_events
  try {
    const { count: expansionCount } = await db.from("revenue_events").select("id", { count: "exact", head: true }).eq("event_type", "expansion");
    const { count: contractionCount } = await db.from("revenue_events").select("id", { count: "exact", head: true }).eq("event_type", "contraction");
    const { count: churnCount } = await db.from("revenue_events").select("id", { count: "exact", head: true }).eq("event_type", "churn");
    const { count: newCount } = await db.from("revenue_events").select("id", { count: "exact", head: true }).eq("event_type", "new");

    result.revenue_events_summary = {
      new: newCount ?? 0,
      expansion: expansionCount ?? 0,
      contraction: contractionCount ?? 0,
      churn: churnCount ?? 0,
    };
  } catch (err) {
    result.revenue_events_summary = { error: "Failed to fetch revenue events" };
  }

  // Minute pack revenue
  try {
    const { data: minutePacks } = await db.from("minute_pack_purchases").select("id, amount, created_at");
    let totalMinutePackRevenue = 0;
    (minutePacks ?? []).forEach((mp: any) => {
      totalMinutePackRevenue += mp.amount || 0;
    });
    result.minute_pack_revenue = totalMinutePackRevenue;
  } catch (err) {
    result.minute_pack_revenue = 0;
  }

  // Average revenue per workspace
  try {
    const { data: workspaces } = await db.from("workspaces").select("id, billing_tier, billing_interval");
    if (workspaces && workspaces.length > 0) {
      let totalRevenue = 0;
      workspaces.forEach((ws: any) => {
        const tier = ws.billing_tier?.toLowerCase() || "solo";
        const price = TIER_PRICING[tier] || 0;
        if (ws.billing_interval === "annual") {
          totalRevenue += price * 12;
        } else {
          totalRevenue += price;
        }
      });
      result.average_revenue_per_workspace = totalRevenue / workspaces.length;
    }
  } catch (err) {
    result.average_revenue_per_workspace = 0;
  }

  // LTV estimate (simple: avg revenue per workspace * avg customer lifetime in months)
  // Assuming average customer lifetime of 24 months
  try {
    const { data: workspaces } = await db.from("workspaces").select("id, billing_tier, created_at");
    if (workspaces && workspaces.length > 0) {
      let totalRevenue = 0;
      workspaces.forEach((ws: any) => {
        const tier = ws.billing_tier?.toLowerCase() || "solo";
        const price = TIER_PRICING[tier] || 0;
        totalRevenue += price;
      });
      const avgMonthlyRevenue = totalRevenue / workspaces.length;
      const ltv = avgMonthlyRevenue * 24; // 24 month lifetime assumption
      result.ltv_estimate = ltv;
    }
  } catch (err) {
    result.ltv_estimate = 0;
  }

  return NextResponse.json(result);
}
