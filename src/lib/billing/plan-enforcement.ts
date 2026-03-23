/**
 * Hard plan limit enforcement.
 *
 * Every billable action checks limits here BEFORE executing.
 * When a limit is hit, we return an upgrade CTA instead of silently allowing.
 *
 * Revenue strategy:
 * - Voice minutes and SMS: allow overage (auto-billed at premium rates)
 * - Agents, seats, numbers: HARD block + upgrade CTA (forces tier upgrade)
 * - Outbound daily calls: HARD block + upgrade CTA
 */

import { getDb } from "@/lib/db/queries";
import { BILLING_PLANS, type PlanSlug } from "@/lib/billing-plans";

export interface EnforcementResult {
  allowed: boolean;
  /** When blocked: reason code */
  reason?: "agent_limit" | "seat_limit" | "number_limit" | "outbound_limit" | "sms_limit" | "no_subscription" | "feature_gated";
  /** Human-readable message for UI */
  message?: string;
  /** Suggested plan to upgrade to */
  upgradeTo?: PlanSlug;
  /** Current usage vs limit */
  current?: number;
  limit?: number;
}

function getPlan(tier: string | null | undefined): PlanSlug {
  const t = (tier || "solo").toLowerCase();
  if (["solo", "business", "scale", "enterprise"].includes(t)) return t as PlanSlug;
  return "solo";
}

function suggestUpgrade(current: PlanSlug): PlanSlug | undefined {
  const order: PlanSlug[] = ["solo", "business", "scale", "enterprise"];
  const idx = order.indexOf(current);
  if (idx < order.length - 1) return order[idx + 1];
  return undefined;
}

/** Block all billable actions if workspace billing is suspended */
const ACTIVE_STATUSES = new Set(["active", "trial"]);
function checkBillingActive(billingStatus: string | null | undefined): EnforcementResult | null {
  if (!billingStatus || ACTIVE_STATUSES.has(billingStatus)) return null;
  return {
    allowed: false,
    reason: "no_subscription",
    message: billingStatus === "payment_failed"
      ? "Your payment failed. Please update your billing info to continue."
      : billingStatus === "paused"
        ? "Your account is paused. Resume your subscription to continue."
        : "An active subscription is required for this action.",
  };
}

