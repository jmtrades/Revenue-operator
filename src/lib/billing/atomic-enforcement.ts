/**
 * Atomic Plan Enforcement — Race-Condition-Proof Resource Creation
 *
 * Problem: canCreateAgent() checks count, then the caller creates the agent
 * in a separate query. Between check and create, another request can slip through.
 *
 * Solution: Wrap check + create in a single transaction using Supabase RPC,
 * or use an advisory lock pattern with a workspace-scoped mutex row.
 *
 * For environments without RPC, we use optimistic locking:
 * 1. Insert a "pending" resource with a unique claim_token
 * 2. Re-count; if over limit, delete the pending resource
 * 3. If under limit, mark as active
 *
 * This guarantees at most (limit) active resources even under concurrent requests.
 */

import { getDb } from "@/lib/db/queries";
import { BILLING_PLANS, type PlanSlug } from "@/lib/billing-plans";
import type { EnforcementResult } from "./plan-enforcement";

function getPlan(tier: string | null | undefined): PlanSlug {
  const t = (tier || "solo").toLowerCase();
  if (["solo", "business", "scale", "enterprise"].includes(t)) return t as PlanSlug;
  if (t === "starter") return "solo";
  if (t === "growth") return "business";
  if (t === "team") return "scale";
  if (t === "agency") return "enterprise";
  return "solo";
}

function suggestUpgrade(current: PlanSlug): PlanSlug | undefined {
  const order: PlanSlug[] = ["solo", "business", "scale", "enterprise"];
  const idx = order.indexOf(current);
  if (idx < order.length - 1) return order[idx + 1];
  return undefined;
}

interface AtomicCreateResult {
  enforcement: EnforcementResult;
  /** The ID of the newly created resource, if allowed */
  resourceId?: string;
}

/**
 * Atomically check agent limit and create agent in one flow.
 * Uses optimistic insert + post-check pattern to prevent race conditions.
 */
export async function atomicCreateAgent(
  workspaceId: string,
  agentData: Record<string, unknown>
): Promise<AtomicCreateResult> {
  const db = getDb();

  // 1. Fetch workspace billing info
  const { data: ws } = await db
    .from("workspaces")
    .select("billing_tier, billing_status, stripe_customer_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) {
    return { enforcement: { allowed: false, reason: "no_subscription", message: "Workspace not found" } };
  }

  const wsData = ws as { billing_tier?: string; billing_status?: string; stripe_customer_id?: string | null };
  const tier = getPlan(wsData.billing_tier);
  const plan = BILLING_PLANS[tier];

  if (plan.maxAgents === -1) {
    // Unlimited — just create
    const { data: created, error } = await db
      .from("agents")
      .insert({ ...agentData, workspace_id: workspaceId })
      .select("id")
      .single();

    if (error || !created) {
      return { enforcement: { allowed: false, message: "Failed to create agent" } };
    }
    return { enforcement: { allowed: true }, resourceId: (created as { id: string }).id };
  }

  // 2. Optimistic insert with status = 'provisioning' (temporary)
  const claimToken = crypto.randomUUID();
  const { data: inserted, error: insertErr } = await db
    .from("agents")
    .insert({
      ...agentData,
      workspace_id: workspaceId,
      // Use metadata to mark this as a provisional insert
      claim_token: claimToken,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { enforcement: { allowed: false, message: "Failed to create agent" } };
  }

  const newId = (inserted as { id: string }).id;

  // 3. Post-insert count check — the critical race-proof step
  const { count } = await db
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const currentCount = count ?? 0;

  if (currentCount > plan.maxAgents) {
    // Over limit — roll back the optimistic insert
    await db.from("agents").delete().eq("id", newId);
    return {
      enforcement: {
        allowed: false,
        reason: "agent_limit",
        message: `Your ${plan.label} plan includes ${plan.maxAgents} AI agent${plan.maxAgents === 1 ? "" : "s"}. Upgrade to add more.`,
        upgradeTo: suggestUpgrade(tier),
        current: currentCount - 1, // Exclude the one we just rolled back
        limit: plan.maxAgents,
      },
    };
  }

  // 4. Under limit — clear the claim token (agent is now active)
  await db
    .from("agents")
    .update({ claim_token: null })
    .eq("id", newId);

  return { enforcement: { allowed: true }, resourceId: newId };
}

/**
 * Atomically check phone number limit and provision number in one flow.
 */
export async function atomicProvisionNumber(
  workspaceId: string,
  numberData: Record<string, unknown>
): Promise<AtomicCreateResult> {
  const db = getDb();

  const { data: ws } = await db
    .from("workspaces")
    .select("billing_tier, billing_status, stripe_customer_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) {
    return { enforcement: { allowed: false, reason: "no_subscription", message: "Workspace not found" } };
  }

  const wsData = ws as { billing_tier?: string; billing_status?: string; stripe_customer_id?: string | null };
  const tier = getPlan(wsData.billing_tier);
  const plan = BILLING_PLANS[tier];

  if (plan.maxPhoneNumbers === -1) {
    const { data: created, error } = await db
      .from("phone_numbers")
      .insert({ ...numberData, workspace_id: workspaceId, status: "active" })
      .select("id")
      .single();

    if (error || !created) {
      return { enforcement: { allowed: false, message: "Failed to provision number" } };
    }
    return { enforcement: { allowed: true }, resourceId: (created as { id: string }).id };
  }

  // Optimistic insert
  const { data: inserted, error: insertErr } = await db
    .from("phone_numbers")
    .insert({ ...numberData, workspace_id: workspaceId, status: "provisioning" })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { enforcement: { allowed: false, message: "Failed to provision number" } };
  }

  const newId = (inserted as { id: string }).id;

  // Post-insert count check
  const { count } = await db
    .from("phone_numbers")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "provisioning"]);

  const currentCount = count ?? 0;

  if (currentCount > plan.maxPhoneNumbers) {
    await db.from("phone_numbers").delete().eq("id", newId);
    return {
      enforcement: {
        allowed: false,
        reason: "number_limit",
        message: `Your ${plan.label} plan includes ${plan.maxPhoneNumbers} phone number${plan.maxPhoneNumbers === 1 ? "" : "s"}. Upgrade for more.`,
        upgradeTo: suggestUpgrade(tier),
        current: currentCount - 1,
        limit: plan.maxPhoneNumbers,
      },
    };
  }

  // Activate
  await db
    .from("phone_numbers")
    .update({ status: "active" })
    .eq("id", newId);

  return { enforcement: { allowed: true }, resourceId: newId };
}

