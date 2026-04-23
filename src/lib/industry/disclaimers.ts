/**
 * Phase 13d — Industry disclaimer engine.
 *
 * Returns the legally-required (or strongly-recommended) disclosures a live
 * sales/support agent must be able to speak, per industry + state + channel.
 *
 * Why this exists
 * ----------------
 *   * HIPAA — healthcare/dental/mental-health agents need a privacy notice
 *     before they collect PHI over the phone.
 *   * FINRA / SEC — broker-dealers and RIAs must disclose licensing, that
 *     communications may be recorded, and that past performance ≠ future.
 *   * State Bar advertising rules — California, New York, Florida, Texas and
 *     every other state require attorney advertising disclaimers, including
 *     "Attorney Advertising" on outbound marketing and "results depend on
 *     facts of your case" style language.
 *   * FTC Used Car Rule / FTC Act — auto dealerships must not misrepresent,
 *     and the Buyer's Guide must be mentioned. Telemarketers also owe the
 *     TSR mini-Miranda on outbound calls to residential numbers.
 *   * Fair Housing Act + state real-estate rules — real estate agents must
 *     disclose brokerage status and cannot make protected-class statements.
 *   * Debt collection — FDCPA mini-Miranda ("This is an attempt to collect
 *     a debt…") on every call.
 *   * State recording-consent — "all party" states (CA, FL, IL, MA, MD, MT,
 *     NH, PA, WA, and parts of others) require every party to consent to
 *     call recording. "One party" states allow recording without the other
 *     party's consent, but best practice is to disclose anyway.
 *
 * Integration
 * ------------
 * Pure module — zero I/O. Two exports drive the rest of the codebase:
 *
 *   * `getRequiredDisclaimers(opts)` — returns the list of disclaimers that
 *     SHOULD be spoken for a given industry/state/channel.
 *   * `buildIndustryWorkspaceFacts(opts)` — returns a `Partial<WorkspaceFacts>`
 *     so the live guardrail (`hallucination-guard.ts`) whitelists compliant
 *     disclosure phrasing without false-positiving on it.
 *
 * Extending
 * ----------
 * Adding a new industry: append an entry to `INDUSTRY_DISCLAIMERS`. Adding
 * a state override: add to `STATE_OVERRIDES`. The registry is deliberately
 * literal (not regex) so legal can diff it.
 */

export type DisclaimerChannel = "voice" | "sms" | "email" | "any";
export type DisclaimerWhen =
  | "opening"
  | "before_data_collection"
  | "closing"
  | "recording_start"
  | "any";

export interface DisclaimerRule {
  /** Stable id so callers can suppress/allow individual rules. */
  id: string;
  /** The exact text the agent may speak. Kept short so TTS reads naturally. */
  text: string;
  /** Where the disclaimer must fire in the call. */
  whenRequired: DisclaimerWhen;
  /** Channel(s) the disclaimer applies to. "any" means every channel. */
  channel: DisclaimerChannel;
  /** Citation / rationale for audit. */
  citation: string;
  /** If true, the agent MUST say this — else it is strongly recommended. */
  required: boolean;
}

export interface DisclaimerQuery {
  /** Canonical industry id (see src/lib/constants/industries.ts). */
  industry: string | null | undefined;
  /** Two-letter US state code, uppercase. Optional for non-state-specific. */
  state?: string | null;
  /** Which channel the disclaimer will appear in. */
  channel?: DisclaimerChannel;
  /** Set to true if the conversation involves debt collection. */
  isDebtCollection?: boolean;
  /** Set to true if the call/message is recorded. */
  isRecorded?: boolean;
}

// ---------------------------------------------------------------------------
// Base disclaimers by industry.
// ---------------------------------------------------------------------------

const HIPAA_DISCLAIMER: DisclaimerRule = {
  id: "hipaa_notice",
  text:
    "Before we continue, any health information you share is protected under our HIPAA privacy practices and will only be used to provide your care and coordinate your appointment.",
  whenRequired: "before_data_collection",
  channel: "any",
  citation: "45 CFR §§ 164.520 (Notice of Privacy Practices)",
  required: true,
};

const _HIPAA_RECORDING_DISCLAIMER: DisclaimerRule = {
  id: "hipaa_recording",
  text:
    "For quality and safety, this call may be recorded and stored in accordance with our HIPAA privacy practices.",
  whenRequired: "recording_start",
  channel: "voice",
  citation: "45 CFR § 164.530 (Administrative requirements)",
  required: true,
};

