/**
 * Voice-specific feature gating deterministic by billing tier
 * Enforces limits on voice features: cloning, A/B testing, premium voices, custom emotions
 */

import { BillingTier } from "@/lib/feature-gate/types";
import { VOICE_TIER_LIMITS, type VoiceTierLimits } from "./billing";

export type VoiceFeature =
  | "voice_minutes"
  | "voice_cloning"
  | "ab_testing"
  | "concurrent_calls"
  | "premium_voices"
  | "custom_emotions"
  | "voice_library";

/**
 * Check if a voice feature is available for the given tier
 */
export function canUseVoice(tier: BillingTier, feature: VoiceFeature): boolean {
  const limits = VOICE_TIER_LIMITS[tier];

  switch (feature) {
    case "voice_minutes":
      return limits.voice_minutes !== 0;

    case "voice_cloning":
      return limits.voice_clones !== 0;

    case "ab_testing":
      return limits.ab_tests !== 0;

    case "concurrent_calls":
      return limits.concurrent_calls > 0;

    case "premium_voices":
      return limits.premium_voices;

    case "custom_emotions":
      return limits.custom_emotions;

    case "voice_library":
      return limits.voices_available > 0;

    default:
      return false;
  }
}

/**
 * Get all voice limits for a tier
 */
export function getVoiceLimits(tier: BillingTier): VoiceTierLimits {
  return VOICE_TIER_LIMITS[tier];
}

/**
 * Determine if a voice is premium
 * Premium voices include: industry-specialist voices (industry-*) and cloned voices
 */
export function isVoicePremium(voiceId: string): boolean {
  // Industry-specialist voices
  if (voiceId.startsWith("industry-")) {
    return true;
  }

  // Cloned voices typically have a specific naming pattern
  // Adjust based on your actual voice ID schema
  if (voiceId.startsWith("clone-")) {
    return true;
  }

  // Custom voices from the voice_models table are premium
  if (voiceId.startsWith("custom-")) {
    return true;
  }

  return false;
}
