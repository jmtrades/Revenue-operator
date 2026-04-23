/**
 * Phase 26 — Win/loss reason extractor.
 *
 * Given a closed deal's structured signals (stage history, notes, call
 * transcripts, email replies) and optionally the stated outcome reason,
 * classify the outcome into:
 *   - primary reason (one of a taxonomy)
 *   - secondary reasons (0+)
 *   - competitive loss detail (who we lost to)
 *   - confidence score (0–1)
 *
 * Deterministic heuristic extractor — no LLM dependency. Callers can
 * layer LLM refinement on top; this module serves as the grounding layer.
 *
 * Reason taxonomy (tuned from RevOps literature + HubSpot/Salesforce
 * closed-lost dictionaries):
 *   WON:
 *     - price_competitive, feature_fit, relationship_trust, timing_urgent,
 *       incumbent_replacement, expansion_existing_customer
 *   LOST:
 *     - price_too_high, missing_feature, competitor_won, no_budget,
 *       no_decision_made, timing_wrong, lost_champion, internal_build,
 *       compliance_blocker, poor_fit, ghosted
 *     - For competitor_won, optionally include winningCompetitor.
 */

export type WinReason =
  | "price_competitive"
  | "feature_fit"
  | "relationship_trust"
  | "timing_urgent"
  | "incumbent_replacement"
  | "expansion_existing_customer";

export type LossReason =
  | "price_too_high"
  | "missing_feature"
  | "competitor_won"
  | "no_budget"
  | "no_decision_made"
  | "timing_wrong"
  | "lost_champion"
  | "internal_build"
  | "compliance_blocker"
  | "poor_fit"
  | "ghosted";

export type OutcomeReason = WinReason | LossReason;

export interface WinLossSignals {
  /** "won" or "lost". */
  outcome: "won" | "lost";
  /** Stated reason from the rep, if any. */
  statedReason?: string | null;
  /** Concatenated notes / transcript / email bodies. */
  conversationText: string;
  /** Was this a competitive deal per pipeline? */
  hadCompetitor?: boolean;
  /** Known competitor names — used to detect competitor_won. */
  knownCompetitors?: string[];
  /** Days since last rep touch (helps detect ghosted). */
  daysSinceLastTouch?: number | null;
  /** Was champion known to leave before close? */
  championDeparted?: boolean;
}

export interface WinLossResult {
  outcome: "won" | "lost";
  primaryReason: OutcomeReason;
  secondaryReasons: OutcomeReason[];
  winningCompetitor: string | null;
  confidence: number;
  matchedSignals: string[];
}

// Keyword dictionaries — ordered so more-specific come first.
const LOSS_KEYWORDS: Array<{ reason: LossReason; keywords: string[] }> = [
  { reason: "price_too_high", keywords: ["too expensive", "budget constraint", "price was high", "costs too much", "cheaper alternative", "too pricey", "over budget"] },
  { reason: "no_budget", keywords: ["no budget", "budget frozen", "budget is frozen", "no funding", "hiring freeze", "budget cut", "not in the budget", "budget frozen for"] },
  { reason: "missing_feature", keywords: ["missing feature", "needed feature", "doesn't support", "we need x", "lack of", "requirement not met", "doesn't do"] },
  { reason: "competitor_won", keywords: ["went with", "chose", "selected", "decided to go with", "signed with"] },
  { reason: "internal_build", keywords: ["build it in-house", "internal build", "build internally", "developing our own", "home-grown"] },
  { reason: "compliance_blocker", keywords: ["compliance issue", "security concern", "soc 2", "hipaa", "gdpr requirement", "legal blocker", "infosec"] },
  { reason: "lost_champion", keywords: ["champion left", "moved to", "new role", "departed"] },
  { reason: "timing_wrong", keywords: ["bad timing", "not right now", "revisit next quarter", "too early", "not ready"] },
  { reason: "no_decision_made", keywords: ["no decision", "pushed out", "punted", "deferred", "on hold indefinitely"] },
  { reason: "poor_fit", keywords: ["not the right fit", "wrong fit", "not a good match", "different use case"] },
  { reason: "ghosted", keywords: ["went dark", "stopped responding", "no response", "ghosted"] },
];

const WIN_KEYWORDS: Array<{ reason: WinReason; keywords: string[] }> = [
  { reason: "incumbent_replacement", keywords: ["replacing", "ripping out", "migrating from", "switching from"] },
  { reason: "expansion_existing_customer", keywords: ["upsell", "expansion", "existing customer", "already using"] },
  { reason: "price_competitive", keywords: ["price point", "better price", "discount", "deal worked"] },
  { reason: "feature_fit", keywords: ["exactly what we needed", "perfect fit", "checked every box", "required capability"] },
  { reason: "timing_urgent", keywords: ["urgent", "asap", "need by end of quarter", "fast track"] },
  { reason: "relationship_trust", keywords: ["trusted", "existing relationship", "know the team", "reference"] },
];

function normalize(t: string): string {
  return t.toLowerCase().replace(/\s+/g, " ").trim();
}

function findKeywords<T extends string>(
  text: string,
  dict: Array<{ reason: T; keywords: string[] }>,
): Array<{ reason: T; keyword: string }> {
  const hits: Array<{ reason: T; keyword: string }> = [];
  for (const entry of dict) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) {
        hits.push({ reason: entry.reason, keyword: kw });
      }
    }
  }
  return hits;
}

