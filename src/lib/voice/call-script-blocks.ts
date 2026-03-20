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
  healthcare: [
    { id: "hc_open", type: "opening", text: "Hi, this is a follow-up from your healthcare provider." },
    { id: "hc_disclosure", type: "disclosure", text: "This call may be recorded for quality purposes. Your health information is protected under HIPAA.", required_ack: true },
    { id: "hc_consent", type: "consent", text: "Can you confirm your date of birth for verification?", required_ack: true },
    { id: "hc_close", type: "close", text: "Thank you. We'll send a summary to your patient portal." },
  ],
  dental: [
    { id: "dn_open", type: "opening", text: "Hi, this is a follow-up from your dental office." },
    { id: "dn_disclosure", type: "disclosure", text: "This call may be recorded. Your dental records are kept confidential per HIPAA guidelines.", required_ack: true },
    { id: "dn_close", type: "close", text: "Thank you. You'll receive a confirmation shortly." },
  ],
  accounting: [
    { id: "acc_open", type: "opening", text: "Hi, this is a follow-up regarding your financial services." },
    { id: "acc_disclosure", type: "disclosure", text: "This call may be recorded. Any advice discussed is general in nature and does not constitute formal tax or financial advice until an engagement letter is signed.", required_ack: true },
    { id: "acc_consent", type: "consent", text: "Do we have your permission to discuss your account details on this call?", required_ack: true },
    { id: "acc_close", type: "close", text: "Thank you. We'll send a follow-up with next steps." },
  ],
  auto_repair: [
    { id: "ar_open", type: "opening", text: "Hi, this is a follow-up about your vehicle service." },
    { id: "ar_disclosure", type: "disclosure", text: "This call may be recorded. Any estimates given are subject to final inspection.", required_ack: true },
    { id: "ar_close", type: "close", text: "Thank you. We'll text you a confirmation." },
  ],
  fitness: [
    { id: "fit_open", type: "opening", text: "Hi, this is a follow-up from your fitness center." },
    { id: "fit_disclosure", type: "disclosure", text: "This call may be recorded. Membership terms are subject to our written agreement.", required_ack: true },
    { id: "fit_consent", type: "consent", text: "Would you like to review membership options on this call?", required_ack: true },
    { id: "fit_close", type: "close", text: "Thank you. We'll send the details by text or email." },
  ],
  contractor: [
    { id: "con_open", type: "opening", text: "Hi, this is a follow-up about your project estimate." },
    { id: "con_disclosure", type: "disclosure", text: "This call may be recorded. All estimates are subject to on-site inspection and written agreement.", required_ack: true },
    { id: "con_close", type: "close", text: "Thank you. We'll send the estimate details over shortly." },
  ],
  roofing: [
    { id: "rf_open", type: "opening", text: "Hi, this is a follow-up about your roofing inquiry." },
    { id: "rf_disclosure", type: "disclosure", text: "This call may be recorded. All quotes require on-site inspection. We are licensed and insured.", required_ack: true },
    { id: "rf_close", type: "close", text: "Thank you. We'll get that estimate to you right away." },
  ],
  medspa: [
    { id: "ms_open", type: "opening", text: "Hi, this is a follow-up from your med spa consultation." },
    { id: "ms_disclosure", type: "disclosure", text: "This call may be recorded. Treatment results vary by individual. A consultation is required before any procedure.", required_ack: true },
    { id: "ms_consent", type: "consent", text: "Are you comfortable discussing your treatment goals on this call?", required_ack: true },
    { id: "ms_close", type: "close", text: "Thank you. We'll send you consultation details." },
  ],
  veterinary: [
    { id: "vet_open", type: "opening", text: "Hi, this is a follow-up from your veterinary clinic." },
    { id: "vet_disclosure", type: "disclosure", text: "This call may be recorded. Treatment recommendations are based on examination. Emergency cases should come in immediately.", required_ack: true },
    { id: "vet_close", type: "close", text: "Thank you. We'll send appointment details shortly." },
  ],
  hvac: [
    { id: "hvac_open", type: "opening", text: "Hi, this is a follow-up about your HVAC service request." },
    { id: "hvac_disclosure", type: "disclosure", text: "This call may be recorded. Service estimates are subject to on-site inspection.", required_ack: true },
    { id: "hvac_close", type: "close", text: "Thank you. We'll confirm your service appointment shortly." },
  ],
  home_services: [
    { id: "hs_open", type: "opening", text: "Hi, this is a follow-up about your home service request." },
    { id: "hs_disclosure", type: "disclosure", text: "This call may be recorded. All work is subject to a written agreement and on-site assessment.", required_ack: true },
    { id: "hs_close", type: "close", text: "Thank you. We'll send you the details right away." },
  ],
  restaurant: [
    { id: "rest_open", type: "opening", text: "Hi, thanks for calling! How can I help you today?" },
    { id: "rest_disclosure", type: "disclosure", text: "This call may be recorded for quality purposes.", required_ack: false },
    { id: "rest_close", type: "close", text: "Thank you! We look forward to seeing you." },
  ],
  plumbing: [
    { id: "plb_open", type: "opening", text: "Hi, this is a follow-up about your plumbing service request." },
    { id: "plb_disclosure", type: "disclosure", text: "This call may be recorded. Estimates are subject to on-site inspection.", required_ack: true },
    { id: "plb_close", type: "close", text: "Thank you. We'll confirm your service window shortly." },
  ],
  electrical: [
    { id: "elec_open", type: "opening", text: "Hi, this is a follow-up about your electrical service request." },
    { id: "elec_disclosure", type: "disclosure", text: "This call may be recorded. All electrical work is performed by licensed electricians to code.", required_ack: true },
    { id: "elec_close", type: "close", text: "Thank you. We'll send your appointment confirmation." },
  ],
  property_management: [
    { id: "pm_open", type: "opening", text: "Hi, this is a follow-up regarding your property inquiry." },
    { id: "pm_disclosure", type: "disclosure", text: "This call may be recorded. Lease terms and availability are subject to verification.", required_ack: true },
    { id: "pm_consent", type: "consent", text: "Can I confirm which property you're inquiring about?", required_ack: true },
    { id: "pm_close", type: "close", text: "Thank you. We'll send the details to your email." },
  ],
  ecommerce: [
    { id: "ec_open", type: "opening", text: "Hi, thanks for calling! How can I help with your order?" },
    { id: "ec_disclosure", type: "disclosure", text: "This call may be recorded for quality and training purposes.", required_ack: false },
    { id: "ec_close", type: "close", text: "Thank you for your order! You'll receive a confirmation email shortly." },
  ],
  education: [
    { id: "edu_open", type: "opening", text: "Hi, thanks for calling! How can I help you today?" },
    { id: "edu_disclosure", type: "disclosure", text: "This call may be recorded. Student information is protected under FERPA.", required_ack: true },
    { id: "edu_consent", type: "consent", text: "Can you verify the student's name for our records?", required_ack: true },
    { id: "edu_close", type: "close", text: "Thank you. We'll send enrollment details to your email." },
  ],
  financial_services: [
    { id: "fin_open", type: "opening", text: "Hi, this is a follow-up regarding your financial services inquiry." },
    { id: "fin_disclosure", type: "disclosure", text: "This call may be recorded. Any information discussed is general in nature and does not constitute financial advice until an advisory agreement is signed.", required_ack: true },
    { id: "fin_consent", type: "consent", text: "Do we have your permission to discuss your financial situation on this call?", required_ack: true },
    { id: "fin_close", type: "close", text: "Thank you. We'll send a summary and next steps." },
  ],
  beauty_salon: [
    { id: "bs_open", type: "opening", text: "Hi, thanks for calling! How can we help you look your best?" },
    { id: "bs_disclosure", type: "disclosure", text: "This call may be recorded for quality purposes.", required_ack: false },
    { id: "bs_close", type: "close", text: "Thank you! We'll send your appointment confirmation." },
  ],
  photography: [
    { id: "photo_open", type: "opening", text: "Hi, thanks for calling! How can I help with your photography needs?" },
    { id: "photo_disclosure", type: "disclosure", text: "This call may be recorded. Session terms and pricing are outlined in our booking agreement.", required_ack: true },
    { id: "photo_close", type: "close", text: "Thank you! We'll send your session details and contract." },
  ],
  pet_grooming: [
    { id: "pg_open", type: "opening", text: "Hi, thanks for calling! How can we help your furry friend?" },
    { id: "pg_disclosure", type: "disclosure", text: "This call may be recorded. Grooming services require up-to-date vaccination records.", required_ack: true },
    { id: "pg_close", type: "close", text: "Thank you! We'll see you and your pet soon." },
  ],
  chiropractor: [
    { id: "chiro_open", type: "opening", text: "Hi, this is a follow-up from your chiropractic office." },
    { id: "chiro_disclosure", type: "disclosure", text: "This call may be recorded. Treatment plans are based on examination. Your health information is protected under HIPAA.", required_ack: true },
    { id: "chiro_close", type: "close", text: "Thank you. We'll send your appointment details." },
  ],
  pharmacy: [
    { id: "rx_open", type: "opening", text: "Hi, thanks for calling! How can I help you today?" },
    { id: "rx_disclosure", type: "disclosure", text: "This call may be recorded. Your prescription information is protected under HIPAA. We cannot provide medical advice — please consult your physician.", required_ack: true },
    { id: "rx_close", type: "close", text: "Thank you. Your prescription will be ready at the time noted." },
  ],
  travel: [
    { id: "trav_open", type: "opening", text: "Hi, thanks for calling! Where are you dreaming of going?" },
    { id: "trav_disclosure", type: "disclosure", text: "This call may be recorded. Travel packages are subject to availability and supplier terms.", required_ack: true },
    { id: "trav_close", type: "close", text: "Thank you! We'll email your itinerary and booking details." },
  ],
  recruiting: [
    { id: "rec_open", type: "opening", text: "Hi, this is a follow-up regarding your staffing needs." },
    { id: "rec_disclosure", type: "disclosure", text: "This call may be recorded. Candidate information is kept confidential per our privacy policy.", required_ack: true },
    { id: "rec_consent", type: "consent", text: "Can we discuss the role details and your requirements?", required_ack: true },
    { id: "rec_close", type: "close", text: "Thank you. We'll send qualified candidate profiles within 48 hours." },
  ],
  cleaning: [
    { id: "cln_open", type: "opening", text: "Hi, this is a follow-up about your cleaning service request." },
    { id: "cln_disclosure", type: "disclosure", text: "This call may be recorded. All team members are background-checked and insured.", required_ack: true },
    { id: "cln_close", type: "close", text: "Thank you. We'll confirm your cleaning appointment." },
  ],
  landscaping: [
    { id: "land_open", type: "opening", text: "Hi, this is a follow-up about your landscaping project." },
    { id: "land_disclosure", type: "disclosure", text: "This call may be recorded. Estimates are based on property assessment.", required_ack: true },
    { id: "land_close", type: "close", text: "Thank you. We'll send your estimate details." },
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
