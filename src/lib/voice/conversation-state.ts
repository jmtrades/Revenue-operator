/**
 * Conversation State Tracker
 *
 * Tracks the evolving state of a live call to enable intelligent, context-aware
 * decisions about response timing, tone, and tool selection. This is the "brain"
 * that makes dynamic latency selection, emotion-adaptive responses, and
 * vocabulary mirroring actually work in real time.
 *
 * Updated after every turn. The voice server reads this state before generating
 * each response to determine:
 *   - Response latency tier (instant / normal / thoughtful)
 *   - Emotional tone adjustment
 *   - Whether to use filler words or pauses
 *   - When to mirror the caller's vocabulary
 */

import type { ResponseUrgency } from "@/lib/voice/human-voice-defaults";

export interface ConversationTurn {
  speaker: "assistant" | "user";
  text: string;
  timestamp: number;
  /** Detected emotion (set after analysis) */
  emotion?: CallerEmotion;
  /** Response urgency used for this turn (assistant only) */
  urgency?: ResponseUrgency;
  /** Filler word used in this turn (to avoid repetition) */
  fillerUsed?: string;
}

export type CallerEmotion =
  | "neutral"
  | "happy"
  | "frustrated"
  | "confused"
  | "rushed"
  | "hesitant"
  | "angry"
  | "grateful"
  | "anxious";

export type CallPhase =
  | "greeting"
  | "discovery"
  | "resolution"
  | "closing"
  | "objection";

export interface ConversationState {
  /** Unique call session ID */
  callSessionId: string;
  /** All turns so far */
  turns: ConversationTurn[];
  /** Current call phase */
  phase: CallPhase;
  /** Dominant caller emotion across the call */
  dominantEmotion: CallerEmotion;
  /** Most recent caller emotion */
  currentEmotion: CallerEmotion;
  /** Caller's approximate speaking pace (words per turn) */
  callerPace: "fast" | "normal" | "slow";
  /** Words the caller uses frequently — mirror these */
  callerVocabulary: string[];
  /** How many times we've used each filler in this call */
  fillerUsageCount: Map<string, number>;
  /** Whether the caller has been identified by name */
  callerNameKnown: boolean;
  /** Caller name if detected */
  callerName: string | null;
  /** Call start timestamp */
  startedAt: number;
  /** Total turns so far */
  turnCount: number;
  /** Number of interruptions by the caller */
  interruptionCount: number;
  /** Whether the caller has expressed intent to leave/hang up */
  exitIntentDetected: boolean;
  /** Sentiment trend: improving, stable, or declining */
  sentimentTrend: "improving" | "stable" | "declining";
  /** Average words per user turn — used for pace detection */
  avgWordsPerTurn: number;
  /** Whether the caller has asked the same question twice (confusion signal) */
  repeatedQuestionDetected: boolean;
  /** Topics the caller has mentioned (for context tracking) */
  topicsMentioned: string[];
}

/**
 * Create a fresh conversation state for a new call.
 */
export function createConversationState(callSessionId: string): ConversationState {
  return {
    callSessionId,
    turns: [],
    phase: "greeting",
    dominantEmotion: "neutral",
    currentEmotion: "neutral",
    callerPace: "normal",
    callerVocabulary: [],
    fillerUsageCount: new Map(),
    callerNameKnown: false,
    callerName: null,
    startedAt: Date.now(),
    turnCount: 0,
    interruptionCount: 0,
    exitIntentDetected: false,
    sentimentTrend: "stable",
    avgWordsPerTurn: 0,
    repeatedQuestionDetected: false,
    topicsMentioned: [],
  };
}

/**
 * Add a new turn and update all derived state.
 */
