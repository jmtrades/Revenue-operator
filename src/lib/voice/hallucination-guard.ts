/**
 * Phase 12c.5 — Hallucination guard for voice agents.
 *
 * The most damaging failure mode of AI voice: the agent makes up pricing,
 * promises a feature we don't have, quotes a nonexistent policy, or commits
 * to timelines we can't hit. One viral clip of this on Reddit kills trust
 * across an entire customer base.
 *
 * Across all platforms researched in Phase 12a (Air AI, Synthflow, Retell,
 * Bland, Vapi), the #1 horror story is "the AI said the product does X and
 * it absolutely does not." Almost none of them ship a runtime guard.
 *
 * This module runs on every AI-generated utterance BEFORE it's spoken.
 * It flags statements where the agent asserts a specific fact (price,
 * feature, guarantee, policy, timeline) that isn't in the allow-list of
 * known facts for this workspace/agent.
 *
 * Deterministic. Pure function. No LLM.
 *
 * Actions taken by caller:
 *   - severity "block"   → swap utterance for a safe fallback or stay silent
 *   - severity "warn"    → emit audit event; agent keeps speaking
 *   - severity "allow"   → no action
 */

export type HallucinationSeverity = "block" | "warn" | "allow";

export type AssertionCategory =
  | "price"
  | "feature"
  | "guarantee"
  | "policy"
  | "timeline"
  | "availability"
  | "competitor_claim"
  | "compliance_claim";

export interface WorkspaceFacts {
  /** Allowed price quotes (exact strings or regexes). E.g. "$99/mo" or /\$\d+\/mo/. */
  allowedPrices?: (string | RegExp)[];
  /** Features we legitimately have. */
  allowedFeatures?: string[];
  /** Guarantees (refund policies, SLAs) we actually offer. */
  allowedGuarantees?: string[];
  /** Policies we can quote. */
  allowedPolicies?: string[];
  /** Timelines we can commit to (e.g. "same-day", "24 hours"). */
  allowedTimelines?: string[];
  /** Any string containing one of these blocked terms is always a violation. */
  blockedTerms?: string[];
}

export interface HallucinationFinding {
  severity: HallucinationSeverity;
  category: AssertionCategory;
  reason: string;
  matchedPhrase: string | null;
  /** Suggested replacement text if we blocked the utterance. */
  safeFallback: string | null;
}

export interface HallucinationScanResult {
  severity: HallucinationSeverity;
  findings: HallucinationFinding[];
  /** The utterance we scanned. */
  utterance: string;
  /** If any block-level finding exists, this is the recommended replacement. */
  recommendedReplacement: string | null;
}

// ---------------------------------------------------------------------------
// Assertion detectors — what kinds of claims the AI is making.
// ---------------------------------------------------------------------------

interface AssertionDetector {
  category: AssertionCategory;
  pattern: RegExp;
  /** Extractor pulls the asserted value out of the match for comparison. */
  extract: (match: RegExpExecArray) => string;
}

const ASSERTIONS: AssertionDetector[] = [
  // Price assertions: "$99/month", "costs $250", "starts at $1,500"
  {
    category: "price",
    pattern: /\$\s?[0-9][0-9,]*\.?\d*(?:\s?\/\s?(?:mo|month|yr|year|user|seat))?/gi,
    extract: (m) => m[0],
  },
  {
    category: "price",
    pattern: /\b(?:costs?|priced at|starts at|only|just)\s+\$?[0-9][0-9,]*\.?\d*\s?(?:dollars|bucks|per month|per year|\/mo|\/yr)?/gi,
    extract: (m) => m[0],
  },
  // Guarantees
  {
    category: "guarantee",
    pattern: /\b(money[- ]back guarantee|full refund|100% refund|satisfaction guaranteed|lifetime (?:guarantee|warranty)|no questions asked)\b/gi,
    extract: (m) => m[0],
  },
  // Policies
  {
    category: "policy",
    pattern: /\b(?:our|the|my) (?:policy|terms) (?:is|are|say|states?)\s+[^.!?]*/gi,
    extract: (m) => m[0],
  },
  // Timelines
  {
    category: "timeline",
    pattern: /\b(?:same[- ]day|next[- ]day|24[- ]hours?|48[- ]hours?|within (?:a |an )?(?:hour|day|week|month))\b/gi,
    extract: (m) => m[0],
  },
  // Compliance claims — usually invented
  {
    category: "compliance_claim",
    pattern: /\b(?:hipaa[- ]?compliant|soc ?2(?:[- ]type[- ]?[12])?(?: compliant)?|pci[- ]?compliant|fedramp|iso ?27001|gdpr[- ]?compliant)\b/gi,
    extract: (m) => m[0],
  },
  // Competitor claims — comparative assertions are risky
  {
    category: "competitor_claim",
    pattern: /\b(?:better than|superior to|unlike|cheaper than|faster than)\s+[A-Z][a-zA-Z0-9.&-]{1,40}/g,
    extract: (m) => m[0],
  },
  // Feature / availability
  {
    category: "feature",
    pattern: /\b(?:we|our (?:product|system|platform)|it|this) (?:can|does|supports?|includes?|offers?|integrates? with)\s+[^.!?,]{3,80}/gi,
    extract: (m) => m[0],
  },
  {
    category: "availability",
    pattern: /\b(?:available in|works in|supports?)\s+(?:all 50 states|every country|worldwide|globally)\b/gi,
    extract: (m) => m[0],
  },
];

