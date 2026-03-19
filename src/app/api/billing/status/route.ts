/**
 * Billing status for workspace
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { BILLING_PLANS, type PlanSlug } from "@/lib/billing-plans";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("billing_status, protection_renewal_at, trial_ends_at, trial_end_at, stripe_customer_id, stripe_subscription_id, created_at, status, pause_reason, billing_tier")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const row = ws as {
    billing_status?: string | null;
    protection_renewal_at?: string | null;
    trial_ends_at?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    created_at?: string;
    status?: string | null;
    pause_reason?: string | null;
    billing_tier?: string | null;
  };

  // Trial window is stored in the workspace row so checkout + trial start + billing status agree.
  const trialEndIso = row.trial_ends_at ?? null;
  const trialEnd = trialEndIso ? new Date(trialEndIso) : null;

  const isPaused = row.billing_status === "trial_ended" || row.pause_reason || (row.billing_status === "trial" && trialEnd && new Date(trialEnd) < new Date());
  let has_upcoming_booking_24h = false;
  if (isPaused) {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { count } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", now.toISOString())
      .lt("call_started_at", in24h.toISOString());
    has_upcoming_booking_24h = (count ?? 0) > 0;
  }

  // Calculate minutes used this month
  const tier = (row.billing_tier ?? "solo").toLowerCase() as PlanSlug;
  const planMinutes = BILLING_PLANS[tier]?.includedMinutes ?? 400;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { data: sessions } = await db
    .from("call_sessions")
    .select("call_started_at, call_ended_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfMonth.toISOString());
  const minutesUsed = Math.ceil(
    (sessions ?? []).reduce((sum: number, s: { call_started_at: string; call_ended_at?: string | null }) => {
      const start = new Date(s.call_started_at).getTime();
      const end = s.call_ended_at ? new Date(s.call_ended_at).getTime() : start;
      return sum + (end - start) / 60000;
    }, 0)
  );

  return NextResponse.json({
    billing_status: row.billing_status ?? "trial",
    renewal_at: row.protection_renewal_at ?? row.trial_ends_at ?? trialEndIso ?? null,
    stripe_customer_id: row.stripe_customer_id,
    has_subscription: Boolean(row.stripe_subscription_id),
    has_upcoming_booking_24h: has_upcoming_booking_24h,
    billing_tier: row.billing_tier ?? "solo",
    minutes_used: minutesUsed,
    minutes_limit: planMinutes,
  });
}
