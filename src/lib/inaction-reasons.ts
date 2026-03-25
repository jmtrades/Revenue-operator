/**
 * Record why the operator did not act.
 */

import { getDb } from "@/lib/db/queries";

export type InactionReason =
  | "decision_no_intervention"
  | "low_confidence"
  | "low_probability"
  | "outside_business_hours"
  | "cooldown_active"
  | "opt_out"
  | "policy_restriction"
  | "stage_limit"
  | "warmup_limit"
  | "workspace_paused"
  | "no_allowed_actions"
  | "vip_excluded"
  | "channel_unavailable"
  | "no_role_for_action"
  | "autonomy_ramp"
  | "feature_disabled"
  | "coverage_not_enabled";

export async function recordInaction(
  leadId: string,
  workspaceId: string,
  reason: InactionReason,
  details?: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  await db.from("inaction_reasons").insert({
    lead_id: leadId,
    workspace_id: workspaceId,
    reason,
    details: details ?? {},
  });
}
