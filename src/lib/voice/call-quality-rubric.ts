/**
 * Call Quality Rubric — multi-dimensional post-call scoring.
 *
 * Produces a 0-100 overall grade plus per-dimension scores and coaching
 * notes. Used by:
 *   - Post-call analysis pipeline (writes to call_analysis.analysis_json.rubric)
 *   - Manager dashboards (surfaces weak dimensions across agents)
 *   - Agent training (each dimension has specific coaching hooks)
 *
 * Dimensions (10, each 0-100):
 *   1. opening         — strong greeting, identifies self + company, permission ask
 *   2. discovery       — asks open-ended questions, uncovers pain, active listening
 *   3. value_prop      — connects solution to their specific problem
 *   4. objection       — acknowledges, explores, pivots (uses router techniques)
 *   5. closing         — explicit ask for next step, alternative close, urgency
 *   6. compliance      — consent disclosure, DNC respect, TCPA-safe behavior
 *   7. sentiment       — caller sentiment trajectory (start→end)
 *   8. pace            — talk ratio (should be ~40% agent / 60% prospect), turn cadence
 *   9. clarity         — clear speech, no filler-word cascade, confident delivery
 *  10. outcome         — did the objective of the call get accomplished?
 *
 * Weights sum to 1.0. Tuned so compliance and outcome carry more weight than
 * cosmetic dimensions.
 */

export type RubricDimension =
  | "opening"
  | "discovery"
  | "value_prop"
  | "objection"
  | "closing"
  | "compliance"
  | "sentiment"
  | "pace"
  | "clarity"
  | "outcome";

export const RUBRIC_WEIGHTS: Record<RubricDimension, number> = {
  opening: 0.07,
  discovery: 0.12,
  value_prop: 0.12,
  objection: 0.12,
  closing: 0.13,
  compliance: 0.15,
  sentiment: 0.08,
  pace: 0.07,
  clarity: 0.06,
  outcome: 0.08,
};

export interface DimensionScore {
  score: number; // 0-100
  /** Short one-line diagnosis — "Strong permission-ask; missing identifier." */
  feedback: string;
  /** Concrete evidence cited from the transcript if available. */
  evidence?: string[];
}

export interface CallRubricScore {
  overall: number; // 0-100 weighted
  letterGrade: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
  dimensions: Record<RubricDimension, DimensionScore>;
  /** Top 3 coaching recommendations, ranked by expected impact (weight × gap). */
  topCoachingNotes: string[];
  /** Blocking compliance issues that should trigger a review. */
  complianceFlags: string[];
}

export interface CallMetricsInput {
  /** Full transcript text. */
  transcript?: string | null;
  /** Ordered turns, each with speaker + text. */
  turns?: Array<{ speaker: "agent" | "caller" | "system"; text: string; durationMs?: number }>;
  /** Call outcome: 'booked', 'callback_scheduled', 'no_answer', 'lost', 'revoked', etc. */
  outcome?: string | null;
  /** Agent's objective for this call (so outcome alignment can be evaluated). */
  objective?: string | null;
  /** Prior-detected compliance signals (wired by the caller). */
  compliance?: {
    consentDisclosed?: boolean;
    dncRespected?: boolean;
    tcpaCompliant?: boolean;
    revocationRespected?: boolean;
    consentStateMatched?: boolean;
  } | null;
  /** Per-turn sentiment scores from upstream analysis. */
  sentimentTimeline?: Array<{ t: number; score: number }>;
  /** Objection handling events. */
  objectionsRaised?: Array<{ type: string; handled: boolean; technique?: string }>;
  /** Duration in seconds — used for pace analysis. */
  durationSeconds?: number;
}