const FINRA_ADVERTISING_DISCLAIMER: DisclaimerRule = {
  id: "finra_advertising",
  text:
    "I'm reaching out on behalf of a registered broker-dealer. This call is for informational purposes and isn't a solicitation in any state where we're not registered. Past performance does not guarantee future results.",
  whenRequired: "opening",
  channel: "voice",
  citation: "FINRA Rule 2210 (Communications with the Public)",
  required: true,
};

const RIA_ADVERTISING_DISCLAIMER: DisclaimerRule = {
  id: "ria_advertising",
  text:
    "I'm calling on behalf of a registered investment adviser. This conversation is educational and not individualized investment advice. Past performance does not guarantee future results.",
  whenRequired: "opening",
  channel: "voice",
  citation: "SEC Advisers Act Rule 206(4)-1 (Marketing Rule)",
  required: true,
};

const ATTORNEY_ADVERTISING_DISCLAIMER: DisclaimerRule = {
  id: "attorney_advertising",
  text:
    "This is attorney advertising. Contacting us does not create an attorney-client relationship, and prior results do not guarantee a similar outcome.",
  whenRequired: "opening",
  channel: "any",
  citation: "ABA Model Rule 7.1; state bar advertising rules",
  required: true,
};

const FAIR_HOUSING_DISCLAIMER: DisclaimerRule = {
  id: "fair_housing",
  text:
    "We're an equal housing opportunity provider and do not discriminate on the basis of race, color, religion, sex, familial status, national origin, disability, or any other protected class.",
  whenRequired: "any",
  channel: "any",
  citation: "42 U.S.C. § 3601 et seq. (Fair Housing Act)",
  required: true,
};

const INSURANCE_PRODUCER_DISCLAIMER: DisclaimerRule = {
  id: "insurance_producer",
  text:
    "I'm a licensed insurance producer calling on behalf of a licensed insurance company. This call may result in your being transferred to a licensed agent for quotes.",
  whenRequired: "opening",
  channel: "voice",
  citation: "State Department of Insurance producer licensing laws",
  required: true,
};

const FTC_USED_CAR_DISCLAIMER: DisclaimerRule = {
  id: "ftc_used_car",
  text:
    "If you're interested in a specific vehicle, the Buyer's Guide posted on the window is part of the sales contract and overrides any verbal statements I make.",
  whenRequired: "before_data_collection",
  channel: "any",
  citation: "16 CFR § 455 (FTC Used Car Rule)",
  required: true,
};

const TSR_MINI_MIRANDA: DisclaimerRule = {
  id: "tsr_mini_miranda",
  text:
    "Hi, this is a sales call on behalf of {{company_name}}. We're calling about {{sales_topic}}.",
  whenRequired: "opening",
  channel: "voice",
  citation: "16 CFR § 310.4(d) (Telemarketing Sales Rule)",
  required: true,
};

const FDCPA_MINI_MIRANDA: DisclaimerRule = {
  id: "fdcpa_mini_miranda",
  text:
    "This is an attempt to collect a debt. Any information obtained will be used for that purpose. This call is from a debt collector.",
  whenRequired: "opening",
  channel: "voice",
  citation: "15 U.S.C. § 1692e(11) (Fair Debt Collection Practices Act)",
  required: true,
};

const _CASL_DISCLAIMER: DisclaimerRule = {
  id: "casl_unsubscribe",
  text:
    "You can unsubscribe from future messages at any time by replying STOP.",
  whenRequired: "closing",
  channel: "sms",
  citation: "Canada's Anti-Spam Legislation (CASL) S.C. 2010, c. 23",
  required: true,
};

const CAN_SPAM_DISCLAIMER: DisclaimerRule = {
  id: "can_spam_unsubscribe",
  text:
    "You're receiving this because of your prior interest. You can unsubscribe at any time using the link below, and we'll honor that request within 10 business days.",
  whenRequired: "closing",
  channel: "email",
  citation: "15 U.S.C. § 7704 (CAN-SPAM Act)",
  required: true,
};

const TCPA_STOP_DISCLAIMER: DisclaimerRule = {
  id: "tcpa_sms_stop",
  text: "Reply STOP to opt out. Reply HELP for help. Msg & data rates may apply.",
  whenRequired: "closing",
  channel: "sms",
  citation: "47 U.S.C. § 227 (TCPA) + CTIA Short Code Monitoring Handbook",
  required: true,
};

