/**
 * Phase 25 — Playbook compliance scorer.
 *
 * Given a sales call transcript and a named playbook (set of required
 * sections / prompts / disclosures), produce a compliance scorecard:
 * which sections were covered, which were skipped, what the rep said
 * for each, and a 0–100 adherence score plus coaching feedback.
 *
 * Sections are matched via:
 *   - literal substring match (case-insensitive)
 *   - regex pattern match
 *   - keyword clusters (any-of within N words)
 *
 * Section weight determines how much a miss hurts the score.
 *
 * Use cases:
 *   - Did the rep disclose call recording? (state-specific 2-party consent)
 *   - Did the rep ask the five qualifying questions?
 *   - Did the rep quote the price / state the terms?
 *   - Did the rep confirm next steps?
 */

export interface PlaybookSection {
  id: string;
  label: string;
  /** Must-match: section fails if none match. */
  patterns: Array<
    | { type: "literal"; phrase: string }
    | { type: "regex"; pattern: string; flags?: string }
    | { type: "keyword_cluster"; keywords: string[]; maxWordsBetween?: number }
  >;
  /** 0–1 importance. Default 0.5. Higher = bigger hit on miss. */
  weight?: number;
  /** Which speaker(s) must say it. Default ["rep"]. */
  requiredFrom?: Array<"rep" | "lead" | "any">;
}

export interface Playbook {
  id: string;
  name: string;
  sections: PlaybookSection[];
}

export interface TranscriptTurn {
  speaker: "rep" | "lead" | "unknown";
  text: string;
  /** seconds into the call */
  offsetSeconds?: number;
}

export interface PlaybookComplianceInput {
  playbook: Playbook;
  turns: readonly TranscriptTurn[];
}

export interface SectionResult {
  sectionId: string;
  label: string;
  covered: boolean;
  matchedExcerpt: string | null;
  matchedFromSpeaker: TranscriptTurn["speaker"] | null;
  weight: number;
}

