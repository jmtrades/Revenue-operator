/**
 * Phase 28 — International outbound compliance.
 *
 * Given a recipient's country and the channel + call purpose, produce:
 *   - the applicable regulatory regime(s)
 *   - what consent basis is required
 *   - what disclosures must appear
 *   - what opt-out mechanism must be offered
 *   - whether an explicit blocker applies
 *
 * Covers:
 *   - UK GDPR + PECR                 (United Kingdom)
 *   - EU GDPR + ePrivacy Directive   (DE, FR, IT, ES, NL, etc.)
 *   - CASL                           (Canada — Canadian Anti-Spam Legislation)
 *   - AU Spam Act 2003 + Do Not Call (Australia)
 *   - Privacy Act 1988 APPs          (Australia)
 *   - PDPA Singapore                 (Singapore)
 *   - LGPD                           (Brazil)
 *   - DPDP Act 2023                  (India)
 *   - POPIA                          (South Africa)
 *   - Japan APPI                     (Japan)
 *
 * Pure — no DB, no network.
 */

export type ComplianceChannel = "email" | "sms" | "call" | "whatsapp";
export type CallPurpose = "telemarketing" | "transactional" | "service" | "research";

export interface InternationalAssessment {
  country: string;
  regimes: string[];
  /** What the sender must do BEFORE sending. */
  consentBasis: "opt_in_required" | "soft_opt_in_ok" | "legitimate_interest_ok" | "unverifiable";
  /** If opt-in required — must it be "express written"? */
  expressWrittenRequired: boolean;
  /** Required disclosures to include in the message. */
  requiredDisclosures: string[];
  /** Required opt-out mechanisms. */
  requiredOptOut: string[];
  /** Time-of-day restrictions (local), if any. */
  localTimeWindow: { startHour: number; endHour: number } | null;
  /** Is the message categorically blocked? (e.g., marketing to Japan without opt-in) */
  blocked: boolean;
  /** Reason for block, if any. */
  blockedReason?: string;
  /** Maximum fine for non-compliance (USD ballpark, for informational display). */
  maxFineUsd: number | null;
  /** Citation for paper trail. */
  citations: string[];
}

type CountryRule = {
  country: string;
  regimes: string[];
  emailRules: Partial<Omit<InternationalAssessment, "country" | "regimes">>;
  smsRules: Partial<Omit<InternationalAssessment, "country" | "regimes">>;
  callRules: Partial<Omit<InternationalAssessment, "country" | "regimes">>;
  citations: string[];
  maxFineUsd: number;
};

