/**
 * Phase 12c.7 — Real-time competitor battlecards.
 *
 * Research gap (Phase 12a): Gong, Chorus, and Clari are post-call only —
 * they analyze recordings after the fact. No mainstream platform surfaces
 * a battlecard the instant a competitor is mentioned on a live call.
 *
 * This module:
 *   1. Detects competitor mentions in real-time transcripts.
 *   2. Matches to a workspace-provided battlecard (or a fallback template).
 *   3. Emits a short, scriptable response the AI agent can use immediately —
 *      OR a whisper prompt for a human rep.
 *
 * Pure function. No LLM. Works on partial transcripts (streaming-friendly).
 *
 * Battlecard shape is deliberately minimal: "when X is mentioned, counter
 * with Y". Rich card metadata (feature matrices, proof quotes, pricing tables)
 * goes in a separate store and is linked by `battlecardId`.
 */

export interface CompetitorBattlecard {
  /** Workspace-unique id. */
  id: string;
  /** Competitor name as spoken (not brand-formatted). Matching is case-insensitive. */
  competitorName: string;
  /** Optional aliases: "HubSpot", "hub spot", "hubspot crm". */
  aliases?: string[];
  /** Short positioning line the agent speaks verbatim. */
  counterLine: string;
  /** Up to 3 proof points. */
  proofPoints?: string[];
  /** Optional concession — acknowledge where they win. */
  concession?: string;
  /** Trap to avoid — things NOT to say about this competitor. */
  avoid?: string[];
  /** Last updated so stale cards can be flagged. */
  updatedAt?: string;
}

export interface BattlecardDetection {
  mentioned: boolean;
  competitorName: string | null;
  battlecardId: string | null;
  matchedPhrase: string | null;
  excerpt: string;
}

export interface BattlecardResponse {
  detection: BattlecardDetection;
  agentLine: string | null;
  whisperLine: string | null;
  proofPoints: string[];
  avoid: string[];
  concession: string | null;
}

/**
 * Detect any competitor mention in transcript text.
 */
export function detectCompetitorMention(
  transcript: string,
  battlecards: CompetitorBattlecard[],
): BattlecardDetection {
  const text = (transcript ?? "").trim();
  if (!text || battlecards.length === 0) {
    return { mentioned: false, competitorName: null, battlecardId: null, matchedPhrase: null, excerpt: "" };
  }

  const lower = text.toLowerCase();
  for (const card of battlecards) {
    const variants = [card.competitorName, ...(card.aliases ?? [])];
    for (const variant of variants) {
      const v = variant.trim().toLowerCase();
      if (v.length < 2) continue;
      // Word-boundary match for reasonable length variants; substring for very
      // short brand tokens (e.g. "X") would cause false positives, so we
      // require ≥3 chars for plain substring.
      const idx = lower.indexOf(v);
      if (idx === -1) continue;
      // Simple word-boundary check
      const before = idx === 0 ? " " : lower[idx - 1];
      const after = idx + v.length >= lower.length ? " " : lower[idx + v.length];
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
        return {
          mentioned: true,
          competitorName: card.competitorName,
          battlecardId: card.id,
          matchedPhrase: text.slice(idx, idx + variant.length),
          excerpt: text.slice(Math.max(0, idx - 30), Math.min(text.length, idx + variant.length + 60)),
        };
      }
    }
  }

  return { mentioned: false, competitorName: null, battlecardId: null, matchedPhrase: null, excerpt: "" };
}

/**
 * Full flow: detect + emit the agent response + whisper prompt in one call.
 */
export function resolveBattlecard(
  transcript: string,
  battlecards: CompetitorBattlecard[],
): BattlecardResponse {
  const detection = detectCompetitorMention(transcript, battlecards);
  if (!detection.mentioned || !detection.battlecardId) {
    return {
      detection,
      agentLine: null,
      whisperLine: null,
      proofPoints: [],
      avoid: [],
      concession: null,
    };
  }

  const card = battlecards.find((c) => c.id === detection.battlecardId) ?? null;
  if (!card) {
    return {
      detection,
      agentLine: null,
      whisperLine: null,
      proofPoints: [],
      avoid: [],
      concession: null,
    };
  }

  const proof = (card.proofPoints ?? []).slice(0, 3);
  const agentLine = card.counterLine;
  const whisperLine = `Competitor "${card.competitorName}" mentioned. Counter: ${card.counterLine}${
    card.concession ? ` — acknowledge: ${card.concession}` : ""
  }`;

  return {
    detection,
    agentLine,
    whisperLine,
    proofPoints: proof,
    avoid: card.avoid ?? [],
    concession: card.concession ?? null,
  };
}

/**
 * Given a list of battlecards, validate them for common authoring mistakes
 * before they're saved to the workspace config.
 */
export function validateBattlecards(cards: CompetitorBattlecard[]): {
  ok: boolean;
  errors: { id: string; field: string; message: string }[];
} {
  const errors: { id: string; field: string; message: string }[] = [];
  const seenIds = new Set<string>();
  for (const card of cards) {
    if (!card.id) errors.push({ id: card.id ?? "", field: "id", message: "missing id" });
    else if (seenIds.has(card.id)) errors.push({ id: card.id, field: "id", message: "duplicate id" });
    else seenIds.add(card.id);

    if (!card.competitorName || card.competitorName.length < 2) {
      errors.push({ id: card.id ?? "", field: "competitorName", message: "missing/too-short competitor name" });
    }
    if (!card.counterLine || card.counterLine.length < 10) {
      errors.push({ id: card.id ?? "", field: "counterLine", message: "counter line is too short (<10 chars)" });
    }
    if (card.counterLine && card.counterLine.length > 400) {
      errors.push({ id: card.id ?? "", field: "counterLine", message: "counter line too long (>400 chars — should be speakable in ~12s)" });
    }
    for (const p of card.proofPoints ?? []) {
      if (p.length > 280) errors.push({ id: card.id, field: "proofPoints", message: "proof point >280 chars" });
    }
  }
  return { ok: errors.length === 0, errors };
}
