/**
 * AI Contract: strict JSON schema.
 * intent, entities, sentiment, confidence, recommended_action, slot_values
 * Reject invalid, retry once, then fallback.
 */

import { z } from "zod";

export const AIContractSchema = z.object({
  intent: z.string(),
  entities: z.record(z.string(), z.unknown()).optional().default({}),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).optional().default("neutral"),
  confidence: z.number().min(0).max(1),
  recommended_action: z.string(),
  slot_values: z.object({
    greeting: z.string().optional(),
    context_line: z.string().optional(),
    question_1: z.string().optional(),
    question_2: z.string().optional(),
    cta: z.string().optional(),
  }).optional().default({}),
});

export type AIContract = z.infer<typeof AIContractSchema>;

export function parseAIContract(raw: string): { success: true; data: AIContract } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw);
    const result = AIContractSchema.safeParse(parsed);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error.message };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}