function scoreOpening(input: CallMetricsInput): DimensionScore {
  const t = (input.transcript ?? "").toLowerCase();
  const turns = input.turns ?? [];
  const firstAgentTurn = turns.find((x) => x.speaker === "agent")?.text.toLowerCase() ?? t.slice(0, 400);

  let score = 50;
  const feedbackParts: string[] = [];
  if (/\b(hi|hello|good (morning|afternoon|evening))\b/.test(firstAgentTurn)) {
    score += 10;
  } else {
    feedbackParts.push("Missed a warm greeting");
  }
  if (/\b(this is|my name is) [a-z]+\b/.test(firstAgentTurn) || /\bi'?m [a-z]+\b/.test(firstAgentTurn)) {
    score += 15;
  } else {
    feedbackParts.push("Didn't clearly identify self");
  }
  if (/\b(calling from|with) [a-z]/.test(firstAgentTurn)) {
    score += 10;
  } else {
    feedbackParts.push("Didn't name the business");
  }
  if (/\b(quick moment|few minutes|bad time|caught you|good time to talk)\b/.test(firstAgentTurn)) {
    score += 15;
  } else {
    feedbackParts.push("No permission ask");
  }
  score = Math.min(100, Math.max(0, score));
  return {
    score,
    feedback: feedbackParts.length === 0 ? "Strong opener" : feedbackParts.join("; "),
    evidence: firstAgentTurn ? [firstAgentTurn.slice(0, 160)] : undefined,
  };
}

function scoreDiscovery(input: CallMetricsInput): DimensionScore {
  const turns = (input.turns ?? []).filter((x) => x.speaker === "agent");
  if (turns.length === 0) return { score: 0, feedback: "No agent turns to analyze" };
  const agentText = turns.map((t) => t.text).join(" ").toLowerCase();
  const openQuestions = (agentText.match(/\b(how|what|why|when|where|which|tell me|walk me through)\b[^.?!]*\?/g) ?? []).length;
  const followUps = (agentText.match(/\b(and then|after that|what (about|happens)|go on|interesting|say more)\b/g) ?? []).length;
  let score = 30 + Math.min(50, openQuestions * 8) + Math.min(20, followUps * 5);
  const feedback: string[] = [];
  if (openQuestions < 3) feedback.push(`Only ${openQuestions} open-ended questions (target 5+)`);
  if (followUps < 2) feedback.push("Few follow-up probes — missed depth");
  score = Math.min(100, Math.max(0, score));
  return { score, feedback: feedback.length ? feedback.join("; ") : "Thorough discovery" };
}

function scoreValueProp(input: CallMetricsInput): DimensionScore {
  const agentText = (input.turns ?? []).filter((x) => x.speaker === "agent").map((x) => x.text).join(" ").toLowerCase();
  const personalizers = (agentText.match(/\b(you mentioned|based on what|for your|since you|since your)\b/g) ?? []).length;
  const benefits = (agentText.match(/\b(saves?|helps?|means|gives? you|so you can|which means)\b/g) ?? []).length;
  let score = 30 + Math.min(40, personalizers * 10) + Math.min(30, benefits * 5);
  const fb: string[] = [];
  if (personalizers < 2) fb.push("Value prop wasn't personalized to their pain");
  if (benefits < 3) fb.push("Few benefit statements");
  score = Math.min(100, Math.max(0, score));
  return { score, feedback: fb.length ? fb.join("; ") : "Clearly connected solution to stated pain" };
}

function scoreObjection(input: CallMetricsInput): DimensionScore {
  const obj = input.objectionsRaised ?? [];
  if (obj.length === 0) return { score: 80, feedback: "No objections raised — benefit-of-the-doubt score" };
  const handled = obj.filter((o) => o.handled).length;
  const handleRate = handled / obj.length;
  let score = Math.round(handleRate * 100);
  const fb: string[] = [];
  if (handleRate < 0.7) fb.push(`Only handled ${handled}/${obj.length} objections successfully`);
  const unhandled = obj.filter((o) => !o.handled).map((o) => o.type);
  if (unhandled.length) fb.push(`Unhandled: ${unhandled.join(", ")}`);
  score = Math.min(100, Math.max(0, score));
  return { score, feedback: fb.length ? fb.join("; ") : "Handled all objections cleanly" };
}

