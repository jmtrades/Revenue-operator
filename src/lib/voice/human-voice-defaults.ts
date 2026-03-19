/**
 * Human-sounding voice defaults for Recall voice server.
 * Tuned for natural, conversational quality: slightly lower stability for expressiveness,
 * moderate style, natural speed, and a brief response delay so the agent feels thoughtful.
 */

export const HUMAN_VOICE_DEFAULTS = {
  /** Lower = more expressive/human (0.35–0.5). Higher = more consistent but flatter. */
  stability: 0.48,
  /** Clarity without over-processing. 0.75–0.85 typical. */
  similarityBoost: 0.78,
  /** Slight expressiveness. 0.3–0.5 range. */
  style: 0.4,
  /** Natural speaking rate. */
  speed: 1,
  /** Brief pause before replying (seconds). Feels more human than instant. */
  responseDelay: 0.45,
  /** "Mm-hmm", etc. while the caller is speaking. */
  backchannel: true,
  /** Reduce background noise for clearer listening. */
  denoising: true,
  /** Improve clarity on phone. */
  useSpeakerBoost: true,
} as const;

export type HumanVoiceDefaults = typeof HUMAN_VOICE_DEFAULTS;
