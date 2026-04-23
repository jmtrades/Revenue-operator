/**
 * Phase 45 — MEDDPICC scorer + deal review.
 *
 * Pure scoring of MEDDPICC evidence with per-letter sub-scores, letter grades,
 * missing-evidence prompts, and an executive-ready deal review packet.
 *
 * Letters:
 *   M  — Metrics
 *   E  — Economic Buyer
 *   Dc — Decision Criteria
 *   Dp — Decision Process
 *   P  — Paper Process
 *   I  — Identify Pain
 *   C  — Champion
 *   Co — Competition
 */

export type MeddpiccLetter =
  | "M"
  | "E"
  | "Dc"
  | "Dp"
  | "P"
  | "I"
  | "C"
  | "Co";

export type EvidenceKind =
  // M
  | "metric_quantified"
  | "roi_calculated"
  // E
  | "eb_identified"
  | "eb_met"
  // Dc
  | "criteria_documented"
  | "criteria_aligned"
  // Dp
  | "process_mapped"
  | "timeline_confirmed"
  | "steps_identified"
  // P
  | "paper_started"
  | "legal_engaged"
  | "security_review_engaged"
  // I
  | "pain_quantified"
  | "cost_of_inaction"
  // C
  | "champion_identified"
  | "champion_validated"
  | "champion_committed"
  // Co
  | "competitor_identified"
  | "competitor_strategy";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  /** Strength of this evidence 0..1 (0 = claimed, 1 = verified). */
  strength: number;
  description?: string;
  source?: string; // "call" | "email" | "doc" | "crm_field"
  gatheredAtIso?: string;
}

export interface MeddpiccInput {
  dealId: string;
  amount: number;
  stage?: string; // raw CRM stage label
  closeDateIso?: string;
  evidence: Evidence[];
}

export type MeddpiccGrade = "A" | "B" | "C" | "D" | "F";

export interface LetterScore {
  letter: MeddpiccLetter;
  label: string;
  score: number; // 0..1
  grade: MeddpiccGrade;
  matchedKinds: EvidenceKind[];
  missingKinds: EvidenceKind[];
  critical: boolean; // true if score < 0.4 and letter is mission-critical
}

export interface MeddpiccScore {
  dealId: string;
  overall: number; // 0..100
  grade: MeddpiccGrade;
  letters: Record<MeddpiccLetter, LetterScore>;
  strongestLetters: MeddpiccLetter[];
  weakestLetters: MeddpiccLetter[];
  /** Strengths as human-readable bullets for the deal review packet. */
  strengths: string[];
  /** Gaps as human-readable bullets. */
  gaps: string[];
}

export interface DealReviewPacket {
  dealId: string;
  amount: number;
  stage?: string;
  meddpicc: MeddpiccScore;
  summary: string;
  risks: string[];
  strengths: string[];
  recommendedActions: string[];
  evidenceCompletenessPct: number; // 0..1 of required kinds satisfied
}

export interface EvidencePrompt {
  letter: MeddpiccLetter;
  kind: EvidenceKind;
  priority: number; // 0..1 — higher = ask first
  prompt: string;
}

// ---------- Rubric ----------

interface LetterRubric {
  letter: MeddpiccLetter;
  label: string;
  critical: boolean;
  // kind → weight; weights within a letter should sum to 1.
  weights: Partial<Record<EvidenceKind, number>>;
}

const RUBRIC: Record<MeddpiccLetter, LetterRubric> = {
  M: {
    letter: "M",
    label: "Metrics",
    critical: false,
    weights: { metric_quantified: 0.6, roi_calculated: 0.4 },
  },
  E: {
    letter: "E",
    label: "Economic Buyer",
    critical: true,
    weights: { eb_identified: 0.3, eb_met: 0.7 },
  },
  Dc: {
    letter: "Dc",
    label: "Decision Criteria",
    critical: true,
    weights: { criteria_documented: 0.5, criteria_aligned: 0.5 },
  },
  Dp: {
    letter: "Dp",
    label: "Decision Process",
    critical: true,
    weights: { process_mapped: 0.4, timeline_confirmed: 0.4, steps_identified: 0.2 },
  },
  P: {
    letter: "P",
    label: "Paper Process",
    critical: false,
    weights: { paper_started: 0.5, legal_engaged: 0.3, security_review_engaged: 0.2 },
  },
  I: {
    letter: "I",
    label: "Identify Pain",
    critical: true,
    weights: { pain_quantified: 0.5, cost_of_inaction: 0.5 },
  },
  C: {
    letter: "C",
    label: "Champion",
    critical: true,
    weights: { champion_identified: 0.3, champion_validated: 0.4, champion_committed: 0.3 },
  },
  Co: {
    letter: "Co",
    label: "Competition",
    critical: false,
    weights: { competitor_identified: 0.5, competitor_strategy: 0.5 },
  },
};

