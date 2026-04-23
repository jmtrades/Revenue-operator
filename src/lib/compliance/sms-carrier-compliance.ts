/**
 * Phase 15 — SMS carrier compliance.
 *
 * Two concerns, one module:
 *   1. CTIA-mandated keyword handling on inbound SMS (STOP, HELP, START, etc.).
 *      Required for every US A2P messaging program; failure to honor opt-out
 *      is a per-message TCPA violation ($500–$1500 statutory damages).
 *   2. 10DLC / A2P brand + campaign registration state tracking. Carriers
 *      enforce throughput tiers T1/T2/T3 and message-filter based on
 *      verification tier. Unregistered traffic is filtered or surcharged.
 *
 * Pure module — no I/O. Callers handle persistence.
 *
 * Sources:
 *   - CTIA Short Code Monitoring Handbook §3 (STOP/HELP requirements)
 *   - FCC TCPA (47 U.S.C. §227; 47 C.F.R. §64.1200)
 *   - The Campaign Registry (TCR) — brand/campaign vetting tiers
 *   - T-Mobile + AT&T 10DLC throughput policies
 */

/** Keywords that must immediately stop future messages (CTIA §3.2). */
export const OPT_OUT_KEYWORDS: ReadonlySet<string> = new Set([
  "stop",
  "stopall",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
  "opt-out",
  "optout",
  "remove",
  "revoke",
]);

/** Keywords that must return help text per CTIA §3.3. */
export const HELP_KEYWORDS: ReadonlySet<string> = new Set([
  "help",
  "info",
  "?",
]);

/** Keywords that re-subscribe a previously opted-out recipient. */
export const OPT_IN_KEYWORDS: ReadonlySet<string> = new Set([
  "start",
  "yes",
  "unstop",
]);

export type SmsKeywordIntent = "opt_out" | "help" | "opt_in" | "none";

export interface SmsKeywordClassification {
  intent: SmsKeywordIntent;
  matchedKeyword: string | null;
  /** The exact compliance-mandated reply (or null if none required). */
  requiredReply: string | null;
}

/**
 * Classify an inbound SMS body against CTIA-mandated keywords.
 *
 * Classification rules match CTIA guidance:
 *   - Single-word detection is required (after trimming + lowercase).
 *   - Punctuation-trailing variants must match ("STOP!", "stop.").
 *   - Leading/trailing whitespace is ignored.
 *   - Multi-word messages like "please STOP texting me" SHOULD also be
 *     treated as opt-out per TCPA — STOP in any position counts.
 */
export function classifySmsKeyword(
  rawBody: string,
  helpReply: string = "Reply STOP to unsubscribe. Msg&data rates may apply. Email support@example.com or call for help.",
  optOutReply: string = "You have been unsubscribed and will no longer receive messages. Reply START to re-subscribe.",
  optInReply: string = "You have been re-subscribed to messages. Reply STOP at any time to unsubscribe.",
): SmsKeywordClassification {
  const body = (rawBody ?? "").trim().toLowerCase();
  if (!body) {
    return { intent: "none", matchedKeyword: null, requiredReply: null };
  }

  // Literal "?" is a CTIA help trigger.
  if (body === "?") {
    return { intent: "help", matchedKeyword: "?", requiredReply: helpReply };
  }

  // Single-token exact match (fast path).
  const singleTokenStrip = body.replace(/[\s\p{P}]+/gu, "");
  if (OPT_OUT_KEYWORDS.has(singleTokenStrip)) {
    return {
      intent: "opt_out",
      matchedKeyword: singleTokenStrip,
      requiredReply: optOutReply,
    };
  }
  if (HELP_KEYWORDS.has(singleTokenStrip)) {
    return {
      intent: "help",
      matchedKeyword: singleTokenStrip,
      requiredReply: helpReply,
    };
  }
  if (OPT_IN_KEYWORDS.has(singleTokenStrip)) {
    return {
      intent: "opt_in",
      matchedKeyword: singleTokenStrip,
      requiredReply: optInReply,
    };
  }

  // Multi-word TCPA-safe detection: "please STOP texting me" must opt out.
  const tokens = body.split(/[\s\p{P}]+/u).filter(Boolean);
  for (const t of tokens) {
    if (OPT_OUT_KEYWORDS.has(t)) {
      return { intent: "opt_out", matchedKeyword: t, requiredReply: optOutReply };
    }
  }

  // HELP / START in multi-word only when message is short (<= 3 words), to
  // avoid false-positives on "I need help understanding your pricing".
  if (tokens.length <= 3) {
    for (const t of tokens) {
      if (HELP_KEYWORDS.has(t)) {
        return { intent: "help", matchedKeyword: t, requiredReply: helpReply };
      }
      if (OPT_IN_KEYWORDS.has(t)) {
        return { intent: "opt_in", matchedKeyword: t, requiredReply: optInReply };
      }
    }
  }

  return { intent: "none", matchedKeyword: null, requiredReply: null };
}

/* -------------------------- 10DLC / A2P ---------------------------------- */

/** The Campaign Registry brand vetting outcomes. */
export type TcrBrandStatus =
  | "unregistered"
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

/** Campaign-level status with the carriers. */
export type TcrCampaignStatus =
  | "unregistered"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

