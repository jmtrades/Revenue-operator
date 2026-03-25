/**
 * Economic gravity: after repeated recoveries, enforce structural rules automatically.
 * Modifies future operational handling. No suggestions — the system changes the rules.
 */

import { getDb } from "@/lib/db/queries";

export type StructuralRuleType = "require_confirmation" | "require_deposit" | "require_ack_before_work";

/** Ensure structural rule is active when trigger condition is met. */
export async function enforceStructuralRule(
  workspaceId: string,
  ruleType: StructuralRuleType,
  triggeredReason: string
): Promise<void> {
  const db = getDb();
  const { data: existing } = await db
    .from("structural_rules")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("rule_type", ruleType)
    .maybeSingle();
  if (existing) return;
  await db.from("structural_rules").insert({
    workspace_id: workspaceId,
    rule_type: ruleType,
    triggered_reason: triggeredReason,
    active: true,
  });
}

/** Check if workspace has rule active. */
export async function hasStructuralRule(workspaceId: string, ruleType: StructuralRuleType): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("structural_rules")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("rule_type", ruleType)
    .eq("active", true)
    .maybeSingle();
  return !!data;
}

/** Whether workspace has any structural rules (for dependency proof). */
export async function hasStructuralRulesEnforced(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("structural_rules")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Evaluate and apply economic gravity: call after recoveries. */
export async function evaluateEconomicGravity(workspaceId: string): Promise<void> {
  const db = getDb();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: commitmentSaved } = await db
    .from("incident_statements")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category", "no_show_prevented")
    .gte("created_at", since);
  const missedRecovered = (commitmentSaved ?? []).length;
  if (missedRecovered >= 3) {
    await enforceStructuralRule(workspaceId, "require_confirmation", "3_missed_appointments_recovered");
  }

  const { data: paymentRecovered } = await db
    .from("incident_statements")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category", "payment_recovered")
    .gte("created_at", since);
  if ((paymentRecovered ?? []).length >= 3) {
    await enforceStructuralRule(workspaceId, "require_deposit", "repeated_payment_recoveries");
  }

  const { data: disputed } = await db
    .from("incident_statements")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category", "dispute_prevented")
    .gte("created_at", since);
  if ((disputed ?? []).length >= 1) {
    await enforceStructuralRule(workspaceId, "require_ack_before_work", "dispute_occurred");
  }
}
