/**
 * Industry-Specific Lead Scoring Templates
 *
 * Different industries have different signals that indicate buying intent.
 * A lead calling back within 1 hour means different things for HVAC vs real estate.
 *
 * Each industry template defines:
 * - Weight adjustments for the 5 scoring factors
 * - Industry-specific signal boosts/penalties
 * - Average deal values for revenue recovery estimates
 * - Typical sales cycle length for urgency calibration
 */

export interface IndustryScoreProfile {
  industry: string;
  label: string;
  /** Weight multipliers for the 5 base scoring factors (sum should ≈ 1.0) */
  weights: {
    callEngagement: number;     // Default: 0.30
    outcomeQuality: number;     // Default: 0.25
    sentiment: number;          // Default: 0.15
    recency: number;            // Default: 0.15
    profileCompleteness: number; // Default: 0.15
  };
  /** Bonus points for industry-specific positive signals */
  signalBoosts: SignalBoost[];
  /** Penalty points for industry-specific negative signals */
  signalPenalties: SignalPenalty[];
  /** Average deal value in cents */
  avgDealValueCents: number;
  /** Typical sales cycle in days */
  typicalCycleDays: number;
  /** How quickly leads go cold (hours) */
  coldThresholdHours: number;
  /** Speed-to-lead importance (1-10) */
  speedToLeadImportance: number;
}

interface SignalBoost {
  signal: string;
  points: number;
  description: string;
}

interface SignalPenalty {
  signal: string;
  points: number;
  description: string;
}