function detectCompetitor(text: string, competitors: readonly string[]): string | null {
  for (const c of competitors) {
    const normalized = c.toLowerCase();
    if (!normalized) continue;
    const patterns = [
      `went with ${normalized}`,
      `chose ${normalized}`,
      `selected ${normalized}`,
      `signed with ${normalized}`,
      `picked ${normalized}`,
      `decided to go with ${normalized}`,
    ];
    for (const p of patterns) {
      if (text.includes(p)) return c;
    }
  }
  // Generic: mention of known competitor near a decision verb.
  for (const c of competitors) {
    const normalized = c.toLowerCase();
    if (!normalized || !text.includes(normalized)) continue;
    if (/(chose|signed|picked|selected|went with|decided)/.test(text)) return c;
  }
  return null;
}

export function extractWinLoss(signals: WinLossSignals): WinLossResult {
  const text = normalize([signals.statedReason ?? "", signals.conversationText].join(" "));
  const matched: string[] = [];

  let winningCompetitor: string | null = null;
  if (signals.knownCompetitors && signals.knownCompetitors.length > 0) {
    winningCompetitor = detectCompetitor(text, signals.knownCompetitors);
  }

  if (signals.outcome === "lost") {
    const hits = findKeywords(text, LOSS_KEYWORDS);

    // Special-case signals.
    const specialReasons: LossReason[] = [];
    if (signals.championDeparted) {
      specialReasons.push("lost_champion");
      matched.push("champion_departed_signal");
    }
    if (winningCompetitor || signals.hadCompetitor) {
      // Only add if keywords don't already include competitor_won
      if (!hits.find((h) => h.reason === "competitor_won")) {
        specialReasons.push("competitor_won");
        matched.push(winningCompetitor ? `detected_competitor:${winningCompetitor}` : "had_competitor_flag");
      }
    }
    if (
      signals.daysSinceLastTouch !== null &&
      signals.daysSinceLastTouch !== undefined &&
      signals.daysSinceLastTouch > 30 &&
      hits.length === 0 &&
      !signals.championDeparted &&
      !winningCompetitor
    ) {
      specialReasons.push("ghosted");
      matched.push("no_touch_30d");
    }

    const allReasons: LossReason[] = [];
    for (const h of hits) {
      allReasons.push(h.reason);
      matched.push(`kw:${h.keyword}`);
    }
    for (const r of specialReasons) allReasons.push(r);

    if (allReasons.length === 0) {
      return {
        outcome: "lost",
        primaryReason: "no_decision_made",
        secondaryReasons: [],
        winningCompetitor: null,
        confidence: 0.2,
        matchedSignals: [],
      };
    }

    // Primary = first unique reason found. Dedupe preserving order.
    const seen = new Set<LossReason>();
    const ordered: LossReason[] = [];
    for (const r of allReasons) {
      if (!seen.has(r)) {
        seen.add(r);
        ordered.push(r);
      }
    }
    const primary = ordered[0];
    const secondary = ordered.slice(1);

    // Confidence — more distinct reasons = higher base, capped.
    const confidence = Math.min(0.95, 0.4 + Math.min(4, ordered.length) * 0.15);

    return {
      outcome: "lost",
      primaryReason: primary,
      secondaryReasons: secondary,
      winningCompetitor,
      confidence,
      matchedSignals: matched,
    };
  }

  // WON
  const hits = findKeywords(text, WIN_KEYWORDS);
  const all: WinReason[] = [];
  for (const h of hits) {
    all.push(h.reason);
    matched.push(`kw:${h.keyword}`);
  }
  if (all.length === 0) {
    return {
      outcome: "won",
      primaryReason: "feature_fit",
      secondaryReasons: [],
      winningCompetitor: null,
      confidence: 0.3,
      matchedSignals: [],
    };
  }
  const seen = new Set<WinReason>();
  const ordered: WinReason[] = [];
  for (const r of all) {
    if (!seen.has(r)) {
      seen.add(r);
      ordered.push(r);
    }
  }
  return {
    outcome: "won",
    primaryReason: ordered[0],
    secondaryReasons: ordered.slice(1),
    winningCompetitor: null,
    confidence: Math.min(0.95, 0.4 + Math.min(3, ordered.length) * 0.15),
    matchedSignals: matched,
  };
}

/**
 * Aggregate a batch of win/loss results into reason rollup suitable for
 * a dashboard "why we win / why we lose" chart.
 */
export function rollupWinLossReasons(results: readonly WinLossResult[]): {
  won: Record<string, number>;
  lost: Record<string, number>;
  competitors: Record<string, number>;
  totalCount: number;
} {
  const won: Record<string, number> = {};
  const lost: Record<string, number> = {};
  const competitors: Record<string, number> = {};
  for (const r of results) {
    if (r.outcome === "won") {
      won[r.primaryReason] = (won[r.primaryReason] ?? 0) + 1;
    } else {
      lost[r.primaryReason] = (lost[r.primaryReason] ?? 0) + 1;
      if (r.winningCompetitor) {
        competitors[r.winningCompetitor] = (competitors[r.winningCompetitor] ?? 0) + 1;
      }
    }
  }
  return { won, lost, competitors, totalCount: results.length };
}