/** Check if workspace can create another AI agent */
export async function canCreateAgent(workspaceId: string): Promise<EnforcementResult> {
  const db = getDb();

  const [wsRes, agentRes] = await Promise.all([
    db.from("workspaces").select("billing_tier, billing_status").eq("id", workspaceId).maybeSingle(),
    db.from("agents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const ws = wsRes.data as { billing_tier?: string; billing_status?: string } | null;
  if (!ws) return { allowed: false, reason: "no_subscription", message: "Workspace not found" };

  const billingBlock = checkBillingActive(ws.billing_status);
  if (billingBlock) return billingBlock;

  const tier = getPlan(ws.billing_tier);
  const plan = BILLING_PLANS[tier];
  const count = agentRes.count ?? 0;

  if (plan.maxAgents !== -1 && count >= plan.maxAgents) {
    return {
      allowed: false,
      reason: "agent_limit",
      message: `Your ${plan.label} plan includes ${plan.maxAgents} AI agent${plan.maxAgents === 1 ? "" : "s"}. Upgrade to add more.`,
      upgradeTo: suggestUpgrade(tier),
      current: count,
      limit: plan.maxAgents,
    };
  }

  return { allowed: true };
}

/** Check if workspace can add another phone number */
export async function canProvisionNumber(workspaceId: string): Promise<EnforcementResult> {
  const db = getDb();

  const [wsRes, numRes] = await Promise.all([
    db.from("workspaces").select("billing_tier, billing_status").eq("id", workspaceId).maybeSingle(),
    db.from("phone_numbers").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
  ]);

  const ws = wsRes.data as { billing_tier?: string; billing_status?: string } | null;
  if (!ws) return { allowed: false, reason: "no_subscription", message: "Workspace not found" };

  const billingBlock = checkBillingActive(ws.billing_status);
  if (billingBlock) return billingBlock;

  const tier = getPlan(ws.billing_tier);
  const plan = BILLING_PLANS[tier];
  const count = numRes.count ?? 0;

  if (plan.maxPhoneNumbers !== -1 && count >= plan.maxPhoneNumbers) {
    return {
      allowed: false,
      reason: "number_limit",
      message: `Your ${plan.label} plan includes ${plan.maxPhoneNumbers} phone number${plan.maxPhoneNumbers === 1 ? "" : "s"}. Upgrade for more.`,
      upgradeTo: suggestUpgrade(tier),
      current: count,
      limit: plan.maxPhoneNumbers,
    };
  }

  return { allowed: true };
}

/** Check if workspace can make another outbound call today */
export async function canMakeOutboundCall(workspaceId: string): Promise<EnforcementResult> {
  const db = getDb();

  const wsRes = await db.from("workspaces").select("billing_tier, billing_status").eq("id", workspaceId).maybeSingle();
  const ws = wsRes.data as { billing_tier?: string; billing_status?: string } | null;
  if (!ws) return { allowed: false, reason: "no_subscription", message: "Workspace not found" };

  const billingBlock = checkBillingActive(ws.billing_status);
  if (billingBlock) return billingBlock;

  const tier = getPlan(ws.billing_tier);
  const plan = BILLING_PLANS[tier];

  if (plan.outboundDailyLimit === -1) return { allowed: true };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("started_at", todayStart.toISOString())
    .not("outcome", "is", null); // Only count actual calls, not pending

  const todayCount = count ?? 0;

  if (todayCount >= plan.outboundDailyLimit) {
    return {
      allowed: false,
      reason: "outbound_limit",
      message: `Daily outbound limit reached (${plan.outboundDailyLimit} calls/day on ${plan.label}). Upgrade for more.`,
      upgradeTo: suggestUpgrade(tier),
      current: todayCount,
      limit: plan.outboundDailyLimit,
    };
  }

  return { allowed: true };
}

/** Check if a feature is available on the current plan */
export async function canUseFeature(
  workspaceId: string,
  feature: keyof typeof BILLING_PLANS.solo.features
): Promise<EnforcementResult> {
  const db = getDb();

  const wsRes = await db.from("workspaces").select("billing_tier, billing_status").eq("id", workspaceId).maybeSingle();
  const ws = wsRes.data as { billing_tier?: string; billing_status?: string } | null;
  if (!ws) return { allowed: false, reason: "no_subscription", message: "Workspace not found" };

  const billingBlock = checkBillingActive(ws.billing_status);
  if (billingBlock) return billingBlock;

  const tier = getPlan(ws.billing_tier);
  const plan = BILLING_PLANS[tier];

  if (!plan.features[feature]) {
    const upgrade = suggestUpgrade(tier);
    const upgradeLabel = upgrade ? BILLING_PLANS[upgrade].label : "a higher";
    return {
      allowed: false,
      reason: "feature_gated",
      message: `This feature requires the ${upgradeLabel} plan or above.`,
      upgradeTo: upgrade,
    };
  }

  return { allowed: true };
}

/** Check if workspace can invite another team member */
export async function canInviteSeat(workspaceId: string): Promise<EnforcementResult> {
  const db = getDb();

  const [wsRes, memberRes] = await Promise.all([
    db.from("workspaces").select("billing_tier, billing_status").eq("id", workspaceId).maybeSingle(),
    db.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const ws = wsRes.data as { billing_tier?: string; billing_status?: string } | null;
  if (!ws) return { allowed: false, reason: "no_subscription", message: "Workspace not found" };

  const billingBlock = checkBillingActive(ws.billing_status);
  if (billingBlock) return billingBlock;

  const tier = getPlan(ws.billing_tier);
  const plan = BILLING_PLANS[tier];
  const count = memberRes.count ?? 0;

  if (plan.maxSeats !== -1 && count >= plan.maxSeats) {
    return {
      allowed: false,
      reason: "seat_limit",
      message: `Your ${plan.label} plan includes ${plan.maxSeats} team seat${plan.maxSeats === 1 ? "" : "s"}. Upgrade to add more.`,
      upgradeTo: suggestUpgrade(tier),
      current: count,
      limit: plan.maxSeats,
    };
  }

  return { allowed: true };
}
