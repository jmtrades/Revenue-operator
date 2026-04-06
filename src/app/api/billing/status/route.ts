/**
 * Billing status for workspace
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { BILLING_PLANS, normalizeTier } from "@/lib/billing-plans";
import { evaluateUsageAlert, type VoiceUsageMetrics } from "@/lib/voice/billing";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("billing_status, protection_renewal_at, trial_ends_at, trial_end_at, stripe_customer_id, stripe_subscription_id, created_at, status, pause_reason, billing_tier, pending_billing_tier, pending_billing_effective_at, dunning_amount_due_cents, dunning_currency, dunning_next_retry_at, dunning_failure_count")
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
    pending_billing_tier?: string | null;
    pending_billing_effective_at?: string | null;
    dunning_amount_due_cents?: number | null;
    dunning_currency?: string | null;
    dunning_next_retry_at?: string | null;
    dunning_failure_count?: number | null;
  };

  // Trial window is stored in the workspace row so checkout + trial start + billing status agree.
  const trialEndIso = row.trial_ends_at ?? null;
  const trialEnd = trialEndIso ? new Date(trialEndIso) : null;

  const isPaused = row.billing_status === "trial_ended" || row.billing_status === "cancelled" || row.billing_status === "payment_failed" || row.pause_reason || (row.billing_status === "trial" && trialEnd && new Date(trialEnd) < new Date());
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
  const tier = normalizeTier(row.billing_tier);
  const planMinutes = BILLING_PLANS[tier]?.includedMinutes ?? 1000;

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

  const pendingTier = row.pending_billing_tier ? normalizeTier(row.pending_billing_tier) : null;
  const pendingEffectiveAt = row.pending_billing_effective_at ?? null;
  let downgradeWarning: string | null = null;
  let activeAgentsCount = 0;
  if (pendingTier) {
    const { count } = await db
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    activeAgentsCount = count ?? 0;
    const nextPlanMaxAgents = BILLING_PLANS[pendingTier]?.maxAgents ?? -1;
    if (nextPlanMaxAgents > -1 && activeAgentsCount > nextPlanMaxAgents) {
      downgradeWarning = `You have ${activeAgentsCount} active agents. ${BILLING_PLANS[pendingTier]?.label ?? pendingTier} allows ${nextPlanMaxAgents}. Please deactivate ${activeAgentsCount - nextPlanMaxAgents} agent(s) before ${pendingEffectiveAt ? new Date(pendingEffectiveAt).toLocaleDateString() : "the plan change date"}.`;
    }
  }

  // Get bonus minutes from minute pack purchases
  let bonusMinutes = 0;
  try {
    const { data: balance } = await db
      .from("workspace_minute_balance")
      .select("bonus_minutes")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    bonusMinutes = (balance as { bonus_minutes?: number } | null)?.bonus_minutes ?? 0;
  } catch {
    // Table may not exist yet
  }

  // Effective limit = plan included + purchased bonus minutes
  const effectiveMinutesLimit = planMinutes + bonusMinutes;

  // Build usage metrics for the alert engine
  const usageMetrics: VoiceUsageMetrics = {
    workspace_id: workspaceId,
    billing_period_start: startOfMonth.toISOString(),
    billing_period_end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    minutes_used: minutesUsed,
    minutes_limit: effectiveMinutesLimit,
    minutes_pct: effectiveMinutesLimit > 0 ? (minutesUsed / effectiveMinutesLimit) * 100 : 0,
    clones_used: 0,
    clones_limit: 0,
    ab_tests_used: 0,
    ab_tests_limit: 0,
    concurrent_calls_peak: 0,
    concurrent_calls_limit: 0,
    is_over_limit: minutesUsed > effectiveMinutesLimit,
    overage_minutes: Math.max(0, minutesUsed - effectiveMinutesLimit),
    estimated_overage_cents: 0,
  };

  const usageAlert = evaluateUsageAlert(usageMetrics, tier);

  return NextResponse.json({
    billing_status: row.billing_status ?? "trial",
    renewal_at: row.protection_renewal_at ?? row.trial_ends_at ?? trialEndIso ?? null,
    stripe_customer_id: row.stripe_customer_id,
    has_subscription: Boolean(row.stripe_subscription_id),
    has_upcoming_booking_24h: has_upcoming_booking_24h,
    billing_tier: row.billing_tier ?? "solo",
    minutes_used: minutesUsed,
    minutes_limit: planMinutes,
    bonus_minutes: bonusMinutes,
    effective_minutes_limit: effectiveMinutesLimit,
    pending_billing_tier: pendingTier,
    pending_billing_effective_at: pendingEffectiveAt,
    downgrade_warning: downgradeWarning,
    active_agents_count: activeAgentsCount,
    usage_alert: {
      level: usageAlert.level,
      pct_used: usageAlert.pctUsed,
      minutes_remaining: usageAlert.minutesRemaining,
      days_remaining: usageAlert.daysRemaining,
      projected_overage_minutes: usageAlert.projectedOverageMinutes,
      projected_overage_cost_cents: usageAlert.projectedOverageCost,
      upsell: usageAlert.upsellRecommendation
        ? {
            current_tier: usageAlert.upsellRecommendation.currentTier,
            recommended_tier: usageAlert.upsellRecommendation.recommendedTier,
            current_price: usageAlert.upsellRecommendation.currentPrice,
            recommended_price: usageAlert.upsellRecommendation.recommendedPrice,
            savings: usageAlert.upsellRecommendation.savings,
            reason: usageAlert.upsellRecommendation.reason,
          }
        : null,
    },
    dunning: row.billing_status === "payment_failed"
      ? {
          amount_due_cents: row.dunning_amount_due_cents ?? 0,
          currency: (row.dunning_currency ?? "usd").toLowerCase(),
          next_retry_at: row.dunning_next_retry_at ?? null,
          failure_count: row.dunning_failure_count ?? 0,
        }
      : null,
  });
}