const ONE_PARTY_RECORDING: DisclaimerRule = {
  id: "recording_one_party",
  text: "Just so you know, this call may be recorded for quality and training.",
  whenRequired: "recording_start",
  channel: "voice",
  citation: "One-party-consent statute (federal default, 18 U.S.C. § 2511(2)(d))",
  required: false,
};

const ALL_PARTY_RECORDING: DisclaimerRule = {
  id: "recording_all_party",
  text:
    "This call will be recorded for quality purposes. If you don't want the call recorded, let me know now and I'll stop the recording.",
  whenRequired: "recording_start",
  channel: "voice",
  citation: "All-party-consent state wiretap statute",
  required: true,
};

/** US states that require all-party consent for call recording. */
export const ALL_PARTY_CONSENT_STATES: ReadonlySet<string> = new Set([
  "CA", // Cal. Penal Code § 632
  "CT", // Conn. Gen. Stat. § 52-570d
  "FL", // Fla. Stat. § 934.03
  "IL", // 720 ILCS 5/14-2
  "MD", // Md. Code Ann., Cts. & Jud. Proc. § 10-402
  "MA", // Mass. Gen. Laws ch. 272, § 99
  "MI", // Mich. Comp. Laws § 750.539c (interpreted by courts)
  "MT", // Mont. Code Ann. § 45-8-213
  "NV", // Nev. Rev. Stat. § 200.620 (de facto)
  "NH", // N.H. Rev. Stat. § 570-A:2
  "PA", // 18 Pa. Cons. Stat. § 5704
  "WA", // Wash. Rev. Code § 9.73.030
  "OR", // in-person calls; some phone exceptions
]);

const INDUSTRY_DISCLAIMERS: Record<string, DisclaimerRule[]> = {
  // Healthcare family — HIPAA applies
  healthcare: [HIPAA_DISCLAIMER],
  medical: [HIPAA_DISCLAIMER],
  dental: [HIPAA_DISCLAIMER],
  mental_health: [HIPAA_DISCLAIMER],
  veterinary: [],
  senior_care: [HIPAA_DISCLAIMER],
  childcare: [],

  // Financial family
  financial_services: [FINRA_ADVERTISING_DISCLAIMER, RIA_ADVERTISING_DISCLAIMER],
  accounting: [
    {
      id: "cpa_engagement",
      text:
        "This conversation is for general information and does not by itself create a CPA engagement. A formal engagement letter would govern any work.",
      whenRequired: "opening",
      channel: "any",
      citation: "AICPA Code of Professional Conduct ET § 1.700",
      required: false,
    },
  ],
  insurance: [INSURANCE_PRODUCER_DISCLAIMER],

  // Legal
  legal: [ATTORNEY_ADVERTISING_DISCLAIMER],

  // Housing / real estate
  real_estate: [
    FAIR_HOUSING_DISCLAIMER,
    {
      id: "re_brokerage_disclosure",
      text:
        "I'm a licensed real estate agent calling on behalf of {{company_name}}. I represent the {{representation_side}} in this transaction.",
      whenRequired: "opening",
      channel: "any",
      citation: "State real estate commission agency disclosure rules",
      required: true,
    },
  ],
  property_mgmt: [FAIR_HOUSING_DISCLAIMER],

  // Automotive
  auto: [FTC_USED_CAR_DISCLAIMER],

  // B2B / SaaS / Marketing — generally TSR/mini-Miranda on outbound
  tech: [TSR_MINI_MIRANDA],
  marketing: [TSR_MINI_MIRANDA],
  b2b_sales: [TSR_MINI_MIRANDA],
  retail: [TSR_MINI_MIRANDA],
  events: [TSR_MINI_MIRANDA],

  // Fitness / spa / personal services — generally no mandatory federal
  // disclaimers; state-level auto-renewal rules handled in STATE_OVERRIDES.
  fitness: [],
  spa: [],
  salon: [],

  // Hospitality
  restaurant: [],
  catering: [],
  travel: [],

  // Home services — generally none federally
  home_services: [],
  plumbing: [],
  hvac: [],
  electrical: [],
  roofing: [],
  landscaping: [],
  cleaning: [],
  construction: [],
  contractors: [],
  moving: [],
  security: [],

  // Other
  education: [],
  nonprofit: [],
  government: [],
  photography: [],
  pet_services: [],
  logistics: [],
  manufacturing: [],
  professional_services: [],

  // Catch-all
  other: [],
};

