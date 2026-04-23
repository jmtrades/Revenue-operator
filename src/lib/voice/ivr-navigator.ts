/**
 * Phase 12c.2 — IVR navigator.
 *
 * When dialling into a business, we often hit an IVR tree:
 *   "For sales, press 1. For support, press 2. To speak to an operator,
 *    press 0 or stay on the line."
 *
 * Competitive research (G2, Reddit, Trustpilot complaints about AI voice
 * platforms) shows this is a near-universal gap — AI voice agents sit silent
 * on IVR trees or, worse, pitch into the menu. Twilio/Vonage ship DTMF but
 * very few platforms actually *navigate*.
 *
 * This module:
 *   1. Classifies a transcript as an IVR prompt with a list of options.
 *   2. Matches our target intent to the best menu option.
 *   3. Emits the DTMF key (or spoken word) the agent should send.
 *
 * Pure function. The "send DTMF" integration lives in the provider layer.
 */

export type IvrIntent =
  | "reach_person"
  | "sales"
  | "support"
  | "billing"
  | "scheduling"
  | "general"
  | "operator";

export interface IvrMenuOption {
  /** The DTMF key or spoken word the user should press/say. */
  key: string;
  /** Human-readable description parsed from the prompt. */
  label: string;
  /** Intent we've mapped this option to, best-effort. */
  intent: IvrIntent | null;
}

export interface IvrDetection {
  isIvrPrompt: boolean;
  confidence: number;
  options: IvrMenuOption[];
  /** Raw transcript excerpt we matched against. */
  excerpt: string;
}

export interface IvrNavigationPlan {
  action: "press_key" | "say_word" | "wait" | "hang_up";
  key?: string;
  word?: string;
  reason: string;
  matchedOption: IvrMenuOption | null;
}

// ---------------------------------------------------------------------------
// Phrase anchors that indicate we're inside an IVR prompt.
// ---------------------------------------------------------------------------

const IVR_ANCHORS: RegExp[] = [
  /\bpress (?:one|two|three|four|five|six|seven|eight|nine|zero|[0-9])\b/i,
  /\b(?:for|to)\s+[a-z ]{2,40}\s*,?\s+press\s+(?:one|two|three|four|five|six|seven|eight|nine|zero|[0-9])\b/i,
  /\b(?:main|phone|voice) menu\b/i,
  /\bplease (?:listen carefully|make a selection)\b/i,
  /\bour menu (?:options|has)\b/i,
  /\bsay (?:sales|support|billing|operator|representative)\b/i,
  /\bif you know your party'?s extension\b/i,
];

// Digit lookup so "press one" maps to "1".
const WORD_TO_DIGIT: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9",
};