/**
 * Atomically check seat limit and invite member in one flow.
 */
export async function atomicInviteSeat(
  workspaceId: string,
  memberData: Record<string, unknown>
): Promise<AtomicCreateResult> {
  const db = getDb();

  const { data: ws } = await db
    .from("workspaces")
    .select("billing_tier")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) {
    return { enforcement: { allowed: false, reason: "no_subscription", message: "Workspace not found" } };
  }

  const wsData = ws as { billing_tier?: string };
  const tier = getPlan(wsData.billing_tier);
  const plan = BILLING_PLANS[tier];

  if (plan.maxSeats === -1) {
    const { data: created, error } = await db
      .from("workspace_members")
      .insert({ ...memberData, workspace_id: workspaceId })
      .select("id")
      .single();

    if (error || !created) {
      return { enforcement: { allowed: false, message: "Failed to invite member" } };
    }
    return { enforcement: { allowed: true }, resourceId: (created as { id: string }).id };
  }

  // Optimistic insert
  const { data: inserted, error: insertErr } = await db
    .from("workspace_members")
    .insert({ ...memberData, workspace_id: workspaceId, status: "pending_invite" })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { enforcement: { allowed: false, message: "Failed to invite member" } };
  }

  const newId = (inserted as { id: string }).id;

  const { count } = await db
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const currentCount = count ?? 0;

  if (currentCount > plan.maxSeats) {
    await db.from("workspace_members").delete().eq("id", newId);
    return {
      enforcement: {
        allowed: false,
        reason: "seat_limit",
        message: `Your ${plan.label} plan includes ${plan.maxSeats} team seat${plan.maxSeats === 1 ? "" : "s"}. Upgrade to add more.`,
        upgradeTo: suggestUpgrade(tier),
        current: currentCount - 1,
        limit: plan.maxSeats,
      },
    };
  }

  return { enforcement: { allowed: true }, resourceId: newId };
}