export const INDUSTRY_PROFILES: Record<string, IndustryScoreProfile> = {
  hvac: {
    industry: "hvac",
    label: "HVAC / Home Services",
    weights: {
      callEngagement: 0.35,     // Calls are king — service requests happen via phone
      outcomeQuality: 0.25,
      sentiment: 0.10,          // Less important — urgency matters more
      recency: 0.20,            // Very time-sensitive — broken AC = immediate need
      profileCompleteness: 0.10,
    },
    signalBoosts: [
      { signal: "callback_within_1h", points: 15, description: "Called back within 1 hour — likely emergency" },
      { signal: "after_hours_call", points: 10, description: "After-hours call indicates urgency" },
      { signal: "multiple_calls_same_day", points: 12, description: "Multiple calls = high intent" },
      { signal: "address_provided", points: 8, description: "Shared address — ready for service visit" },
    ],
    signalPenalties: [
      { signal: "price_shopping", points: -10, description: "Asked for quote comparison — low commitment" },
      { signal: "no_answer_3x", points: -15, description: "3+ missed calls — may have hired competitor" },
    ],
    avgDealValueCents: 45000,    // $450 average service call
    typicalCycleDays: 2,          // 1-3 days
    coldThresholdHours: 48,
    speedToLeadImportance: 10,    // Critical — first to call wins
  },

  real_estate: {
    industry: "real_estate",
    label: "Real Estate",
    weights: {
      callEngagement: 0.20,
      outcomeQuality: 0.30,     // Appointment/showing matters most
      sentiment: 0.15,
      recency: 0.15,
      profileCompleteness: 0.20, // Need to know budget, location, timeline
    },
    signalBoosts: [
      { signal: "appointment_booked", points: 20, description: "Showing/appointment = high intent" },
      { signal: "pre_approved", points: 15, description: "Pre-approved for mortgage" },
      { signal: "timeline_mentioned", points: 10, description: "Mentioned move-in timeline" },
      { signal: "budget_shared", points: 8, description: "Disclosed budget range" },
    ],
    signalPenalties: [
      { signal: "just_browsing", points: -12, description: "Explicitly said just browsing" },
      { signal: "no_timeline", points: -5, description: "No urgency indicators" },
    ],
    avgDealValueCents: 850000,    // $8,500 commission on avg sale
    typicalCycleDays: 90,
    coldThresholdHours: 168,      // 7 days — longer cycle
    speedToLeadImportance: 8,
  },

  dental: {
    industry: "dental",
    label: "Dental / Medical Practice",
    weights: {
      callEngagement: 0.25,
      outcomeQuality: 0.30,     // Appointment booked = revenue
      sentiment: 0.15,
      recency: 0.15,
      profileCompleteness: 0.15,
    },
    signalBoosts: [
      { signal: "appointment_booked", points: 20, description: "Appointment booked = conversion" },
      { signal: "insurance_verified", points: 10, description: "Insurance info provided" },
      { signal: "pain_mentioned", points: 12, description: "Pain/emergency = immediate need" },
      { signal: "new_patient", points: 8, description: "New patient intake — high LTV" },
    ],
    signalPenalties: [
      { signal: "no_insurance", points: -5, description: "No insurance — may be price-sensitive" },
      { signal: "cancelled_twice", points: -15, description: "2+ cancellations — low commitment" },
    ],
    avgDealValueCents: 120000,    // $1,200 avg patient value/year
    typicalCycleDays: 7,
    coldThresholdHours: 72,
    speedToLeadImportance: 9,
  },

  legal: {
    industry: "legal",
    label: "Legal Services",
    weights: {
      callEngagement: 0.25,
      outcomeQuality: 0.25,
      sentiment: 0.20,          // Trust matters hugely in legal
      recency: 0.15,
      profileCompleteness: 0.15,
    },
    signalBoosts: [
      { signal: "consultation_booked", points: 18, description: "Consultation scheduled" },
      { signal: "case_details_shared", points: 12, description: "Shared case details — trusts firm" },
      { signal: "referral", points: 15, description: "Referred by existing client" },
      { signal: "urgency_deadline", points: 10, description: "Mentioned deadline or court date" },
    ],
    signalPenalties: [
      { signal: "fee_objection", points: -8, description: "Objected to fees" },
      { signal: "shopping_lawyers", points: -10, description: "Consulting multiple firms" },
    ],
    avgDealValueCents: 500000,    // $5,000 avg case
    typicalCycleDays: 14,
    coldThresholdHours: 120,
    speedToLeadImportance: 7,
  },

  insurance: {
    industry: "insurance",
    label: "Insurance",
    weights: {
      callEngagement: 0.25,
      outcomeQuality: 0.30,
      sentiment: 0.10,
      recency: 0.20,            // Renewal dates are time-sensitive
      profileCompleteness: 0.15,
    },
    signalBoosts: [
      { signal: "renewal_date_near", points: 15, description: "Policy renewal within 30 days" },
      { signal: "life_event", points: 12, description: "Marriage, baby, home purchase — buying trigger" },
      { signal: "multiple_policies", points: 10, description: "Interested in bundling" },
      { signal: "claim_filed", points: 8, description: "Filed claim — locked into renewal" },
    ],
    signalPenalties: [
      { signal: "price_only", points: -10, description: "Only interested in cheapest quote" },
      { signal: "happy_with_current", points: -12, description: "Satisfied with existing provider" },
    ],
    avgDealValueCents: 200000,    // $2,000 annual premium
    typicalCycleDays: 30,
    coldThresholdHours: 168,
    speedToLeadImportance: 6,
  },

  auto_repair: {
    industry: "auto_repair",
    label: "Auto Repair / Dealership",
    weights: {
      callEngagement: 0.35,
      outcomeQuality: 0.25,
      sentiment: 0.10,
      recency: 0.20,
      profileCompleteness: 0.10,
    },
    signalBoosts: [
      { signal: "vehicle_issue_described", points: 12, description: "Described specific vehicle problem" },
      { signal: "appointment_booked", points: 15, description: "Service appointment scheduled" },
      { signal: "tow_needed", points: 18, description: "Vehicle needs towing — emergency" },
      { signal: "warranty_inquiry", points: 8, description: "Warranty question = ready to spend" },
    ],
    signalPenalties: [
      { signal: "diy_mention", points: -8, description: "Plans to fix it themselves" },
      { signal: "price_shopping", points: -10, description: "Getting quotes from multiple shops" },
    ],
    avgDealValueCents: 65000,     // $650 average repair
    typicalCycleDays: 3,
    coldThresholdHours: 48,
    speedToLeadImportance: 9,
  },

  saas: {
    industry: "saas",
    label: "SaaS / Software",
    weights: {
      callEngagement: 0.15,      // Less phone-centric
      outcomeQuality: 0.30,
      sentiment: 0.15,
      recency: 0.15,
      profileCompleteness: 0.25,  // Company size, role, use case matter
    },
    signalBoosts: [
      { signal: "demo_booked", points: 20, description: "Demo scheduled" },
      { signal: "decision_maker", points: 12, description: "Decision maker on call" },
      { signal: "budget_confirmed", points: 15, description: "Budget approved" },
      { signal: "integration_question", points: 8, description: "Asked about integrations — evaluating seriously" },
    ],
    signalPenalties: [
      { signal: "student_or_personal", points: -15, description: "Personal/student use — low revenue" },
      { signal: "no_budget", points: -10, description: "No budget allocated" },
    ],
    avgDealValueCents: 1200000,   // $12,000 annual contract
    typicalCycleDays: 45,
    coldThresholdHours: 168,
    speedToLeadImportance: 5,
  },

  general: {
    industry: "general",
    label: "General Business",
    weights: {
      callEngagement: 0.30,
      outcomeQuality: 0.25,
      sentiment: 0.15,
      recency: 0.15,
      profileCompleteness: 0.15,
    },
    signalBoosts: [],
    signalPenalties: [],
    avgDealValueCents: 50000,
    typicalCycleDays: 14,
    coldThresholdHours: 168,
    speedToLeadImportance: 7,
  },
};

