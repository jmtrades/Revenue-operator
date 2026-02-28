/**
 * Enterprise immutability configuration: billing tier + enterprise features + jurisdiction lock.
 * Purely reads configuration; no writes.
 */

import { getDb } from "@/lib/db/queries";

export interface EnterpriseImmutabilityConfig {
  isEnterprise: boolean;
  immutabilityLock: boolean;
  jurisdictionLocked: boolean;
  dualApprovalRequired: boolean;
}

export async function getEnterpriseImmutabilityConfig(workspaceId: string): Promise<EnterpriseImmutabilityConfig> {
  const db = getDb();

  const { data: ws } = await db
    .from("workspaces")
    .select("billing_tier, enterprise_contract_ref, enterprise_features_json")
    .eq("id", workspaceId)
    .maybeSingle();

  const { data: settingsRow } = await db
    .from("settings")
    .select("approval_mode")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const w = ws as
    | {
        billing_tier?: string | null;
        enterprise_contract_ref?: string | null;
        enterprise_features_json?: Record<string, unknown> | null;
      }
    | null;

  const settings = settingsRow as { approval_mode?: string | null } | null;
  const features = (w?.enterprise_features_json ?? {}) as Record<string, unknown>;

  const billingTier = (w?.billing_tier ?? "").toString();
  const approvalMode = (settings?.approval_mode ?? "").toString();

  const isEnterpriseTier = billingTier === "enterprise";
  const hasContract = Boolean(w?.enterprise_contract_ref);
  const immutabilityLock = features.immutability_lock === true;
  const dualApprovalRequired = features.dual_approval === true;
  const jurisdictionLocked = approvalMode === "jurisdiction_locked";

  return {
    isEnterprise: isEnterpriseTier || hasContract,
    immutabilityLock,
    jurisdictionLocked,
    dualApprovalRequired,
  };
}

