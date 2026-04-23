/**
 * Phase 34 — Talk-to-listen ratio + monologue + filler density analyzer.
 *
 * Input: transcript of timed turns (start/end) per speaker.
 * Output: per-speaker metrics + call-level coaching flags.
 *
 * Research-backed coaching targets (Gong, Chorus public research):
 *   - Best AEs on discovery: 40-45% rep talk time
 *   - Best AEs on demo: 60-65% rep talk time
 *   - Longest rep monologue under 90 seconds for discovery
 *   - Fewer than 8% filler-word density
 *   - Minimum 3 open-ended questions per 30-minute call
 *
 * This module is pure. Caller classifies call stage + passes transcript.
 */

export type Speaker = "rep" | "prospect" | "other";

export interface TimedTurn {
  speaker: Speaker;
  startMs: number;
  endMs: number;
  text: string;
}

export type CallStage = "discovery" | "demo" | "qualification" | "negotiation" | "unknown";

export interface TalkRatioTargets {
  stage: CallStage;
  repTalkMin: number; // fraction
  repTalkMax: number; // fraction
  maxMonologueSeconds: number;
  minQuestions: number;
  maxFillerDensity: number;
}

export const DEFAULT_TARGETS: Record<CallStage, TalkRatioTargets> = {
  discovery: { stage: "discovery", repTalkMin: 0.35, repTalkMax: 0.5, maxMonologueSeconds: 90, minQuestions: 3, maxFillerDensity: 0.08 },
  qualification: { stage: "qualification", repTalkMin: 0.35, repTalkMax: 0.5, maxMonologueSeconds: 90, minQuestions: 3, maxFillerDensity: 0.08 },
  demo: { stage: "demo", repTalkMin: 0.55, repTalkMax: 0.7, maxMonologueSeconds: 180, minQuestions: 2, maxFillerDensity: 0.08 },
  negotiation: { stage: "negotiation", repTalkMin: 0.4, repTalkMax: 0.55, maxMonologueSeconds: 120, minQuestions: 2, maxFillerDensity: 0.08 },
  unknown: { stage: "unknown", repTalkMin: 0.4, repTalkMax: 0.55, maxMonologueSeconds: 120, minQuestions: 2, maxFillerDensity: 0.08 },
};

const FILLER_WORDS = new Set([
  "um", "uh", "like", "you", "know", "basically", "literally", "actually",
  "so", "right", "kinda", "sorta", "anyway", "whatever",
]);
// Note: "you know" is a 2-gram — handled separately.
const FILLER_BIGRAMS = new Set(["you know", "i mean", "kind of", "sort of"]);

const QUESTION_WORD_STARTS = ["how", "what", "why", "where", "when", "which", "who", "tell me about", "walk me through", "describe", "can you"];

export interface SpeakerStats {
  totalSeconds: number;
  wordCount: number;
  longestMonologueSeconds: number;
  fillerCount: number;
  fillerDensity: number;
  questionCount: number;
  interruptions: number;
}

export interface TalkRatioReport {
  callDurationSeconds: number;
  stage: CallStage;
  rep: SpeakerStats;
  prospect: SpeakerStats;
  repTalkShare: number;
  prospectTalkShare: number;
  balanced: boolean;
  flags: Array<{ code: string; severity: "info" | "warning" | "critical"; detail: string }>;
  coachingSummary: string[];
}

