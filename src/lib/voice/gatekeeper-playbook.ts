/**
 * Phase 12c.6 — Gatekeeper detection + playbook.
 *
 * When we dial a business number, we often reach someone who is NOT the
 * decision-maker — a receptionist, an executive assistant, a retail employee,
 * a spouse. The goal shifts from "pitch" to "earn a path to the right person
 * without burning a bridge".
 *
 * Research gap (Phase 12a): AI voice platforms either a) pitch the gatekeeper
 * (who immediately blocks the number) or b) go silent. Almost none shift
 * strategy when they realise they're talking to a gatekeeper.
 *
 * This module:
 *   1. Detects gatekeeper signals in caller transcripts.
 *   2. Classifies gatekeeper *type* (receptionist, spouse, EA, voicemail-gate).
 *   3. Emits a playbook line the agent can read that is polite, short, and
 *      asks for the best way to reach the target.
 *
 * Pure. Deterministic. No LLM.
 */

export type GatekeeperType =
  | "receptionist"
  | "assistant"
  | "family_member"
  | "front_desk"
  | "call_center"
  | "voicemail_gate"
  | "unknown";

export interface GatekeeperDetection {
  isGatekeeper: boolean;
  type: GatekeeperType;
  confidence: number;
  matchedPhrase: string | null;
  excerpt: string;
}

export interface GatekeeperPlaybookInput {
  /** The detection you just ran. */
  detection: GatekeeperDetection;
  /** Who we're trying to reach (first name OK, full name better). */
  targetName: string | null;
  /** Short role of target, e.g. "owner", "office manager". */
  targetRole?: string | null;
  /** Short, non-salesy reason we're calling — used to get past. */
  reasonForCall?: string | null;
  /** Our caller-side name. */
  yourName?: string | null;
  /** Our organisation name. */
  yourOrg?: string | null;
}