// ---------------------------------------------------------------------------
// State-specific overrides (stack on top of industry defaults).
// ---------------------------------------------------------------------------

type StateOverride = {
  /** Apply only when industry matches (null = apply to any industry). */
  industry: string | null;
  rule: DisclaimerRule;
};

const STATE_OVERRIDES: Record<string, StateOverride[]> = {
  // California — several state-specific rules
  CA: [
    // Attorney-advertising additions under California Rule of Professional Conduct 7.1
    {
      industry: "legal",
      rule: {
        id: "ca_attorney_advertising",
        text:
          "This communication is attorney advertising under California Rule of Professional Conduct 7.1. No representation is made that the quality of services is greater than that of other lawyers.",
        whenRequired: "opening",
        channel: "any",
        citation: "Cal. Rules of Prof. Conduct 7.1",
        required: true,
      },
    },
    // California auto-renewal law
    {
      industry: "fitness",
      rule: {
        id: "ca_auto_renewal",
        text:
          "Under California law, if this purchase auto-renews we'll send you a reminder before we charge you, and you can cancel at any time.",
        whenRequired: "before_data_collection",
        channel: "any",
        citation: "Cal. Bus. & Prof. Code § 17601 et seq.",
        required: true,
      },
    },
    {
      industry: "tech",
      rule: {
        id: "ca_auto_renewal_tech",
        text:
          "If you sign up for an auto-renewing subscription, California law requires us to send you a renewal reminder and lets you cancel at any time.",
        whenRequired: "before_data_collection",
        channel: "any",
        citation: "Cal. Bus. & Prof. Code § 17601 et seq.",
        required: true,
      },
    },
  ],

  // New York — attorney advertising rules
  NY: [
    {
      industry: "legal",
      rule: {
        id: "ny_attorney_advertising",
        text:
          "Attorney Advertising. Prior results do not guarantee a similar outcome. This communication is issued pursuant to 22 NYCRR Part 1200.",
        whenRequired: "opening",
        channel: "any",
        citation: "22 NYCRR § 1200 (Part 7)",
        required: true,
      },
    },
  ],

  // Florida — attorney advertising + all-party recording
  FL: [
    {
      industry: "legal",
      rule: {
        id: "fl_attorney_advertising",
        text:
          "The hiring of a lawyer is an important decision that should not be based solely on advertisements. Before you decide, ask us to send you free written information about our qualifications and experience.",
        whenRequired: "opening",
        channel: "any",
        citation: "Fla. Bar Rule 4-7.14",
        required: true,
      },
    },
  ],

  // Texas — IABS for real estate
  TX: [
    {
      industry: "real_estate",
      rule: {
        id: "tx_iabs",
        text:
          "As a Texas real estate licensee I'm required to provide you with the Information About Brokerage Services (IABS) disclosure. I'll send that to you in writing today.",
        whenRequired: "opening",
        channel: "any",
        citation: "Tex. Occ. Code § 1101.558 (IABS)",
        required: true,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function normalizeIndustry(industry: string | null | undefined): string {
  if (!industry) return "other";
  return industry.toLowerCase().trim();
}

function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  const s = state.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

function applyChannelFilter(
  rules: DisclaimerRule[],
  channel: DisclaimerChannel,
): DisclaimerRule[] {
  if (channel === "any") return rules;
  return rules.filter((r) => r.channel === "any" || r.channel === channel);
}

function dedupeById(rules: DisclaimerRule[]): DisclaimerRule[] {
  const seen = new Set<string>();
  const out: DisclaimerRule[] = [];
  for (const r of rules) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

/**
 * Get the list of disclaimers a live agent should speak in the given context.
 *
 * The returned list is ordered: opening first, then before_data_collection,
 * recording_start, any, closing.
 */
export function getRequiredDisclaimers(
  q: DisclaimerQuery,
): DisclaimerRule[] {
  const industry = normalizeIndustry(q.industry);
  const state = normalizeState(q.state);
  const channel = q.channel ?? "any";

  const base: DisclaimerRule[] = [];
  base.push(...(INDUSTRY_DISCLAIMERS[industry] ?? []));

  // State overrides applicable to this industry (or "null" = any industry)
  if (state && STATE_OVERRIDES[state]) {
    for (const ov of STATE_OVERRIDES[state]) {
      if (ov.industry === null || ov.industry === industry) {
        base.push(ov.rule);
      }
    }
  }

  // Recording disclosure — choose one-party vs all-party based on state
  if (q.isRecorded && channel !== "sms" && channel !== "email") {
    if (state && ALL_PARTY_CONSENT_STATES.has(state)) {
      base.push(ALL_PARTY_RECORDING);
    } else {
      base.push(ONE_PARTY_RECORDING);
    }
  }

  // Debt collection mini-Miranda (industry-agnostic)
  if (q.isDebtCollection && (channel === "voice" || channel === "any")) {
    base.push(FDCPA_MINI_MIRANDA);
  }

  // SMS / email channel-specific additions (only when the caller asked
  // for that specific channel; skipped on "any" to avoid bloating voice
  // openings with SMS-only STOP text).
  if (channel === "sms") {
    base.push(TCPA_STOP_DISCLAIMER);
  } else if (channel === "email") {
    base.push(CAN_SPAM_DISCLAIMER);
  }

  const filtered = applyChannelFilter(base, channel);
  const deduped = dedupeById(filtered);

  // Deterministic ordering
  const orderRank: Record<DisclaimerWhen, number> = {
    opening: 0,
    before_data_collection: 1,
    recording_start: 2,
    any: 3,
    closing: 4,
  };
  return [...deduped].sort((a, b) => orderRank[a.whenRequired] - orderRank[b.whenRequired]);
}

export interface IndustryFactsOverlay {
  allowedPolicies: string[];
  allowedGuarantees: string[];
  allowedTimelines: string[];
}

/**
 * Build a `Partial<WorkspaceFacts>`-compatible overlay so the hallucination
 * guard whitelists the compliant disclosure phrasing. The live-guardrail
 * merges this with the caller's WorkspaceFacts before scanning utterances.
 *
 * Every disclaimer's text is added to `allowedPolicies` so that any
 * substring of it (e.g. "attorney advertising" or "past performance does
 * not guarantee future results") matches under the existing
 * `matchesAllowed` substring check.
 */
export function buildIndustryWorkspaceFacts(
  q: DisclaimerQuery,
): IndustryFactsOverlay {
  const rules = getRequiredDisclaimers(q);
  const policies: string[] = [];
  for (const r of rules) {
    policies.push(r.text);
    // Also add short token phrases so partial quoting is allowed.
    if (r.id === "hipaa_notice") {
      policies.push("HIPAA privacy practices");
      policies.push("HIPAA compliant");
      policies.push("HIPAA");
    } else if (r.id === "finra_advertising" || r.id === "ria_advertising") {
      policies.push("registered broker-dealer");
      policies.push("registered investment adviser");
      policies.push("past performance does not guarantee future results");
    } else if (r.id.startsWith("attorney_advertising") || r.id.endsWith("attorney_advertising")) {
      policies.push("attorney advertising");
      policies.push("prior results do not guarantee a similar outcome");
    } else if (r.id === "fair_housing") {
      policies.push("equal housing opportunity");
    } else if (r.id === "insurance_producer") {
      policies.push("licensed insurance producer");
    } else if (r.id === "ftc_used_car") {
      policies.push("Buyer's Guide");
    } else if (r.id === "fdcpa_mini_miranda") {
      policies.push("this is an attempt to collect a debt");
    }
  }
  return {
    allowedPolicies: policies,
    allowedGuarantees: [],
    allowedTimelines: [],
  };
}

/**
 * Convenience: merge an IndustryFactsOverlay onto an existing WorkspaceFacts-
 * shaped object. Kept loose on the return type so callers don't need to
 * import WorkspaceFacts.
 */
export function mergeIndustryFacts<
  T extends { allowedPolicies?: string[]; allowedGuarantees?: string[]; allowedTimelines?: string[] },
>(base: T, overlay: IndustryFactsOverlay): T {
  return {
    ...base,
    allowedPolicies: [...(base.allowedPolicies ?? []), ...overlay.allowedPolicies],
    allowedGuarantees: [...(base.allowedGuarantees ?? []), ...overlay.allowedGuarantees],
    allowedTimelines: [...(base.allowedTimelines ?? []), ...overlay.allowedTimelines],
  };
}