function wordsIn(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isQuestionTurn(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  return QUESTION_WORD_STARTS.some((q) => t.startsWith(q + " "));
}

function countFillers(text: string): number {
  const lower = text.toLowerCase();
  let bigramCount = 0;
  for (const bg of FILLER_BIGRAMS) {
    // global-match count
    let idx = 0;
    while ((idx = lower.indexOf(bg, idx)) !== -1) {
      bigramCount++;
      idx += bg.length;
    }
  }
  const words = wordsIn(text);
  const singleCount = words.filter((w) => FILLER_WORDS.has(w)).length;
  // NOTE: bigram "you know" would double-count single "you" + "know" above. Subtract.
  return singleCount - 2 * bigramCount + bigramCount; // bigrams contribute 1 each, not 2 singles
}

function statsFor(speaker: Speaker, turns: TimedTurn[]): SpeakerStats {
  const ownTurns = turns.filter((t) => t.speaker === speaker);
  const totalMs = ownTurns.reduce((s, t) => s + (t.endMs - t.startMs), 0);
  const totalSeconds = totalMs / 1000;

  let wordCount = 0;
  let fillerCount = 0;
  let questionCount = 0;
  let longestMonologueMs = 0;

  for (const t of ownTurns) {
    wordCount += wordsIn(t.text).length;
    fillerCount += countFillers(t.text);
    if (isQuestionTurn(t.text)) questionCount++;
    const len = t.endMs - t.startMs;
    if (len > longestMonologueMs) longestMonologueMs = len;
  }

  // Interruption = a turn starts before the previous opposite-speaker turn ended.
  let interruptions = 0;
  for (let i = 1; i < turns.length; i++) {
    const prev = turns[i - 1];
    const cur = turns[i];
    if (cur.speaker === speaker && cur.speaker !== prev.speaker && cur.startMs < prev.endMs) {
      interruptions++;
    }
  }

  const fillerDensity = wordCount > 0 ? fillerCount / wordCount : 0;
  return {
    totalSeconds,
    wordCount,
    longestMonologueSeconds: longestMonologueMs / 1000,
    fillerCount,
    fillerDensity,
    questionCount,
    interruptions,
  };
}

export function analyzeTalkRatio(
  turns: TimedTurn[],
  stage: CallStage = "unknown",
  customTargets?: Partial<TalkRatioTargets>,
): TalkRatioReport {
  const sorted = [...turns].sort((a, b) => a.startMs - b.startMs);
  const callStart = sorted.length > 0 ? sorted[0].startMs : 0;
  const callEnd = sorted.length > 0 ? sorted[sorted.length - 1].endMs : 0;
  const callDurationSeconds = (callEnd - callStart) / 1000;

  const rep = statsFor("rep", sorted);
  const prospect = statsFor("prospect", sorted);

  const totalSpeechSec = rep.totalSeconds + prospect.totalSeconds || 1;
  const repTalkShare = rep.totalSeconds / totalSpeechSec;
  const prospectTalkShare = prospect.totalSeconds / totalSpeechSec;

  const targets = { ...DEFAULT_TARGETS[stage], ...customTargets };
  const flags: TalkRatioReport["flags"] = [];

  if (repTalkShare < targets.repTalkMin) {
    flags.push({
      code: "rep_underspeaking",
      severity: "warning",
      detail: `Rep spoke ${(repTalkShare * 100).toFixed(1)}% (target ≥ ${(targets.repTalkMin * 100).toFixed(0)}%)`,
    });
  } else if (repTalkShare > targets.repTalkMax) {
    flags.push({
      code: "rep_overspeaking",
      severity: "critical",
      detail: `Rep dominated at ${(repTalkShare * 100).toFixed(1)}% (target ≤ ${(targets.repTalkMax * 100).toFixed(0)}%)`,
    });
  }
  if (rep.longestMonologueSeconds > targets.maxMonologueSeconds) {
    flags.push({
      code: "rep_monologue",
      severity: "warning",
      detail: `Longest rep monologue ${rep.longestMonologueSeconds.toFixed(0)}s (max ${targets.maxMonologueSeconds}s)`,
    });
  }
  if (rep.questionCount < targets.minQuestions) {
    flags.push({
      code: "too_few_questions",
      severity: "warning",
      detail: `${rep.questionCount} rep questions (min ${targets.minQuestions})`,
    });
  }
  if (rep.fillerDensity > targets.maxFillerDensity) {
    flags.push({
      code: "filler_density_high",
      severity: "info",
      detail: `Filler density ${(rep.fillerDensity * 100).toFixed(1)}% (target < ${(targets.maxFillerDensity * 100).toFixed(0)}%)`,
    });
  }
  if (rep.interruptions >= 3) {
    flags.push({
      code: "rep_interrupting",
      severity: "warning",
      detail: `${rep.interruptions} interruptions of the prospect`,
    });
  }

  const balanced = flags.every((f) => f.severity === "info");

  const coachingSummary: string[] = [];
  if (flags.length === 0) {
    coachingSummary.push("Call balance looks healthy — keep this cadence.");
  } else {
    for (const f of flags) {
      coachingSummary.push(f.detail);
    }
  }

  return {
    callDurationSeconds,
    stage,
    rep,
    prospect,
    repTalkShare,
    prospectTalkShare,
    balanced,
    flags,
    coachingSummary,
  };
}
