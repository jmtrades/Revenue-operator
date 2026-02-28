/**
 * Pricing layer feature flags — deterministic gating by tier.
 * Solo / Growth / Team / Enterprise. Enforced in policy layer.
 */

export const BILLING_TIERS = ["solo", "growth", "team", "enterprise"] as const;
export type BillingTier = (typeof BILLING_TIERS)[number];

export type FeatureKey =
  | "domain_packs"
  | "domain_packs_max"
  | "channels"
  | "channels_max"
  | "governance"
  | "approval_mode_preview"
  | "approval_mode_required"
  | "dual_approval"
  | "multi_location"
  | "role_governance"
  | "compliance_packs"
  | "supervisor_mode"
  | "dedicated_infra"
  | "custom_compliance"
  | "sso"
  | "sla"
  | "api_integrations"
  | "adaptive_engine"
  | "audit_export"
  | "immutable_archive"
  | "full_escalation";

export interface TierFeatures {
  domain_packs_max: number;
  channels_max: number;
  governance: "limited" | "full";
  approval_mode_preview: boolean;
  approval_mode_required: boolean;
  dual_approval: boolean;
  multi_location: boolean;
  role_governance: boolean;
  compliance_packs: boolean;
  supervisor_mode: boolean;
  dedicated_infra: boolean;
  custom_compliance: boolean;
  sso: boolean;
  sla: boolean;
  api_integrations: boolean;
  adaptive_engine: boolean;
  audit_export: boolean;
  immutable_archive: boolean;
  full_escalation: boolean;
}

export const TIER_FEATURES: Record<BillingTier, TierFeatures> = {
  solo: {
    domain_packs_max: 1,
    channels_max: 2,
    governance: "limited",
    approval_mode_preview: false,
    approval_mode_required: false,
    dual_approval: false,
    multi_location: false,
    role_governance: false,
    compliance_packs: false,
    supervisor_mode: false,
    dedicated_infra: false,
    custom_compliance: false,
    sso: false,
    sla: false,
    api_integrations: false,
    adaptive_engine: true,
    audit_export: false,
    immutable_archive: false,
    full_escalation: false,
  },
  growth: {
    domain_packs_max: 3,
    channels_max: 5,
    governance: "full",
    approval_mode_preview: true,
    approval_mode_required: true,
    dual_approval: false,
    multi_location: false,
    role_governance: false,
    compliance_packs: false,
    supervisor_mode: false,
    dedicated_infra: false,
    custom_compliance: false,
    sso: false,
    sla: false,
    api_integrations: false,
    adaptive_engine: true,
    audit_export: true,
    immutable_archive: false,
    full_escalation: true,
  },
  team: {
    domain_packs_max: 50,
    channels_max: 10,
    governance: "full",
    approval_mode_preview: true,
    approval_mode_required: true,
    dual_approval: true,
    multi_location: true,
    role_governance: true,
    compliance_packs: true,
    supervisor_mode: true,
    dedicated_infra: false,
    custom_compliance: false,
    sso: false,
    sla: false,
    api_integrations: false,
    adaptive_engine: true,
    audit_export: true,
    immutable_archive: false,
    full_escalation: true,
  },
  enterprise: {
    domain_packs_max: -1,
    channels_max: -1,
    governance: "full",
    approval_mode_preview: true,
    approval_mode_required: true,
    dual_approval: true,
    multi_location: true,
    role_governance: true,
    compliance_packs: true,
    supervisor_mode: true,
    dedicated_infra: true,
    custom_compliance: true,
    sso: true,
    sla: true,
    api_integrations: true,
    adaptive_engine: true,
    audit_export: true,
    immutable_archive: true,
    full_escalation: true,
  },
};