/**
 * Throughput tier assigned by carriers based on brand vetting score. Values
 * are messages-per-second to T-Mobile; AT&T / Verizon roughly mirror.
 */
export type A2pThroughputTier = "T1" | "T2" | "T3" | "T4" | "unregistered";

export interface A2pRegistrationState {
  brandStatus: TcrBrandStatus;
  campaignStatus: TcrCampaignStatus;
  /** Vetting score 0–100 from TCR; drives throughput tier. */
  vettingScore: number | null;
  useCase: string | null;
  sampleMessages: string[];
  /** ISO timestamp of last status refresh from TCR. */
  lastCheckedAt: string | null;
}

export interface A2pComplianceAssessment {
  tier: A2pThroughputTier;
  /** mps (messages per second) ceiling. Null = unrestricted person-to-person. */
  mpsCap: number | null;
  /** Daily message cap across all US carriers. Null = unrestricted. */
  dailyMessageCap: number | null;
  /** Whether the workspace can send A2P traffic at all. */
  canSend: boolean;
  /** Specific blockers / warnings surfaced for UI. */
  issues: string[];
  /** What the operator needs to do next to unlock higher throughput. */
  recommendedActions: string[];
}

/**
 * Compute what the workspace is allowed to do given its TCR state.
 *
 * Reference (T-Mobile Code of Conduct v2.5):
 *   Unregistered:  0 mps / 0 daily  (filtered)
 *   Unvetted/T4:   0.25 mps /  2000 daily
 *   Vetted T3:     1 mps /  3000 daily (score 0–25)
 *   Vetted T2:     3 mps / 30000 daily (score 26–75)
 *   Vetted T1:    75 mps / 200000 daily (score 76–100)
 */
export function assessA2pState(s: A2pRegistrationState): A2pComplianceAssessment {
  const issues: string[] = [];
  const recommendedActions: string[] = [];

  if (s.brandStatus === "unregistered") {
    issues.push("Brand is not registered with The Campaign Registry.");
    recommendedActions.push(
      "Register your business brand in Settings → Phone → 10DLC so carriers will deliver your SMS.",
    );
  }
  if (s.brandStatus === "rejected" || s.brandStatus === "suspended") {
    issues.push(`Brand status is ${s.brandStatus} — A2P traffic will be blocked.`);
    recommendedActions.push(
      "Review TCR rejection reason and re-submit brand with corrected information.",
    );
  }
  if (s.brandStatus === "pending") {
    issues.push("Brand is pending TCR review; messaging may be filtered until vetted.");
  }

  if (s.campaignStatus === "unregistered") {
    issues.push("Campaign use-case is not registered; all A2P traffic will be filtered.");
    recommendedActions.push(
      "Submit a campaign with your use-case (2FA, marketing, customer care, etc.) and sample messages.",
    );
  }
  if (s.campaignStatus === "rejected") {
    issues.push("Campaign was rejected by carriers.");
    recommendedActions.push(
      "Review campaign rejection reason, update sample messages to comply with carrier content policy, and re-submit.",
    );
  }
  if (s.campaignStatus === "suspended") {
    issues.push("Campaign has been suspended by carriers due to complaint rate.");
    recommendedActions.push(
      "Review recent campaigns for opt-in hygiene; reduce send volume; contact TCR support for reinstatement.",
    );
  }
  if (!s.sampleMessages || s.sampleMessages.length === 0) {
    if (s.campaignStatus === "unregistered" || s.campaignStatus === "rejected") {
      recommendedActions.push(
        "Provide at least 2 sample messages reflecting real campaign content.",
      );
    }
  }
  if (s.useCase === null || s.useCase === "") {
    if (s.campaignStatus === "unregistered") {
      recommendedActions.push(
        "Choose a use-case (marketing, mixed, 2FA, customer care, account notifications).",
      );
    }
  }

  // Determine throughput tier.
  let tier: A2pThroughputTier = "unregistered";
  let mpsCap: number | null = 0;
  let dailyMessageCap: number | null = 0;
  let canSend = false;

  if (
    s.brandStatus === "verified" &&
    s.campaignStatus === "approved"
  ) {
    canSend = true;
    const score = typeof s.vettingScore === "number" ? s.vettingScore : 0;
    if (score >= 76) {
      tier = "T1";
      mpsCap = 75;
      dailyMessageCap = 200_000;
    } else if (score >= 26) {
      tier = "T2";
      mpsCap = 3;
      dailyMessageCap = 30_000;
    } else if (score >= 1) {
      tier = "T3";
      mpsCap = 1;
      dailyMessageCap = 3_000;
    } else {
      tier = "T4";
      mpsCap = 0.25;
      dailyMessageCap = 2_000;
    }
  }

  return { tier, mpsCap, dailyMessageCap, canSend, issues, recommendedActions };
}

/**
 * Conservative caps when the operator has no TCR data at all — used to
 * gate outbound queue dispatch until registration is confirmed.
 */
export function unregisteredDefault(): A2pComplianceAssessment {
  return assessA2pState({
    brandStatus: "unregistered",
    campaignStatus: "unregistered",
    vettingScore: null,
    useCase: null,
    sampleMessages: [],
    lastCheckedAt: null,
  });
}