export interface GatekeeperPlaybookMove {
  action:
    | "ask_for_target"
    | "leave_structured_message"
    | "ask_best_callback_time"
    | "ask_alternate_channel"
    | "polite_exit";
  line: string;
  /** Optional second line to use if the gatekeeper deflects. */
  fallbackLine?: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Gatekeeper phrase library.
// ---------------------------------------------------------------------------

interface GatekeeperPattern {
  type: GatekeeperType;
  pattern: RegExp;
  confidence: number;
}

const GATEKEEPER_PATTERNS: GatekeeperPattern[] = [
  // Receptionist / front desk
  { type: "receptionist", pattern: /\b(?:thank you for calling|this is) [a-z'&. -]{2,40},? (?:how (?:may|can) i (?:help|direct))\b/i, confidence: 0.9 },
  { type: "receptionist", pattern: /\breception(?:ist)?|front desk\b/i, confidence: 0.75 },
  { type: "front_desk", pattern: /\b(?:what is this (?:regarding|about|in reference to)|may i ask what this is regarding)\b/i, confidence: 0.9 },
  { type: "front_desk", pattern: /\b(?:can i ask|may i ask) who(?:'s| is) calling\b/i, confidence: 0.85 },

  // Executive assistant
  { type: "assistant", pattern: /\b(?:executive )?assistant\b/i, confidence: 0.85 },
  { type: "assistant", pattern: /\bi(?:'m| am) [a-z]+('|’)s (?:assistant|ea|admin)\b/i, confidence: 0.95 },
  { type: "assistant", pattern: /\bi handle [a-z]+('|’)s (?:calendar|calls|schedule)\b/i, confidence: 0.9 },
  { type: "assistant", pattern: /\bi('|’)ll need to (?:check (?:their|his|her) calendar|put you through to voicemail)\b/i, confidence: 0.8 },

  // Family / household
  { type: "family_member", pattern: /\bthis is (?:his|her) (?:wife|husband|spouse|partner|mom|mother|dad|father|son|daughter)\b/i, confidence: 0.95 },
  { type: "family_member", pattern: /\b(?:he|she)(?:'s| is) (?:my (?:husband|wife|spouse|partner|son|daughter|mother|father)|not (?:here|home|available))\b/i, confidence: 0.7 },

  // Call center
  { type: "call_center", pattern: /\b(?:press (?:one|two|[0-9])|to (?:reach|speak to) (?:a|an)|customer service (?:line|number))\b/i, confidence: 0.6 },

  // Voicemail gatekeeping ("leave a message after the tone" = voicemail gate)
  { type: "voicemail_gate", pattern: /\b(?:please leave (?:a|your) message|after the (?:tone|beep)|at the tone)\b/i, confidence: 0.95 },

  // Generic deflection (weak signal — only used if nothing else matched)
  { type: "unknown", pattern: /\b(?:(?:he|she|they) (?:isn'?t|is not|aren'?t) (?:here|available|in))\b/i, confidence: 0.7 },
  { type: "unknown", pattern: /\bcan i take a message\b/i, confidence: 0.8 },
];

/**
 * Detect gatekeeper signals in a transcript segment.
 */
export function detectGatekeeper(transcript: string): GatekeeperDetection {
  const text = (transcript ?? "").trim();
  if (!text) {
    return { isGatekeeper: false, type: "unknown", confidence: 0, matchedPhrase: null, excerpt: "" };
  }

  let best: { type: GatekeeperType; confidence: number; phrase: string } | null = null;
  for (const p of GATEKEEPER_PATTERNS) {
    const m = text.match(p.pattern);
    if (!m) continue;
    if (!best || p.confidence > best.confidence) {
      best = { type: p.type, confidence: p.confidence, phrase: m[0] };
    }
  }

  if (!best) {
    return { isGatekeeper: false, type: "unknown", confidence: 0, matchedPhrase: null, excerpt: text.slice(0, 200) };
  }

  return {
    isGatekeeper: best.confidence >= 0.6,
    type: best.type,
    confidence: best.confidence,
    matchedPhrase: best.phrase,
    excerpt: text.slice(0, 200),
  };
}

// ---------------------------------------------------------------------------
// Playbook generator
// ---------------------------------------------------------------------------

/**
 * Generate the right thing to say given the gatekeeper detection + call goal.
 *
 * Playbook philosophy:
 *   - Always be respectful and short. Gatekeepers have power; earn them as allies.
 *   - Lead with your name + org + a one-sentence reason that's useful to the
 *     target (not a pitch).
 *   - Ask for the best next step, don't demand it.
 *   - Never lie about why you're calling.
 */
export function generateGatekeeperMove(input: GatekeeperPlaybookInput): GatekeeperPlaybookMove {
  const { detection, targetName, targetRole, reasonForCall, yourName, yourOrg } = input;

  const target = targetName?.trim() || "the person responsible";
  const role = targetRole?.trim() || "";
  const reason = reasonForCall?.trim() || "a quick conversation";
  const me = yourName?.trim() || "This is";
  const org = yourOrg?.trim() || "";

  // Voicemail gate → structured voicemail
  if (detection.type === "voicemail_gate") {
    const line = `Hi ${target}, ${me}${org ? ` from ${org}` : ""}. I'm calling about ${reason}. I'll try you again — or feel free to call me back at your convenience. Thank you.`;
    return {
      action: "leave_structured_message",
      line,
      reason: "voicemail_reached",
    };
  }

  // Receptionist / front-desk → clean, direct ask-for-target
  if (detection.type === "receptionist" || detection.type === "front_desk") {
    const askLine = `Hi, ${me}${org ? ` with ${org}` : ""}. Is ${target} available? I'm calling about ${reason}.`;
    const fallback = `No problem — what's the best way to reach ${target} directly? Is there a time they usually take calls?`;
    return {
      action: "ask_for_target",
      line: askLine,
      fallbackLine: fallback,
      reason: "receptionist_gate",
    };
  }

  // Executive assistant → acknowledge them, ask for the right path
  if (detection.type === "assistant") {
    const askLine = `Hi, ${me}${org ? ` from ${org}` : ""}. Thanks — I actually think you can help me more than anyone. What's the best way to get 5 minutes on ${target}'s calendar for ${reason}?`;
    const fallback = `I'll follow your process exactly — should I send details in email first, or would a callback window work better?`;
    return {
      action: "ask_best_callback_time",
      line: askLine,
      fallbackLine: fallback,
      reason: "assistant_gate",
    };
  }

  // Family member → respect the household, don't pitch
  if (detection.type === "family_member") {
    const askLine = `Oh, sorry to bother you. This is ${me}${org ? ` with ${org}` : ""}. I was hoping to reach ${target} about ${reason}. When would be a better time — or should I try a different number?`;
    return {
      action: "ask_best_callback_time",
      line: askLine,
      reason: "family_member_gate",
    };
  }

  // Call center tree → we'd usually be in IVR territory, but just in case
  if (detection.type === "call_center") {
    const line = `I'm trying to reach ${target}${role ? ` — the ${role}` : ""}. Could you direct me to the right extension?`;
    return {
      action: "ask_alternate_channel",
      line,
      reason: "call_center_tree",
    };
  }

  // Unknown gatekeeper — be short, polite, ask for the right next step
  const generic = `Hi, ${me}${org ? ` from ${org}` : ""}. Is ${target} available? I'm calling about ${reason}.`;
  const fallback = `No worries — what's the best way to reach them? I don't want to keep bothering you.`;
  return {
    action: "ask_for_target",
    line: generic,
    fallbackLine: fallback,
    reason: "unknown_gatekeeper",
  };
}

/**
 * Convenience: detect and emit a move in one call.
 */
export function handleGatekeeper(
  transcript: string,
  opts: Omit<GatekeeperPlaybookInput, "detection">,
): { detection: GatekeeperDetection; move: GatekeeperPlaybookMove | null } {
  const detection = detectGatekeeper(transcript);
  if (!detection.isGatekeeper) return { detection, move: null };
  const move = generateGatekeeperMove({ detection, ...opts });
  return { detection, move };
}
