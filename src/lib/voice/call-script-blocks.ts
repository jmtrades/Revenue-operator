/**
 * Call script block presets per domain. Ordered blocks only; no freeform.
 * Used when building place_outbound_call intent payload.
 * Voice dominance: block types align with call_script_blocks schema.
 */

export type CallScriptBlockType =
  | "opening_block" | "context_block" | "authority_block" | "disclosure_block"
  | "qualification_block" | "objection_block" | "alignment_block" | "compliance_block"
  | "consent_block" | "commitment_block" | "confirmation_block" | "close_block"
  | "opening" | "disclosure" | "consent" | "objection_branch" | "compliance_pause" | "close" | "escalation";

export interface CallScriptBlock {
  id: string;
  type: CallScriptBlockType;
  text: string;
  required_ack?: boolean;
  next_on_ack?: string;
  escalation_threshold?: "none" | "low" | "medium" | "high" | "immediate";
  consent_required?: boolean;
}

export const CALL_SCRIPT_PRESETS: Record<string, CallScriptBlock[]> = {
  real_estate: [
    { id: "re_open", type: "opening", text: "Hi, this is a follow-up regarding your property inquiry." },
    { id: "re_disclosure", type: "disclosure", text: "This call may be recorded. Equal housing opportunity.", required_ack: true },
    { id: "re_close", type: "close", text: "Thank you. We will send the next steps by message." },
  ],
  insurance: [
    { id: "ins_open", type: "opening", text: "Hi, this is a follow-up regarding your quote request." },
    { id: "ins_disclosure", type: "disclosure", text: "Policy terms apply. Quote subject to underwriting.", required_ack: true },
    { id: "ins_consent", type: "consent", text: "Do we have your consent to discuss coverage options?", required_ack: true },
    { id: "ins_close", type: "close", text: "Thank you. Details will follow by message." },
  ],
  solar: [
    { id: "sol_open", type: "opening", text: "Hi, this is a follow-up about your solar qualification." },
    { id: "sol_disclosure", type: "disclosure", text: "Incentive eligibility subject to program rules.", required_ack: true },
    { id: "sol_close", type: "close", text: "Thank you. We will send the next steps." },
  ],
  legal: [
    { id: "leg_open", type: "opening", text: "Hi, this is a follow-up regarding your intake request." },
    { id: "leg_disclosure", type: "disclosure", text: "This is not legal advice. Attorney-client relationship requires a signed agreement.", required_ack: true },
    { id: "leg_consent", type: "consent", text: "Do we have your consent to discuss your matter?", required_ack: true },
    { id: "leg_close", type: "close", text: "Thank you. The office will follow up." },
  ],
};

const GENERIC_BLOCKS: CallScriptBlock[] = [
  { id: "gen_open", type: "opening", text: "Hi, this is a follow-up call." },
  { id: "gen_disclosure", type: "disclosure", text: "This call may be recorded.", required_ack: true },
  { id: "gen_close", type: "close", text: "Thank you. We will send the next steps by message." },
];

export function getCallScriptBlocksForDomain(domainType: string): CallScriptBlock[] {
  return CALL_SCRIPT_PRESETS[domainType] ?? GENERIC_BLOCKS;
}
