/**
 * Resiliency Layer: strip filler words and normalize fragments for STT/transcript.
 * Handles background noise semantically by not treating filler-heavy segments as intent.
 */

const FILLER_PATTERN = /\b(um|uh|ah|er|like|you know|I mean)\b/gi;
const MULTI_SPACE = /\s{2,}/g;
const TRAILING_FRAGMENTS = /^\s*(and|but|so|well),?\s*$/i;

export interface ResiliencyOptions {
  stripFillers?: boolean;
  normalizeSpaces?: boolean;
  minLengthForIntent?: number;
}

const DEFAULTS: Required<ResiliencyOptions> = {
  stripFillers: true,
  normalizeSpaces: true,
  minLengthForIntent: 3,
};

/**
 * Clean raw transcript for LLM/state machine. Returns normalized text and whether it looks like intent.
 */
export function cleanTranscript(
  raw: string,
  options: ResiliencyOptions = {}
): { text: string; hasIntent: boolean } {
  const opts = { ...DEFAULTS, ...options };
  let text = String(raw ?? "").trim();

  if (opts.stripFillers) {
    text = text.replace(FILLER_PATTERN, " ").trim();
  }
  if (opts.normalizeSpaces) {
    text = text.replace(MULTI_SPACE, " ").trim();
  }
  const noFragmentOnly = text.replace(TRAILING_FRAGMENTS, "").trim();
  const hasIntent =
    noFragmentOnly.length >= opts.minLengthForIntent && noFragmentOnly.length > 0;

  return { text: noFragmentOnly || text, hasIntent };
}

/**
 * Optional: detect if segment is likely noise (e.g. all fillers). Used to avoid acting on non-speech.
 */
export function isLikelyNoise(segment: string): boolean {
  const cleaned = segment.replace(FILLER_PATTERN, "").replace(/\s/g, "");
  return cleaned.length < 2;
}
