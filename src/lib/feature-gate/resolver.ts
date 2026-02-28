/**
 * Resolve workspace billing tier and allow feature. Deterministic.
 */

import { getDb } from "@/lib/db/queries";
import { TIER_FEATURES, type BillingTier, type FeatureKey, type TierFeatures } from "./types";

const DEFAULT_TIER: BillingTier = "solo";

export async function resolveBillingTier(workspaceId: string): Promise<BillingTier> {
  const db = getDb();
  const { data: row } = await db
    .from("workspaces")
    .select("billing_tier")
    .eq("id", workspaceId)
    .maybeSingle();

  const tier = (row as { billing_tier?: string } | null)?.billing_tier;
  if (tier && (TIER_FEATURES as Record<string, TierFeatures>)[tier]) {
    return tier as BillingTier;
  }
  return DEFAULT_TIER;
}

/** Enterprise: read workspace.enterprise_features_json for overrides. */
export async function getEnterpriseFeatureOverrides(workspaceId: string): Promise<Record<string, unknown> | null> {
  const db = getDb();
  const { data: row } = await db
    .from("workspaces")
    .select("billing_tier, enterprise_features_json")
    .eq("id", workspaceId)
    .maybeSingle();
  const r = row as { billing_tier?: string; enterprise_features_json?: Record<string, unknown> } | null;
  if (r?.billing_tier === "enterprise" && r?.enterprise_features_json && typeof r.enterprise_features_json === "object")
    return r.enterprise_features_json;
  return null;
}

export function getTierFeatures(tier: BillingTier): TierFeatures {
  return TIER_FEATURES[tier];
}

/**
 * Check if a feature is allowed for the workspace. Deterministic.
 */
export async function allowFeature(
  workspaceId: string,
  feature: FeatureKey,
  context?: { currentDomainPackCount?: number; currentChannelCount?: number }
): Promise<boolean> {
  const tier = await resolveBillingTier(workspaceId);
  const features = TIER_FEATURES[tier];

  switch (feature) {
    case "domain_packs":
      return features.domain_packs_max > 0;
    case "domain_packs_max":
      return true;
    case "channels":
      return features.channels_max > 0;
    case "channels_max":
      return true;
    case "approval_mode_preview":
      return features.approval_mode_preview;
    case "approval_mode_required":
      return features.approval_mode_required;
    case "dual_approval":
      return features.dual_approval;
    case "audit_export":
      return features.audit_export;
    case "immutable_archive":
      return features.immutable_archive;
    case "full_escalation":
      return features.full_escalation;
    case "multi_location":
      return features.multi_location;
    case "role_governance":
      return features.role_governance;
    case "compliance_packs":
      return features.compliance_packs;
    case "supervisor_mode":
      return features.supervisor_mode;
    case "dedicated_infra":
    case "custom_compliance":
    case "sso":
    case "sla":
    case "api_integrations":
      return (features as unknown as Record<string, boolean>)[feature] === true;
    case "governance":
      return features.governance === "full";
    case "adaptive_engine":
      return features.adaptive_engine;
    default:
      return false;
  }
}

/**
 * Get max allowed domain packs for workspace. -1 = unlimited.
 */
export async function getMaxDomainPacks(workspaceId: string): Promise<number> {
  const tier = await resolveBillingTier(workspaceId);
  return TIER_FEATURES[tier].domain_packs_max;
}

/**
 * Get max allowed channels for workspace. -1 = unlimited.
 */
export async function getMaxChannels(workspaceId: string): Promise<number> {
  const tier = await resolveBillingTier(workspaceId);
  return TIER_FEATURES[tier].channels_max;
}
