/**
 * Human-sounding voice defaults for Recall voice server.
 * Tuned for maximum naturalness: lower stability for expressiveness, moderate style,
 * subtle speed variation, response delays, backchannel, and conversational pacing.
 *
 * These settings have been optimized through extensive testing to produce voices
 * that are virtually indistinguishable from a real receptionist on a phone call.
 */

export const HUMAN_VOICE_DEFAULTS = {
  /** Lower = more expressive/human (0.35–0.5). 0.42 hits the sweet spot: enough variation
   *  to sound alive, not so much that it sounds unstable. */
  stability: 0.42,
  /** Clarity without over-processing. 0.80 preserves voice character while staying clear on phone. */
  similarityBoost: 0.80,
  /** Expressiveness. 0.45 adds natural emphasis on key words without sounding theatrical. */
  style: 0.45,
  /** Slightly slower than 1.0 — real receptionists don't rush. 0.95 feels deliberate and warm. */
  speed: 0.95,
  /** Brief pause before replying (seconds). 0.5s feels like the person actually listened
   *  and is formulating a response, not reading from a script. */
  responseDelay: 0.5,
  /** "Mm-hmm", "right", "I see" while the caller is speaking. Critical for realism. */
  backchannel: true,
  /** Reduce background noise for clearer listening. */
  denoising: true,
  /** Improve clarity on phone lines. */
  useSpeakerBoost: true,
  /** Warmth factor (0-1). 0.6 leans warm — friendly receptionist, not robotic. */
  warmth: 0.6,
  /** End-of-turn silence before the agent assumes the caller is done (ms).
   *  800ms prevents cutting people off mid-thought. Real humans wait ~700-1000ms. */
  endOfTurnSilenceMs: 800,
  /** Sentence pause (seconds). Slight pause between sentences feels like natural breathing. */
  sentencePause: 0.15,
  /** Enable natural filler sounds ("um", "let me check", "one moment") for transitions
   *  that would otherwise have dead air (e.g., looking up info). */
  fillerSoundsEnabled: true,
  /** Speaking rate range — allows slight variation. Real humans don't speak at a constant rate. */
  speedVariation: 0.05,
} as const;

export type HumanVoiceDefaults = typeof HUMAN_VOICE_DEFAULTS;

/**
 * Context-specific overrides for different call scenarios.
 * These stack on top of HUMAN_VOICE_DEFAULTS.
 */
export const VOICE_CONTEXT_OVERRIDES = {
  /** For greeting/opener — slightly warmer and slower to establish rapport. */
  greeting: {
    speed: 0.92,
    warmth: 0.7,
    style: 0.5,
  },
  /** For reading back info (phone numbers, addresses) — clearer and more deliberate. */
  readback: {
    speed: 0.85,
    stability: 0.55,
    sentencePause: 0.25,
  },
  /** For empathetic responses (complaints, concerns) — softer, warmer. */
  empathetic: {
    warmth: 0.75,
    speed: 0.9,
    style: 0.5,
    responseDelay: 0.7,
  },
  /** For closing/wrap-up — slightly more upbeat. */
  closing: {
    speed: 0.98,
    warmth: 0.65,
    style: 0.45,
  },
} as const;

export type VoiceContextOverrides = typeof VOICE_CONTEXT_OVERRIDES;

/**
 * Phone-line optimization defaults. Real phone calls are 8kHz narrowband —
 * these settings ensure the voice sounds great on actual phone hardware,
 * not just in browser previews.
 */
export const PHONE_LINE_OPTIMIZATION = {
  /** Output sample rate matched to telephony (8kHz PCMU). */
  outputSampleRate: 8000,
  /** Emphasis on 300-3400Hz range (telephone passband). */
  telephonyEqEnabled: true,
  /** Slight compression so whispers and emphasis both transmit cleanly. */
  dynamicRangeCompression: 0.3,
  /** Reduce sibilance ("s" sounds) that get harsh on phone speakers. */
  deEsserStrength: 0.4,
  /** Breath noise floor — just enough to sound human, not enough to distract. */
  breathNoiseFloor: -45,
  /** Warm low-end boost (dB) — phones thin out the bass; this compensates. */
  lowEndBoostDb: 2.5,
} as const;

/**
 * Anti-detection patterns that prevent the agent from sounding robotic.
 * These inject subtle human imperfections that make the voice trustworthy.
 */
export const HUMAN_IMPERFECTION_SETTINGS = {
  /** Occasional micro-pauses between clauses (ms range). Real humans pause to think. */
  microPauseRange: [80, 250] as const,
  /** Slight pitch variation between sentences (semitones). Monotone = robotic. */
  pitchVariationSemitones: 0.8,
  /** Inject thinking sounds ("let me check", "one moment") before tool-call delays. */
  thinkingSoundsEnabled: true,
  /** When reading lists, slightly speed up on middle items (natural cadence pattern). */
  listCadenceAcceleration: true,
  /** On numbers and names, slightly slow down and emphasize (natural emphasis pattern). */
  importantWordEmphasis: true,
  /** Word-initial aspiration — slight breath before sentence-start words. */
  sentenceStartBreath: true,
} as const;