function scoreClosing(input: CallMetricsInput): DimensionScore {
  const agentText = (input.turns ?? []).filter((x) => x.speaker === "agent").map((x) => x.text).join(" ").toLowerCase();
  const hasAsk = /\b(would you|are you available|does (next|this) (week|tuesday|wednesday|thursday|friday|monday)|let'?s (get|schedule|book)|can we (set|put|schedule))\b/.test(agentText);
  const altClose = /\b(morning or afternoon|(monday|tuesday|wednesday|thursday|friday) or|this week or next)\b/.test(agentText);
  const nextStep = /\b(send (you|over)|i'?ll (email|text)|confirm(ation)? (email|text|sms))\b/.test(agentText);
  let score = 30;
  const fb: string[] = [];
  if (hasAsk) score += 30;
  else fb.push("No explicit ask for next step");
  if (altClose) score += 20;
  if (nextStep) score += 20;
  else fb.push("No clear confirmation of next step");
  score = Math.min(100, Math.max(0, score));
  return { score, feedback: fb.length ? fb.join("; ") : "Strong close" };
}

function scoreCompliance(input: CallMetricsInput): { score: DimensionScore; flags: string[] } {
  const c = input.compliance ?? {};
  const flags: string[] = [];
  let score = 100;
  if (c.consentDisclosed === false) {
    score -= 40;
    flags.push("Recording consent not disclosed in a two-party state");
  }
  if (c.tcpaCompliant === false) {
    score -= 40;
    flags.push("Call placed outside TCPA quiet hours");
  }
  if (c.dncRespected === false) {
    score -= 40;
    flags.push("Call placed to a DNC-listed number");
  }
  if (c.revocationRespected === false) {
    score -= 40;
    flags.push("Continued after verbal consent revocation");
  }
  if (c.consentStateMatched === false) {
    score -= 10;
    flags.push("Consent state didn't match lead jurisdiction");
  }
  score = Math.max(0, score);
  return {
    score: {
      score,
      feedback: flags.length === 0 ? "Fully compliant" : flags.join("; "),
    },
    flags,
  };
}

function scoreSentiment(input: CallMetricsInput): DimensionScore {
  const timeline = input.sentimentTimeline ?? [];
  if (timeline.length < 2) return { score: 60, feedback: "Insufficient sentiment data" };
  const first = timeline[0]?.score ?? 0;
  const last = timeline[timeline.length - 1]?.score ?? 0;
  const trajectory = last - first;
  // Map start+delta into 0-100
  const base = Math.round(((last + 1) / 2) * 100); // last sentiment in [-1..1] → [0..100]
  const traj = Math.round(trajectory * 40);
  const score = Math.max(0, Math.min(100, base + traj));
  const fb =
    trajectory > 0.2 ? "Sentiment improved over call" :
    trajectory < -0.2 ? "Sentiment declined — prospect cooled" :
    "Sentiment flat";
  return { score, feedback: fb };
}

function scorePace(input: CallMetricsInput): DimensionScore {
  const turns = input.turns ?? [];
  if (turns.length === 0) return { score: 50, feedback: "No turn data" };
  const agentMs = turns.filter((t) => t.speaker === "agent").reduce((s, t) => s + (t.durationMs ?? Math.max(1000, t.text.length * 60)), 0);
  const callerMs = turns.filter((t) => t.speaker === "caller").reduce((s, t) => s + (t.durationMs ?? Math.max(1000, t.text.length * 60)), 0);
  const total = agentMs + callerMs;
  if (total === 0) return { score: 50, feedback: "No speech duration" };
  const agentRatio = agentMs / total;
  // Ideal is ~40% agent / 60% prospect. Penalize both under- and over-talking.
  const delta = Math.abs(agentRatio - 0.4);
  const score = Math.max(0, Math.round(100 - delta * 250));
  const fb =
    agentRatio > 0.6 ? `Agent talked ${Math.round(agentRatio * 100)}% — too much` :
    agentRatio < 0.25 ? `Agent only talked ${Math.round(agentRatio * 100)}% — passive` :
    `Balanced ${Math.round(agentRatio * 100)}% / ${Math.round((1 - agentRatio) * 100)}%`;
  return { score, feedback: fb };
}

function scoreClarity(input: CallMetricsInput): DimensionScore {
  const agentText = (input.turns ?? []).filter((x) => x.speaker === "agent").map((x) => x.text).join(" ");
  if (!agentText) return { score: 50, feedback: "No agent text" };
  const fillers = (agentText.match(/\b(um|uh|like|you know|sort of|kind of|basically)\b/gi) ?? []).length;
  const words = agentText.split(/\s+/).filter(Boolean).length;
  const fillerRate = words === 0 ? 0 : fillers / words;
  let score = Math.round(100 - fillerRate * 800);
  score = Math.max(0, Math.min(100, score));
  const fb = fillerRate > 0.03 ? `High filler rate (${(fillerRate * 100).toFixed(1)}%) — tighten delivery` : "Clear delivery";
  return { score, feedback: fb };
}

function scoreOutcome(input: CallMetricsInput): DimensionScore {
  const outcome = (input.outcome ?? "").toLowerCase();
  const objective = (input.objective ?? "book_appointment").toLowerCase();
  const wins = new Set(["booked", "appointment_scheduled", "callback_scheduled", "sold", "closed_won", "qualified"]);
  const partials = new Set(["voicemail_left", "follow_up_scheduled", "info_sent"]);
  const losses = new Set(["not_interested", "lost", "closed_lost", "revoked", "wrong_number", "crisis_escalated"]);
  let score = 50;
  if (wins.has(outcome)) score = 100;
  else if (partials.has(outcome)) score = 65;
  else if (losses.has(outcome)) score = 20;
  return {
    score,
    feedback: `Outcome "${outcome}" vs objective "${objective}": ${score >= 80 ? "aligned" : score >= 40 ? "partial" : "missed"}`,
  };
}

function overallLetter(score: number): CallRubricScore["letterGrade"] {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Score a call against the 10-dimension rubric. All dimensions produce a
 * score + feedback; weighted overall is the headline number. Top-3 coaching
 * notes are the three biggest opportunities (largest weight × gap-to-100).
 */
export function scoreCallAgainstRubric(input: CallMetricsInput): CallRubricScore {
  const opening = scoreOpening(input);
  const discovery = scoreDiscovery(input);
  const valueProp = scoreValueProp(input);
  const objection = scoreObjection(input);
  const closing = scoreClosing(input);
  const { score: compliance, flags } = scoreCompliance(input);
  const sentiment = scoreSentiment(input);
  const pace = scorePace(input);
  const clarity = scoreClarity(input);
  const outcome = scoreOutcome(input);

  const dims: Record<RubricDimension, DimensionScore> = {
    opening,
    discovery,
    value_prop: valueProp,
    objection,
    closing,
    compliance,
    sentiment,
    pace,
    clarity,
    outcome,
  };

  // Weighted overall
  let overall = 0;
  for (const [k, v] of Object.entries(dims)) {
    overall += v.score * RUBRIC_WEIGHTS[k as RubricDimension];
  }
  overall = Math.round(overall);

  // Top coaching: weight × (100 - score), descending
  const coachingRanked = (Object.entries(dims) as [RubricDimension, DimensionScore][])
    .map(([dim, ds]) => ({
      dim,
      impact: RUBRIC_WEIGHTS[dim] * (100 - ds.score),
      ds,
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .filter((x) => x.impact > 0.5)
    .map((x) => `${x.dim}: ${x.ds.feedback}`);

  return {
    overall,
    letterGrade: overallLetter(overall),
    dimensions: dims,
    topCoachingNotes: coachingRanked,
    complianceFlags: flags,
  };
}