const KIND_TO_LETTER: Record<EvidenceKind, MeddpiccLetter> = {
  metric_quantified: "M",
  roi_calculated: "M",
  eb_identified: "E",
  eb_met: "E",
  criteria_documented: "Dc",
  criteria_aligned: "Dc",
  process_mapped: "Dp",
  timeline_confirmed: "Dp",
  steps_identified: "Dp",
  paper_started: "P",
  legal_engaged: "P",
  security_review_engaged: "P",
  pain_quantified: "I",
  cost_of_inaction: "I",
  champion_identified: "C",
  champion_validated: "C",
  champion_committed: "C",
  competitor_identified: "Co",
  competitor_strategy: "Co",
};

const KIND_PROMPT: Record<EvidenceKind, string> = {
  metric_quantified: "What's the specific $ or % improvement this deal will drive?",
  roi_calculated: "Has the buyer validated the ROI model with their own numbers?",
  eb_identified: "Who can actually authorize this purchase and sign the contract?",
  eb_met: "Has the seller met the economic buyer (not just their delegate)?",
  criteria_documented: "What written, objective criteria will the buyer use to decide?",
  criteria_aligned: "Has the buyer confirmed your solution meets the criteria?",
  process_mapped: "What are the concrete steps from today to signature?",
  timeline_confirmed: "Has the buyer committed to a decision date?",
  steps_identified: "Are legal, IT, security, and procurement steps explicitly called out?",
  paper_started: "Is the MSA/order form actually in motion?",
  legal_engaged: "Has legal reviewed redlines yet?",
  security_review_engaged: "Is security review initiated?",
  pain_quantified: "What is the measurable cost of the current problem?",
  cost_of_inaction: "What happens if the buyer does nothing? (quantify)",
  champion_identified: "Who is actively selling for you internally?",
  champion_validated: "Have you tested the champion (given them something to do)?",
  champion_committed: "Has the champion said 'yes, I will fight for this'?",
  competitor_identified: "Who else is the buyer evaluating (including status quo)?",
  competitor_strategy: "What is your explicit plan to beat the competitor / do-nothing?",
};

// ---------- Scoring ----------

function gradeFor(score: number): MeddpiccGrade {
  if (score >= 0.9) return "A";
  if (score >= 0.75) return "B";
  if (score >= 0.6) return "C";
  if (score >= 0.4) return "D";
  return "F";
}

export function scoreMeddpicc(input: MeddpiccInput): MeddpiccScore {
  // Aggregate best-strength-per-kind
  const bestByKind: Map<EvidenceKind, number> = new Map();
  for (const e of input.evidence) {
    const s = clamp01(e.strength);
    const prev = bestByKind.get(e.kind) ?? 0;
    if (s > prev) bestByKind.set(e.kind, s);
  }

  const letters: Record<MeddpiccLetter, LetterScore> = {} as Record<MeddpiccLetter, LetterScore>;
  const letterSymbols: MeddpiccLetter[] = ["M", "E", "Dc", "Dp", "P", "I", "C", "Co"];

  for (const letter of letterSymbols) {
    const rubric = RUBRIC[letter];
    const kinds = Object.entries(rubric.weights) as [EvidenceKind, number][];
    let score = 0;
    const matched: EvidenceKind[] = [];
    const missing: EvidenceKind[] = [];
    for (const [kind, w] of kinds) {
      const s = bestByKind.get(kind) ?? 0;
      score += s * w;
      if (s >= 0.5) matched.push(kind);
      else missing.push(kind);
    }
    score = Math.min(1, score);
    const grade = gradeFor(score);
    letters[letter] = {
      letter,
      label: rubric.label,
      score,
      grade,
      matchedKinds: matched,
      missingKinds: missing,
      critical: rubric.critical && score < 0.4,
    };
  }

  const overall = Math.round(
    (letterSymbols.reduce((sum, l) => sum + letters[l].score, 0) / letterSymbols.length) * 100,
  );

  const ranked = [...letterSymbols].sort((a, b) => letters[b].score - letters[a].score);
  const strongestLetters = ranked.filter((l) => letters[l].score >= 0.7).slice(0, 3);
  const weakestLetters = [...letterSymbols]
    .sort((a, b) => letters[a].score - letters[b].score)
    .filter((l) => letters[l].score < 0.6)
    .slice(0, 3);

  const strengths: string[] = [];
  for (const l of strongestLetters) {
    strengths.push(`${letters[l].label} (${letters[l].grade}) — ${letters[l].matchedKinds.join(", ")}`);
  }
  const gaps: string[] = [];
  for (const l of weakestLetters) {
    const missingTxt = letters[l].missingKinds.length > 0 ? letters[l].missingKinds.join(", ") : "no evidence";
    gaps.push(`${letters[l].label} (${letters[l].grade}) — missing: ${missingTxt}`);
  }

  return {
    dealId: input.dealId,
    overall,
    grade: gradeFor(overall / 100),
    letters,
    strongestLetters,
    weakestLetters,
    strengths,
    gaps,
  };
}