/**
 * Get the scoring profile for a workspace's industry.
 */
export function getIndustryProfile(industry: string | null | undefined): IndustryScoreProfile {
  if (!industry) return INDUSTRY_PROFILES.general;
  const key = industry.toLowerCase().replace(/[\s-]/g, "_");
  return INDUSTRY_PROFILES[key] ?? INDUSTRY_PROFILES.general;
}

/**
 * Apply industry-specific adjustments to a base lead score.
 */
export function applyIndustryAdjustments(
  baseScore: number,
  industry: string | null | undefined,
  signals: string[]
): { adjustedScore: number; appliedBoosts: string[]; appliedPenalties: string[] } {
  const profile = getIndustryProfile(industry);
  let adjusted = baseScore;
  const appliedBoosts: string[] = [];
  const appliedPenalties: string[] = [];

  for (const boost of profile.signalBoosts) {
    if (signals.includes(boost.signal)) {
      adjusted += boost.points;
      appliedBoosts.push(`${boost.signal} (+${boost.points})`);
    }
  }

  for (const penalty of profile.signalPenalties) {
    if (signals.includes(penalty.signal)) {
      adjusted += penalty.points; // Already negative
      appliedPenalties.push(`${penalty.signal} (${penalty.points})`);
    }
  }

  return {
    adjustedScore: Math.max(0, Math.min(100, adjusted)),
    appliedBoosts,
    appliedPenalties,
  };
}

/**
 * Calculate industry-specific urgency decay.
 * Returns urgency score (0-100) based on hours since last contact.
 */
export function getIndustryUrgency(
  hoursSinceLastContact: number,
  industry: string | null | undefined
): number {
  const profile = getIndustryProfile(industry);
  const coldHours = profile.coldThresholdHours;

  if (hoursSinceLastContact <= 1) return 100;
  if (hoursSinceLastContact <= coldHours * 0.1) return 85;
  if (hoursSinceLastContact <= coldHours * 0.25) return 70;
  if (hoursSinceLastContact <= coldHours * 0.5) return 50;
  if (hoursSinceLastContact <= coldHours) return 30;
  return 10;
}