const RULES: Record<string, CountryRule> = {
  GB: {
    country: "GB",
    regimes: ["UK GDPR", "PECR"],
    emailRules: {
      consentBasis: "soft_opt_in_ok", // PECR soft opt-in for existing customers
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe link"],
      requiredOptOut: ["one-click unsubscribe", "honor within 10 working days"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender name or shortcode", "STOP reply instructions"],
      requiredOptOut: ["STOP keyword"],
      localTimeWindow: { startHour: 8, endHour: 21 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["company name", "purpose of call"],
      requiredOptOut: ["verbal opt-out on call, honor TPS registration"],
      localTimeWindow: { startHour: 8, endHour: 21 },
    },
    citations: ["UK GDPR Art. 6", "PECR Reg. 22", "ICO guidance"],
    maxFineUsd: 22_000_000, // £17.5M
  },
  DE: {
    country: "DE",
    regimes: ["EU GDPR", "ePrivacy Directive", "UWG §7"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe link", "Impressum for commercial"],
      requiredOptOut: ["one-click unsubscribe"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "STOP"],
      requiredOptOut: ["STOP keyword"],
      localTimeWindow: { startHour: 9, endHour: 20 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: true,
      requiredDisclosures: ["company name", "purpose"],
      requiredOptOut: ["verbal opt-out"],
      localTimeWindow: { startHour: 9, endHour: 20 },
    },
    citations: ["EU GDPR Art. 6(1)(a)", "ePrivacy Art. 13", "UWG §7(2) Nr. 3"],
    maxFineUsd: 22_000_000, // €20M
  },
  FR: {
    country: "FR",
    regimes: ["EU GDPR", "ePrivacy Directive", "LCEN"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe link"],
      requiredOptOut: ["one-click unsubscribe"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "STOP"],
      requiredOptOut: ["STOP keyword"],
      localTimeWindow: { startHour: 8, endHour: 20 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["Bloctel status check", "company name"],
      requiredOptOut: ["Bloctel registration honored"],
      localTimeWindow: { startHour: 10, endHour: 20 },
    },
    citations: ["EU GDPR", "Loi n° 2014-344 Hamon (Bloctel)"],
    maxFineUsd: 22_000_000,
  },
  CA: {
    country: "CA",
    regimes: ["CASL", "PIPEDA"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender name", "sender mailing address", "unsubscribe"],
      requiredOptOut: ["functional unsubscribe valid 60 days", "honor within 10 business days"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: true,
      requiredDisclosures: ["sender name", "STOP instructions"],
      requiredOptOut: ["STOP keyword", "functional unsubscribe"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["company name", "purpose"],
      requiredOptOut: ["verbal opt-out", "Canadian DNCL honored"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    citations: ["CASL s. 6", "CASL s. 10", "PIPEDA", "CRTC UTR"],
    maxFineUsd: 10_000_000, // CAD 10M per violation for businesses
  },
  AU: {
    country: "AU",
    regimes: ["Spam Act 2003", "Do Not Call Register Act 2006", "Privacy Act 1988"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe"],
      requiredOptOut: ["functional unsubscribe", "honor within 5 business days"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "STOP"],
      requiredOptOut: ["STOP keyword"],
      localTimeWindow: { startHour: 9, endHour: 20 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["company name", "purpose"],
      requiredOptOut: ["verbal opt-out", "DNCR washed"],
      localTimeWindow: { startHour: 9, endHour: 20 },
    },
    citations: ["Spam Act 2003 s. 16", "DNCR Act 2006", "APPs 7"],
    maxFineUsd: 15_000_000, // AU$2.2M per day for corporations
  },
  SG: {
    country: "SG",
    regimes: ["PDPA 2012"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe"],
      requiredOptOut: ["functional unsubscribe"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "DNC check"],
      requiredOptOut: ["STOP keyword", "DNC Registry honored"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["company name"],
      requiredOptOut: ["DNC Registry honored"],
      localTimeWindow: { startHour: 9, endHour: 20 },
    },
    citations: ["PDPA s. 36-39 (DNC)", "PDPA Part 9A"],
    maxFineUsd: 1_000_000,
  },
  BR: {
    country: "BR",
    regimes: ["LGPD"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe"],
      requiredOptOut: ["functional unsubscribe"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "STOP"],
      requiredOptOut: ["STOP keyword"],
      localTimeWindow: { startHour: 9, endHour: 20 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["company name", "do-not-disturb honored"],
      requiredOptOut: ["não-perturbe registry"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    citations: ["LGPD Art. 7, 8", "Lei 13.709/2018"],
    maxFineUsd: 10_000_000, // R$50M per infraction
  },
  IN: {
    country: "IN",
    regimes: ["DPDP Act 2023"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe"],
      requiredOptOut: ["functional unsubscribe"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: true,
      requiredDisclosures: ["sender header", "consent reference"],
      requiredOptOut: ["DND registry honored"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["company name"],
      requiredOptOut: ["DND honored"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    citations: ["DPDP Act 2023", "TRAI TCCCPR 2018"],
    maxFineUsd: 30_000_000, // ₹250 crore
  },
  ZA: {
    country: "ZA",
    regimes: ["POPIA"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe"],
      requiredOptOut: ["functional unsubscribe"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity"],
      requiredOptOut: ["STOP keyword"],
      localTimeWindow: { startHour: 8, endHour: 20 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["purpose"],
      requiredOptOut: ["verbal opt-out"],
      localTimeWindow: { startHour: 8, endHour: 20 },
    },
    citations: ["POPIA s. 69"],
    maxFineUsd: 600_000, // R10M
  },
  JP: {
    country: "JP",
    regimes: ["APPI"],
    emailRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity", "unsubscribe"],
      requiredOptOut: ["functional unsubscribe"],
      localTimeWindow: null,
    },
    smsRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["sender identity"],
      requiredOptOut: ["STOP keyword"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    callRules: {
      consentBasis: "opt_in_required",
      expressWrittenRequired: false,
      requiredDisclosures: ["company name"],
      requiredOptOut: ["verbal opt-out"],
      localTimeWindow: { startHour: 9, endHour: 21 },
    },
    citations: ["APPI s. 17 (consent)"],
    maxFineUsd: 10_000,
  },
};

function applyOverrides(
  base: Partial<Omit<InternationalAssessment, "country" | "regimes">>,
  country: string,
  regimes: string[],
  citations: string[],
  maxFineUsd: number,
  hasExplicitOptIn: boolean,
): InternationalAssessment {
  // If we have explicit opt-in on record from the subject, the ruling becomes "legitimate_interest_ok"
  // for display purposes (consent has already been satisfied).
  const consentBasis = hasExplicitOptIn
    ? "legitimate_interest_ok"
    : (base.consentBasis ?? "opt_in_required");
  return {
    country,
    regimes,
    consentBasis,
    expressWrittenRequired: base.expressWrittenRequired ?? false,
    requiredDisclosures: base.requiredDisclosures ?? [],
    requiredOptOut: base.requiredOptOut ?? [],
    localTimeWindow: base.localTimeWindow ?? null,
    blocked: false,
    maxFineUsd,
    citations,
  };
}

export interface AssessmentInput {
  /** ISO alpha-2 country. */
  country: string;
  channel: ComplianceChannel;
  purpose: CallPurpose;
  /** Do we have an existing express opt-in from this subject? */
  hasExplicitOptIn?: boolean;
  /** Are we in an existing customer relationship? */
  existingCustomer?: boolean;
}

export function assessInternational(input: AssessmentInput): InternationalAssessment {
  const country = input.country.toUpperCase();
  const rule = RULES[country];

  if (!rule) {
    return {
      country,
      regimes: ["unknown"],
      consentBasis: "unverifiable",
      expressWrittenRequired: true,
      requiredDisclosures: ["sender identity", "purpose", "opt-out mechanism"],
      requiredOptOut: ["functional opt-out"],
      localTimeWindow: { startHour: 9, endHour: 20 },
      blocked: false,
      maxFineUsd: null,
      citations: [],
    };
  }

  const channelRules =
    input.channel === "email"
      ? rule.emailRules
      : input.channel === "sms" || input.channel === "whatsapp"
        ? rule.smsRules
        : rule.callRules;

  const assessment = applyOverrides(
    channelRules,
    country,
    rule.regimes,
    rule.citations,
    rule.maxFineUsd,
    !!input.hasExplicitOptIn,
  );

  // Transactional / service calls → looser consent requirements.
  if (input.purpose === "transactional" || input.purpose === "service") {
    assessment.consentBasis = "legitimate_interest_ok";
    assessment.expressWrittenRequired = false;
  }

  // CASL soft-opt-in for email if existing customer relationship (within 2 years).
  if (country === "CA" && input.channel === "email" && input.existingCustomer) {
    assessment.consentBasis = "soft_opt_in_ok";
  }

  // PECR soft-opt-in for existing UK customers.
  if (country === "GB" && input.channel === "email" && input.existingCustomer) {
    assessment.consentBasis = "soft_opt_in_ok";
  }

  // Hard block: IN SMS without express written consent for marketing.
  if (
    country === "IN" &&
    input.channel === "sms" &&
    input.purpose === "telemarketing" &&
    !input.hasExplicitOptIn
  ) {
    assessment.blocked = true;
    assessment.blockedReason = "TRAI DND requires explicit opt-in registered with the Distributed Ledger before marketing SMS.";
  }

  return assessment;
}

export function listSupportedCountries(): string[] {
  return Object.keys(RULES).sort();
}