// ---------- Missing evidence prompts ----------

export function missingEvidencePrompts(score: MeddpiccScore, limit: number = 5): EvidencePrompt[] {
  const out: EvidencePrompt[] = [];
  // Priority = critical flag (1.0) + (1 - letterScore) + weight within letter
  for (const l of ["M", "E", "Dc", "Dp", "P", "I", "C", "Co"] as MeddpiccLetter[]) {
    const letter = score.letters[l];
    const rubric = RUBRIC[l];
    for (const kind of letter.missingKinds) {
      const w = rubric.weights[kind] ?? 0;
      let priority = (1 - letter.score) * 0.6 + w * 0.3;
      if (rubric.critical) priority += 0.2;
      if (letter.critical) priority += 0.2;
      priority = Math.min(1, priority);
      out.push({
        letter: l,
        kind,
        priority,
        prompt: KIND_PROMPT[kind],
      });
    }
  }
  out.sort((a, b) => b.priority - a.priority);
  return out.slice(0, Math.max(0, limit));
}

// ---------- Deal review packet ----------

export function dealReviewPacket(input: MeddpiccInput): DealReviewPacket {
  const meddpicc = scoreMeddpicc(input);
  const totalKinds = Object.keys(KIND_TO_LETTER).length;
  const matched = new Set<EvidenceKind>();
  for (const e of input.evidence) if (e.strength >= 0.5) matched.add(e.kind);
  const completeness = matched.size / totalKinds;

  const risks: string[] = [];
  for (const letter of Object.values(meddpicc.letters)) {
    if (letter.critical) risks.push(`${letter.label} below threshold — critical gap.`);
  }
  // Deal-level cross-cutting risks
  if (meddpicc.letters.Co.score < 0.5) {
    risks.push("Competitive strategy unclear — risk of late-stage flip or do-nothing outcome.");
  }
  if (meddpicc.letters.P.score < 0.3 && meddpicc.overall >= 60) {
    risks.push("Late-stage paper process not started — slippage risk.");
  }

  const nextSteps = missingEvidencePrompts(meddpicc, 5).map((p) => p.prompt);

  const summary = buildSummary(input, meddpicc);

  return {
    dealId: input.dealId,
    amount: input.amount,
    stage: input.stage,
    meddpicc,
    summary,
    risks,
    strengths: meddpicc.strengths,
    recommendedActions: nextSteps,
    evidenceCompletenessPct: completeness,
  };
}

function buildSummary(input: MeddpiccInput, score: MeddpiccScore): string {
  const dollar = input.amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const stage = input.stage ?? "n/a";
  const criticalMisses = Object.values(score.letters)
    .filter((l) => l.critical)
    .map((l) => l.label);
  const status = criticalMisses.length > 0
    ? `critical gaps in ${criticalMisses.join(", ")}`
    : "no critical gaps";
  return `Deal ${input.dealId} (${dollar}, ${stage}) — MEDDPICC ${score.overall}/100 (${score.grade}); ${status}.`;
}

// ---------- utils ----------

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