export interface PlaybookCompliance {
  playbookId: string;
  /** 0–100 */
  score: number;
  /** Number of sections covered. */
  coveredCount: number;
  /** Total sections. */
  totalCount: number;
  sections: SectionResult[];
  coachingFeedback: string[];
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function literalMatch(text: string, phrase: string): boolean {
  return text.includes(normalizeText(phrase));
}

function regexMatch(text: string, pattern: string, flags?: string): { matched: boolean; excerpt: string | null } {
  try {
    const re = new RegExp(pattern, flags ?? "i");
    const m = text.match(re);
    if (m) return { matched: true, excerpt: m[0] };
    return { matched: false, excerpt: null };
  } catch {
    return { matched: false, excerpt: null };
  }
}

function keywordClusterMatch(
  text: string,
  keywords: string[],
  maxWordsBetween = 12,
): { matched: boolean; excerpt: string | null } {
  if (keywords.length === 0) return { matched: false, excerpt: null };
  const normalizedKeys = keywords.map((k) => normalizeText(k));
  const words = text.split(/\s+/);
  // Find positions of each keyword.
  const positions: number[][] = normalizedKeys.map(() => []);
  words.forEach((w, i) => {
    normalizedKeys.forEach((k, ki) => {
      if (w.includes(k) || k.includes(w)) {
        positions[ki].push(i);
      }
    });
  });
  if (positions.some((p) => p.length === 0)) return { matched: false, excerpt: null };
  // Greedy scan — see if we can find one of each keyword within maxWordsBetween of an anchor.
  for (const anchor of positions[0]) {
    const visited: number[] = [anchor];
    let ok = true;
    for (let k = 1; k < positions.length; k++) {
      const match = positions[k].find(
        (p) => visited.some((v) => Math.abs(v - p) <= maxWordsBetween),
      );
      if (match === undefined) {
        ok = false;
        break;
      }
      visited.push(match);
    }
    if (ok) {
      const lo = Math.max(0, Math.min(...visited) - 2);
      const hi = Math.min(words.length, Math.max(...visited) + 3);
      return { matched: true, excerpt: words.slice(lo, hi).join(" ") };
    }
  }
  return { matched: false, excerpt: null };
}

function speakerAllowed(section: PlaybookSection, speaker: TranscriptTurn["speaker"]): boolean {
  const req = section.requiredFrom ?? ["rep"];
  if (req.includes("any")) return true;
  return req.includes(speaker as "rep" | "lead");
}

export function scorePlaybookCompliance(input: PlaybookComplianceInput): PlaybookCompliance {
  const { playbook, turns } = input;

  const sectionResults: SectionResult[] = [];

  for (const section of playbook.sections) {
    const weight = section.weight ?? 0.5;
    let covered = false;
    let matchedExcerpt: string | null = null;
    let matchedFrom: TranscriptTurn["speaker"] | null = null;

    for (const turn of turns) {
      if (!speakerAllowed(section, turn.speaker)) continue;
      const text = normalizeText(turn.text);

      for (const p of section.patterns) {
        if (p.type === "literal") {
          if (literalMatch(text, p.phrase)) {
            covered = true;
            matchedExcerpt = turn.text.slice(0, 200);
            matchedFrom = turn.speaker;
            break;
          }
        } else if (p.type === "regex") {
          const r = regexMatch(text, p.pattern, p.flags);
          if (r.matched) {
            covered = true;
            matchedExcerpt = r.excerpt;
            matchedFrom = turn.speaker;
            break;
          }
        } else if (p.type === "keyword_cluster") {
          const r = keywordClusterMatch(text, p.keywords, p.maxWordsBetween);
          if (r.matched) {
            covered = true;
            matchedExcerpt = r.excerpt;
            matchedFrom = turn.speaker;
            break;
          }
        }
      }
      if (covered) break;
    }

    sectionResults.push({
      sectionId: section.id,
      label: section.label,
      covered,
      matchedExcerpt,
      matchedFromSpeaker: matchedFrom,
      weight,
    });
  }

  // Weighted score.
  const totalWeight = sectionResults.reduce((s, r) => s + r.weight, 0);
  const coveredWeight = sectionResults
    .filter((r) => r.covered)
    .reduce((s, r) => s + r.weight, 0);
  const score =
    totalWeight > 0 ? Math.round((coveredWeight / totalWeight) * 1000) / 10 : 100;

  const coachingFeedback: string[] = [];
  for (const r of sectionResults) {
    if (!r.covered) {
      coachingFeedback.push(`Missed: "${r.label}" — ${r.weight >= 0.7 ? "critical" : "recommended"} section.`);
    }
  }
  if (sectionResults.every((r) => r.covered)) {
    coachingFeedback.push("All playbook sections covered.");
  }

  return {
    playbookId: playbook.id,
    score,
    coveredCount: sectionResults.filter((r) => r.covered).length,
    totalCount: sectionResults.length,
    sections: sectionResults,
    coachingFeedback,
  };
}

/**
 * A minimal built-in playbook for US outbound prospecting calls. Callers
 * can use this or define their own.
 */
export function getDefaultProspectingPlaybook(): Playbook {
  return {
    id: "prospecting_v1",
    name: "Outbound Prospecting v1",
    sections: [
      {
        id: "intro",
        label: "Rep introduces self + company",
        weight: 0.8,
        patterns: [
          { type: "keyword_cluster", keywords: ["this is", "calling from"], maxWordsBetween: 10 },
          { type: "keyword_cluster", keywords: ["my name is"], maxWordsBetween: 5 },
        ],
      },
      {
        id: "recording_disclosure",
        label: "Call recording disclosure (2-party states)",
        weight: 1.0,
        patterns: [
          { type: "keyword_cluster", keywords: ["call", "recorded"], maxWordsBetween: 8 },
          { type: "keyword_cluster", keywords: ["recording", "quality"], maxWordsBetween: 8 },
        ],
      },
      {
        id: "reason_for_call",
        label: "States reason for call / hook",
        weight: 0.6,
        patterns: [
          { type: "keyword_cluster", keywords: ["reason", "calling"], maxWordsBetween: 5 },
          { type: "keyword_cluster", keywords: ["reached out"], maxWordsBetween: 5 },
        ],
      },
      {
        id: "qualifying_question",
        label: "Asks at least one qualifying question",
        weight: 0.7,
        patterns: [
          { type: "regex", pattern: "\\?", flags: "g" },
        ],
      },
      {
        id: "next_steps",
        label: "Confirms next steps",
        weight: 0.6,
        patterns: [
          { type: "keyword_cluster", keywords: ["next step"], maxWordsBetween: 3 },
          { type: "keyword_cluster", keywords: ["schedule", "meeting"], maxWordsBetween: 5 },
          { type: "keyword_cluster", keywords: ["send", "calendar"], maxWordsBetween: 5 },
          { type: "keyword_cluster", keywords: ["follow up"], maxWordsBetween: 3 },
        ],
      },
    ],
  };
}
