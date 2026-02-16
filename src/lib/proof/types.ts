/**
 * Proof Layer — Value Attribution
 * Every revenue outcome recorded with causality. Dashboard reads only from proof.
 */

export const REVENUE_PROOF_TYPES = [
  "LeadReceived",
  "RecoveredNoShow",
  "NewBooking",
  "SavedConversation",
  "ReactivatedCustomer",
  "RepeatVisit",
  "ResponsibilityResolved",
  "SystemIntegrityVerified",
] as const;

export type RevenueProofType = (typeof REVENUE_PROOF_TYPES)[number];

export interface RevenueProofRecord {
  workspace_id: string;
  lead_id: string;
  proof_type: RevenueProofType;
  operator_id?: string | null;
  signal_id?: string | null;
  state_before?: string | null;
  state_after?: string | null;
  payload?: Record<string, unknown>;
}