function normalizeKey(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return WORD_TO_DIGIT[lower] ?? lower.replace(/[^0-9*#]/g, "").slice(0, 3) ?? lower;
}

// Intent → phrases we'd expect to hear next to a menu option.
const INTENT_PHRASES: Record<IvrIntent, RegExp[]> = {
  reach_person: [/\b(speak|talk) (to|with) (an? )?(agent|representative|person|human)/i, /\boperator\b/i, /\breach (an? )?agent\b/i],
  sales: [/\bsales\b/i, /\bnew (customers?|business|accounts?)\b/i, /\bplace an order\b/i, /\bmake a purchase\b/i],
  support: [/\b(customer|technical|tech)? ?support\b/i, /\bservice\b/i, /\brepair\b/i, /\btroubleshoot/i, /\bhelp desk\b/i],
  billing: [/\bbilling\b/i, /\bpayment/i, /\b(my )?account\b/i, /\binvoice/i, /\bpay (a |your |my )?(bill|balance)\b/i],
  scheduling: [/\bappointment/i, /\bschedule\b/i, /\b(reschedul|cancel)e?\b/i, /\bbooking/i],
  general: [/\bgeneral\b/i, /\bother\b/i, /\bmain office\b/i, /\bquestions\b/i],
  operator: [/\boperator\b/i, /\breceptionist\b/i, /\bmain line\b/i, /\bstay on the line\b/i],
};

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Parse transcript for IVR options. Returns list of (key, label) pairs.
 *
 * Patterns matched (in any order):
 *   "for sales, press 1"    / "to reach billing, press two"
 *   "press 0 for an operator"
 *   "say 'sales' or press 1"
 */
export function parseIvrOptions(transcript: string): IvrMenuOption[] {
  const text = (transcript ?? "").replace(/\s+/g, " ");
  const opts: IvrMenuOption[] = [];

  // Pattern A: "for <thing>, press <key>" / "to reach <thing>, press <key>"
  const forPressRe =
    /(?:for|to (?:reach|hear|speak (?:to|with)))\s+([a-z][a-z ,'&-]{1,60}?)(?:,|\s+)press\s+(?:"|')?(zero|one|two|three|four|five|six|seven|eight|nine|[0-9*#])(?:"|')?/gi;
  for (const m of text.matchAll(forPressRe)) {
    const label = m[1].trim().toLowerCase();
    const key = normalizeKey(m[2]);
    opts.push({ key, label, intent: mapLabelToIntent(label) });
  }

  // Pattern B: "press <key> for <thing>"
  const pressForRe =
    /press\s+(?:"|')?(zero|one|two|three|four|five|six|seven|eight|nine|[0-9*#])(?:"|')?\s+(?:for|to (?:reach|hear|speak (?:to|with)))\s+([a-z][a-z ,'&-]{1,60}?)(?=[.,;]|$|\s+or\b|\s+press\b|\s+to\b|\s+for\b)/gi;
  for (const m of text.matchAll(pressForRe)) {
    const key = normalizeKey(m[1]);
    const label = m[2].trim().toLowerCase();
    opts.push({ key, label, intent: mapLabelToIntent(label) });
  }

  // Pattern C: "say X" — voice-driven IVR
  const sayRe = /say\s+(?:"|')?([a-z][a-z ,'-]{1,30}?)(?:"|')?(?=[.,;]|$|\s+or\b)/gi;
  for (const m of text.matchAll(sayRe)) {
    const label = m[1].trim().toLowerCase();
    opts.push({ key: label, label, intent: mapLabelToIntent(label) });
  }

  // Dedupe by (key,label)
  const seen = new Set<string>();
  const deduped: IvrMenuOption[] = [];
  for (const o of opts) {
    const sig = `${o.key}|${o.label}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    deduped.push(o);
  }
  return deduped;
}

function mapLabelToIntent(label: string): IvrIntent | null {
  for (const [intent, phrases] of Object.entries(INTENT_PHRASES) as [IvrIntent, RegExp[]][]) {
    for (const r of phrases) if (r.test(label)) return intent;
  }
  return null;
}

/**
 * Is this transcript segment part of an IVR prompt?
 */
export function detectIvrPrompt(transcript: string): IvrDetection {
  const text = (transcript ?? "").trim();
  if (!text) {
    return { isIvrPrompt: false, confidence: 0, options: [], excerpt: "" };
  }

  let anchorHits = 0;
  for (const r of IVR_ANCHORS) {
    if (r.test(text)) anchorHits += 1;
  }

  const options = parseIvrOptions(text);

  // Score: any anchor + ≥1 parsed option is a strong positive.
  let confidence = 0;
  if (anchorHits > 0) confidence += 0.5;
  if (options.length > 0) confidence += 0.3 + Math.min(0.2, options.length * 0.05);
  // Three or more options + anchor ≈ canonical IVR tree
  if (anchorHits >= 1 && options.length >= 3) confidence = Math.min(1, confidence + 0.15);

  return {
    isIvrPrompt: confidence >= 0.5,
    confidence: Math.min(1, confidence),
    options,
    excerpt: text.slice(0, 400),
  };
}

/**
 * Given a parsed IVR menu and our target intent, pick the best option and
 * emit the key to press.
 *
 * Selection order:
 *   1. Exact intent match.
 *   2. Fallback intents: reach_person > operator > general.
 *   3. If none match, wait (don't press random keys).
 */
export function planIvrNavigation(
  detection: IvrDetection,
  targetIntent: IvrIntent,
): IvrNavigationPlan {
  if (!detection.isIvrPrompt || detection.options.length === 0) {
    return { action: "wait", reason: "no_ivr_prompt", matchedOption: null };
  }

  const byIntent = (i: IvrIntent) => detection.options.find((o) => o.intent === i) ?? null;

  // 1. Exact match
  let pick = byIntent(targetIntent);

  // 2. Fallbacks
  if (!pick) {
    const FALLBACKS: IvrIntent[] = ["reach_person", "operator", "general"];
    for (const f of FALLBACKS) {
      if (f === targetIntent) continue;
      const candidate = byIntent(f);
      if (candidate) {
        pick = candidate;
        break;
      }
    }
  }

  // 3. Last-ditch: try 0 (operator is the de-facto standard on almost every IVR)
  if (!pick) {
    const zero = detection.options.find((o) => o.key === "0");
    if (zero) pick = zero;
  }

  if (!pick) {
    return { action: "wait", reason: "no_match_for_intent", matchedOption: null };
  }

  // If the key is a digit/symbol → DTMF; otherwise we say it.
  const isDtmf = /^[0-9*#]{1,3}$/.test(pick.key);
  return {
    action: isDtmf ? "press_key" : "say_word",
    key: isDtmf ? pick.key : undefined,
    word: isDtmf ? undefined : pick.key,
    reason: `matched_intent_${pick.intent ?? targetIntent}`,
    matchedOption: pick,
  };
}
