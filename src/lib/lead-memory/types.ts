/**
 * Lead memory — structured commercial memory. No freeform text.
 * Used by strategy engine, compliance layer, escalation engine.
 */

export interface DisclosedPriceRange {
  min?: number;
  max?: number;
  currency?: string;
  disclosed_at?: string;
}

export interface ObjectionRecord {
  tag: string;
  at: string;
  resolution?: string;
}

export interface CommitmentRecord {
  type: string;
  at: string;
  outcome?: string;
}

export interface DisclosureAckRecord {
  disclosure_key: string;
  at: string;
  channel?: string;
}

export interface ConsentRecord {
  type: string;
  at: string;
  channel?: string;
  scope?: string;
}

export interface EmotionalProfile {
  urgency_score?: number;
  skepticism_score?: number;
  compliance_sensitivity?: number;
  aggression_level?: number;
  authority_resistance?: number;
  trust_requirement?: number;
}

export interface LifecycleNote {
  stage: string;
  at: string;
  note_type: string;
  last_action?: string;
  outcome?: string;
}

export interface LeadMemoryRow {
  workspace_id: string;
  lead_id: string;
  disclosed_price_range: DisclosedPriceRange | null;
  objections_history_json: ObjectionRecord[];
  commitments_made_json: CommitmentRecord[];
  disclosures_acknowledged_json: DisclosureAckRecord[];
  consent_records_json: ConsentRecord[];
  last_channel_used: string | null;
  last_contact_attempt_at: string | null;
  risk_flags_json: string[];
  emotional_profile_json: EmotionalProfile;
  lifecycle_notes_json: LifecycleNote[];
  updated_at: string;
}

export interface LeadMemoryUpdate {
  disclosed_price_range?: DisclosedPriceRange | null;
  objections_history_json?: ObjectionRecord[];
  commitments_made_json?: CommitmentRecord[];
  disclosures_acknowledged_json?: DisclosureAckRecord[];
  consent_records_json?: ConsentRecord[];
  last_channel_used?: string | null;
  last_contact_attempt_at?: string | null;
  risk_flags_json?: string[];
  emotional_profile_json?: EmotionalProfile;
  lifecycle_notes_json?: LifecycleNote[];
  updated_at?: string;
}