// Phrases that are always blocking regardless of allowlist
const ALWAYS_BLOCK: RegExp[] = [
  /\bguaranteed (?:results?|return|roi|income)\b/i,
  /\byou('|’)ll (?:definitely|certainly|100%) (?:make|earn|save|get)\b/i,
  /\bfda[- ]approved\b/i,
  /\bclinically proven\b/i,
  /\bno risk\b/i,
  /\brisk[- ]?free\b/i,
];

// ---------------------------------------------------------------------------
// Matcher helpers
// ---------------------------------------------------------------------------

function matchesAllowed(value: string, allowed: (string | RegExp)[] | undefined): boolean {
  if (!allowed || allowed.length === 0) return false;
  const lower = value.toLowerCase();
  for (const a of allowed) {
    if (typeof a === "string") {
      if (lower.includes(a.toLowerCase())) return true;
    } else if (a.test(value)) {
      return true;
    }
  }
  return false;
}

function safeFallbackFor(category: AssertionCategory): string {
  switch (category) {
    case "price":
      return "Let me have someone confirm pricing with you — I want to make sure I give you the exact number.";
    case "feature":
      return "I want to double-check that before I commit to it. Let me have someone follow up and confirm.";
    case "guarantee":
      return "I don't want to overpromise on guarantees — let me get you the exact terms in writing.";
    case "policy":
      return "I want to read you our exact policy rather than paraphrase. I can email that over.";
    case "timeline":
      return "Let me confirm the timeline with the team so I give you an accurate date.";
    case "availability":
      return "Let me confirm availability in your area before I answer that definitively.";
    case "competitor_claim":
      return "I'd rather focus on what we do well than compare — can I walk you through how this would work for you?";
    case "compliance_claim":
      return "Let me have our compliance team confirm the exact certifications we hold and send that over.";
    default:
      return "Let me double-check that and get back to you with the accurate answer.";
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan an AI utterance for hallucination risk.
 *
 * Returns a list of findings plus an overall severity (worst of all findings).
 */
export function scanUtteranceForHallucinations(
  utterance: string,
  facts: WorkspaceFacts = {},
): HallucinationScanResult {
  const text = (utterance ?? "").trim();
  if (!text) {
    return { severity: "allow", findings: [], utterance: text, recommendedReplacement: null };
  }

  const findings: HallucinationFinding[] = [];

  // Always-block phrases first
  for (const r of ALWAYS_BLOCK) {
    const m = text.match(r);
    if (m) {
      findings.push({
        severity: "block",
        category: "guarantee",
        reason: "always_blocked_phrase",
        matchedPhrase: m[0],
        safeFallback: safeFallbackFor("guarantee"),
      });
    }
  }

  // Blocked-term list from workspace
  if (facts.blockedTerms && facts.blockedTerms.length) {
    const lower = text.toLowerCase();
    for (const term of facts.blockedTerms) {
      if (lower.includes(term.toLowerCase())) {
        findings.push({
          severity: "block",
          category: "policy",
          reason: "workspace_blocked_term",
          matchedPhrase: term,
          safeFallback: safeFallbackFor("policy"),
        });
      }
    }
  }

  // Assertion detectors
  for (const det of ASSERTIONS) {
    det.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = det.pattern.exec(text)) !== null) {
      const value = det.extract(m);
      let allowed = false;
      switch (det.category) {
        case "price":
          allowed = matchesAllowed(value, facts.allowedPrices);
          break;
        case "feature":
          allowed = matchesAllowed(value, facts.allowedFeatures);
          break;
        case "guarantee":
          allowed = matchesAllowed(value, facts.allowedGuarantees);
          break;
        case "policy":
          allowed = matchesAllowed(value, facts.allowedPolicies);
          break;
        case "timeline":
          allowed = matchesAllowed(value, facts.allowedTimelines);
          break;
        case "availability":
          // Default-deny sweeping availability claims
          allowed = matchesAllowed(value, facts.allowedPolicies);
          break;
        case "competitor_claim":
          // Always warn on comparative claims; never allow outright
          allowed = false;
          break;
        case "compliance_claim":
          allowed = matchesAllowed(value, facts.allowedPolicies);
          break;
      }

      if (!allowed) {
        const severity: HallucinationSeverity = det.category === "feature"
          ? "warn"
          : det.category === "competitor_claim"
            ? "warn"
            : "block";
        findings.push({
          severity,
          category: det.category,
          reason: `unverified_${det.category}_assertion`,
          matchedPhrase: value,
          safeFallback: safeFallbackFor(det.category),
        });
      }
      if (!det.pattern.global) break;
    }
  }

  // Roll up severity
  let severity: HallucinationSeverity = "allow";
  for (const f of findings) {
    if (f.severity === "block") { severity = "block"; break; }
    if (f.severity === "warn" && severity === "allow") severity = "warn";
  }

  const recommendedReplacement = severity === "block"
    ? findings.find((f) => f.severity === "block" && f.safeFallback)?.safeFallback ?? null
    : null;

  return { severity, findings, utterance: text, recommendedReplacement };
}

/**
 * Apply the scan and return the safe text to actually speak.
 *
 * If `severity === "block"`, returns the recommended replacement (or the
 * generic fallback). Otherwise returns the original utterance unchanged.
 */
export function enforceHallucinationGuard(
  utterance: string,
  facts: WorkspaceFacts = {},
): { text: string; scan: HallucinationScanResult; mutated: boolean } {
  const scan = scanUtteranceForHallucinations(utterance, facts);
  if (scan.severity === "block") {
    const replacement = scan.recommendedReplacement ?? safeFallbackFor("feature");
    return { text: replacement, scan, mutated: true };
  }
  return { text: utterance, scan, mutated: false };
}
