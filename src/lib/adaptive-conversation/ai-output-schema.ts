/**
 * Adaptive conversation intelligence — AI must output structured JSON only.
 * Never return message text. Intent, emotional signals, risk flags, confidence, suggested_state_transition.
 */

import { z } from "zod";

export const adaptiveAIOutputSchema = z.object({
  intent: z.string(),
  emotional_signals: z
    .object({
      urgency_score: z.number().min(0).max(1),
      skepticism_score: z.number().min(0).max(1),
      compliance_sensitivity: z.number().min(0).max(1),
      aggression_level: z.number().min(0).max(1),
      authority_resistance: z.number().min(0).max(1),
      trust_requirement: z.number().min(0).max(1),
    })
    .optional(),
  risk_flags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  suggested_state_transition: z.string().optional(),
});

export type AdaptiveAIOutput = z.infer<typeof adaptiveAIOutputSchema>;