export function addTurn(
  state: ConversationState,
  turn: Omit<ConversationTurn, "timestamp">,
): ConversationState {
  const fullTurn: ConversationTurn = {
    ...turn,
    timestamp: Date.now(),
  };

  state.turns.push(fullTurn);
  state.turnCount += 1;

  if (turn.speaker === "user") {
    // Detect emotion from caller text
    fullTurn.emotion = detectEmotion(turn.text);
    state.currentEmotion = fullTurn.emotion;

    // Update caller pace
    state.callerPace = classifyPace(turn.text);

    // Update average words per turn
    const wordCount = turn.text.trim().split(/\s+/).length;
    const userTurnCount = state.turns.filter((t) => t.speaker === "user").length;
    state.avgWordsPerTurn =
      userTurnCount <= 1
        ? wordCount
        : Math.round((state.avgWordsPerTurn * (userTurnCount - 1) + wordCount) / userTurnCount);

    // Extract vocabulary for mirroring
    updateCallerVocabulary(state, turn.text);

    // Detect exit intent
    if (detectExitIntent(turn.text)) {
      state.exitIntentDetected = true;
    }

    // Check for name reveal
    if (!state.callerNameKnown) {
      const name = extractCallerName(turn.text);
      if (name) {
        state.callerNameKnown = true;
        state.callerName = name;
      }
    }

    // Detect repeated questions (confusion signal)
    if (!state.repeatedQuestionDetected) {
      state.repeatedQuestionDetected = detectRepeatedQuestion(state, turn.text);
    }

    // Track topics mentioned
    extractTopics(state, turn.text);

    // Update sentiment trend (last 3 user turns)
    state.sentimentTrend = computeSentimentTrend(state);
  }

  if (turn.fillerUsed) {
    const count = state.fillerUsageCount.get(turn.fillerUsed) ?? 0;
    state.fillerUsageCount.set(turn.fillerUsed, count + 1);
  }

  // Update call phase
  state.phase = inferCallPhase(state);

  // Update dominant emotion
  state.dominantEmotion = computeDominantEmotion(state);

  return state;
}

/**
 * Determine the optimal response latency tier based on conversation state.
 */
export function selectResponseUrgency(
  state: ConversationState,
  lastUserText: string,
): ResponseUrgency {
  const wordCount = lastUserText.trim().split(/\s+/).length;
  const lower = lastUserText.toLowerCase().trim();

  // Instant responses: yes/no, confirmations, simple questions
  const instantPatterns = [
    /^(yes|no|yeah|yep|nope|nah|sure|okay|ok|right|correct|exactly|uh huh|mhm|mm hmm)[\.\!\?]?$/i,
    /^(what time|when do you|are you open|how much|where are you|what'?s your address)/i,
    /^(that'?s (fine|good|great|perfect|correct)|sounds good|works for me)/i,
  ];
  if (wordCount <= 5 && instantPatterns.some((p) => p.test(lower))) {
    return "instant";
  }

  // Thoughtful responses: complaints, complex requests, emotional moments
  const thoughtfulSignals = [
    state.currentEmotion === "frustrated",
    state.currentEmotion === "angry",
    state.currentEmotion === "anxious",
    wordCount > 30,
    /\b(problem|issue|complaint|wrong|broken|terrible|horrible|disappointed|upset|frustrating)\b/i.test(lower),
    /\b(actually|well|here'?s the thing|the situation is)\b/i.test(lower),
    /\b(nobody|no one|been trying|been waiting|three days|called multiple)\b/i.test(lower),
    state.phase === "objection",
    state.sentimentTrend === "declining",
    state.repeatedQuestionDetected,
  ];
  if (thoughtfulSignals.filter(Boolean).length >= 2) {
    return "thoughtful";
  }

  // Everything else: normal timing
  return "normal";
}

/**
 * Select the next filler word that hasn't been used recently.
 */
export function selectFiller(
  state: ConversationState,
  type: "acknowledgment" | "transition" | "closer",
  options: string[],
  lookbackTurns: number,
): string {
  // Guard against empty options array
  if (!options || options.length === 0) {
    const defaults: Record<string, string> = {
      acknowledgment: "Sure thing",
      transition: "So",
      closer: "Thanks",
    };
    return defaults[type] ?? "Okay";
  }

  // Get fillers used in the last N turns
  const recentTurns = state.turns.slice(-lookbackTurns);
  const recentlyUsed = new Set(
    recentTurns
      .filter((t) => t.fillerUsed)
      .map((t) => t.fillerUsed!),
  );

  // Filter out recently used ones
  const available = options.filter((f) => !recentlyUsed.has(f));

  // If all have been used recently, just avoid the last one used
  if (available.length === 0) {
    const lastUsed = recentTurns
      .filter((t) => t.fillerUsed)
      .map((t) => t.fillerUsed!)
      .pop();
    const fallback = options.filter((f) => f !== lastUsed);
    if (fallback.length === 0) return options[0];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

// ── Internal helpers ───────────────────────────────────────────

function detectEmotion(text: string): CallerEmotion {
  const lower = text.toLowerCase();

  const patterns: Array<{ emotion: CallerEmotion; signals: RegExp[] }> = [
    {
      emotion: "angry",
      signals: [
        /\b(furious|outraged|livid|pissed|angry|ridiculous|unacceptable|terrible|worst)\b/,
        /!{2,}/,
        /\b(wtf|bs|bull)\b/,
      ],
    },
    {
      emotion: "frustrated",
      signals: [
        /\b(frustrated|frustrating|annoyed|irritated|disappointed|upset|problem|wrong|broken|issue|again)\b/,
        /\b(this is (the|my) (third|fourth|fifth|last) (time|call))\b/,
        /\b(still (not|hasn'?t|haven'?t|isn'?t))\b/,
        /\b(nobody|no one) (is |has |will )?(calling|getting|helping|responding|answering)/,
        /\b(been (trying|waiting|calling) (for|to))\b/,
        /\b(three|four|five|six|seven) (days?|times?|calls?|weeks?)\b/,
      ],
    },
    {
      emotion: "anxious",
      signals: [
        /\b(worried|concerned|nervous|scared|afraid|urgent|emergency|asap|hurry)\b/,
        /\b(need (this|it) (right|now|today|immediately|asap))\b/,
      ],
    },
    {
      emotion: "confused",
      signals: [
        /\b(confused|don'?t understand|what do you mean|i'?m not sure|huh|wait what|lost)\b/,
        /\?{2,}/,
        /\b(can you (explain|clarify|repeat))\b/,
      ],
    },
    {
      emotion: "hesitant",
      signals: [
        /\b(maybe|i guess|not sure|let me think|i'?ll think|might|probably|possibly)\b/,
        /\b(i need to (talk|check|ask|think|discuss))\b/,
        /\.\.\./,
      ],
    },
    {
      emotion: "rushed",
      signals: [
        /\b(quick|fast|hurry|busy|running late|in a rush|gotta go|short on time|no time)\b/,
        /\b(just (tell|give) me)\b/,
      ],
    },
    {
      emotion: "happy",
      signals: [
        /\b(great|awesome|perfect|excellent|wonderful|amazing|love|fantastic|thank)\b/,
        /\b(that'?s? (great|awesome|perfect|wonderful|exactly))\b/,
      ],
    },
    {
      emotion: "grateful",
      signals: [
        /\b(thank you( so much)?|thanks|appreciate|grateful|helpful|you'?re? (the|so) (best|great|helpful))\b/,
      ],
    },
  ];

  let bestMatch: CallerEmotion = "neutral";
  let bestScore = 0;

  for (const { emotion, signals } of patterns) {
    let score = 0;
    for (const signal of signals) {
      if (signal.test(lower)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = emotion;
    }
  }

  return bestMatch;
}

function classifyPace(text: string): "fast" | "normal" | "slow" {
  const trimmed = text.trim();
  if (!trimmed) return "normal"; // Empty text = no signal
  const wordCount = trimmed.split(/\s+/).length;
  // Short clipped responses suggest a fast/impatient caller
  if (wordCount <= 3) return "fast";
  // Long detailed responses suggest a slower, more deliberate caller
  if (wordCount > 25) return "slow";
  return "normal";
}

function updateCallerVocabulary(state: ConversationState, text: string): void {
  // Extract meaningful words the caller uses (not stop words)
  const stopWords = new Set([
    "i", "me", "my", "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "to", "of", "in", "for", "on", "with", "at", "by", "it", "you", "your",
    "this", "that", "and", "or", "but", "not", "do", "does", "did", "have",
    "has", "had", "can", "will", "would", "could", "should", "just", "so",
    "if", "then", "than", "when", "what", "how", "who", "which", "there",
    "here", "from", "up", "out", "about", "into", "over", "after", "get",
    "got", "like", "know", "want", "need", "think", "going", "come", "make",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Keep a running vocabulary list (max 20 words, most recent first)
  for (const word of words) {
    if (!state.callerVocabulary.includes(word)) {
      state.callerVocabulary.unshift(word);
    }
  }
  state.callerVocabulary = state.callerVocabulary.slice(0, 20);
}

function detectExitIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(gotta go|bye|hang up|that'?s all|i'?m done|no more|nothing else|that'?s it|goodbye)\b/.test(lower);
}

function _detectNameReveal(text: string): boolean {
  return /\b(my name is|i'?m |this is |it'?s |call me )/i.test(text.toLowerCase());
}

/**
 * Extract the caller's name from common reveal patterns.
 */
function extractCallerName(text: string): string | null {
  const patterns = [
    /\bmy name is\s+([A-Z][a-z]+)\b/i,
    /\bi'?m\s+([A-Z][a-z]+)\b/i,
    /\bthis is\s+([A-Z][a-z]+)\b/i,
    /\bcall me\s+([A-Z][a-z]+)\b/i,
    /\bname'?s?\s+([A-Z][a-z]+)\b/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match?.[1]) {
      const name = match[1].trim();
      // Filter out common false positives
      const falsePositives = new Set([
        "just", "actually", "really", "very", "so", "not", "here", "there",
        "calling", "looking", "trying", "going", "having", "doing", "getting",
        "and", "but", "the", "that", "this", "from", "with", "about",
      ]);
      if (!falsePositives.has(name.toLowerCase()) && name.length >= 2 && name.length <= 25) {
        return name;
      }
    }
  }
  return null;
}

/**
 * Detect if the caller is repeating a previous question (confusion/frustration signal).
 */
function detectRepeatedQuestion(state: ConversationState, currentText: string): boolean {
  const current = currentText.toLowerCase().replace(/[^\w\s]/g, "").trim();
  if (current.length < 15) return false; // Too short to reliably compare

  const previousUserTurns = state.turns
    .filter((t) => t.speaker === "user")
    .slice(-5) // Last 5 user turns
    .map((t) => t.text.toLowerCase().replace(/[^\w\s]/g, "").trim());

  for (const prev of previousUserTurns) {
    if (prev.length < 15) continue;
    // Check word overlap ratio
    const currentWords = new Set(current.split(/\s+/).filter(Boolean));
    const prevWords = prev.split(/\s+/).filter(Boolean);
    const denominator = Math.max(currentWords.size, prevWords.length);
    if (denominator === 0) continue; // Prevent division by zero
    const overlap = prevWords.filter((w) => currentWords.has(w)).length;
    const ratio = overlap / denominator;
    if (ratio > 0.7) return true; // 70%+ word overlap = likely repeated question
  }
  return false;
}

/**
 * Extract high-level topics from the caller's text for context tracking.
 */
function extractTopics(state: ConversationState, text: string): void {
  const topicPatterns: Array<{ topic: string; pattern: RegExp }> = [
    { topic: "pricing", pattern: /\b(price|cost|how much|pricing|quote|estimate|fee|charge|rate|expensive|cheap|afford)\b/i },
    { topic: "scheduling", pattern: /\b(schedule|appointment|book|available|opening|slot|time|date|when can|tomorrow|next week)\b/i },
    { topic: "hours", pattern: /\b(open|close|hours|when are you|what time)\b/i },
    { topic: "location", pattern: /\b(where are you|address|location|directions|parking|near|map)\b/i },
    { topic: "complaint", pattern: /\b(problem|issue|wrong|broken|complaint|disappointed|upset|terrible|bad experience)\b/i },
    { topic: "insurance", pattern: /\b(insurance|coverage|copay|deductible|in-network|accept|provider)\b/i },
    { topic: "emergency", pattern: /\b(emergency|urgent|asap|right now|immediately|can't wait|pain|bleeding|leak|flood)\b/i },
    { topic: "cancellation", pattern: /\b(cancel|refund|return|stop|remove|unsubscribe|opt out)\b/i },
    { topic: "staff", pattern: /\b(doctor|dentist|technician|therapist|stylist|lawyer|agent|who will|specific person)\b/i },
  ];

  for (const { topic, pattern } of topicPatterns) {
    if (pattern.test(text) && !state.topicsMentioned.includes(topic)) {
      state.topicsMentioned.push(topic);
    }
  }
  // Cap topics at 10
  if (state.topicsMentioned.length > 10) {
    state.topicsMentioned = state.topicsMentioned.slice(-10);
  }
}

/**
 * Compute sentiment trend from recent user emotions.
 * Returns "improving", "stable", or "declining".
 */
function computeSentimentTrend(state: ConversationState): "improving" | "stable" | "declining" {
  const userTurns = state.turns.filter((t) => t.speaker === "user" && t.emotion);
  if (userTurns.length < 3) return "stable";

  const emotionScore: Record<CallerEmotion, number> = {
    angry: -3, frustrated: -2, anxious: -1, confused: -1,
    hesitant: 0, rushed: 0, neutral: 1,
    grateful: 2, happy: 3,
  };

  const recent = userTurns.slice(-3);
  const scores = recent.map((t) => emotionScore[t.emotion!] ?? 0);

  // Compare first half vs second half of recent turns
  if (scores.length >= 3) {
    const early = scores[0];
    const late = scores[scores.length - 1];
    if (late - early >= 2) return "improving";
    if (early - late >= 2) return "declining";
  }
  return "stable";
}

function inferCallPhase(state: ConversationState): CallPhase {
  const turnCount = state.turnCount;
  const lastUserTurn = [...state.turns].reverse().find((t) => t.speaker === "user");
  const text = lastUserTurn?.text?.toLowerCase() ?? "";

  // Objection phase: caller is pushing back
  if (
    /\b(too (expensive|much)|not (sure|interested)|let me think|busy|competitor|compare)\b/.test(text)
  ) {
    return "objection";
  }

  // Closing phase: wrapping up signals
  if (
    turnCount > 6 &&
    (/\b(thanks|perfect|sounds good|that'?s all|goodbye|have a good)\b/.test(text) ||
      state.exitIntentDetected)
  ) {
    return "closing";
  }

  // Resolution phase: past discovery, working toward outcome
  if (turnCount > 4) return "resolution";

  // Discovery phase: gathering info
  if (turnCount > 1) return "discovery";

  return "greeting";
}

function computeDominantEmotion(state: ConversationState): CallerEmotion {
  const userTurns = state.turns.filter(
    (t) => t.speaker === "user" && t.emotion,
  );
  if (userTurns.length === 0) return "neutral";

  const counts: Partial<Record<CallerEmotion, number>> = {};
  for (const turn of userTurns) {
    const e = turn.emotion!;
    counts[e] = (counts[e] ?? 0) + 1;
  }

  // Weight recent turns more heavily (last 3 turns = 2x weight)
  const recentTurns = userTurns.slice(-3);
  for (const turn of recentTurns) {
    const e = turn.emotion!;
    counts[e] = (counts[e] ?? 0) + 1; // Double count for recency
  }

  let dominant: CallerEmotion = "neutral";
  let maxCount = 0;
  for (const [emotion, count] of Object.entries(counts)) {
    if (count! > maxCount) {
      maxCount = count!;
      dominant = emotion as CallerEmotion;
    }
  }

  return dominant;
}
