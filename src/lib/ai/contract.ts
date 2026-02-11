/**
 * AI Contract: strict JSON schema.
 * intent, entities, sentiment, confidence, risk_flags, recommended_action, explanation, slot_values
 * Reject invalid, retry once, then fallback.
 */

import { z } from "zod";

export const AIContractSchema = z.object({
  intent: z.string(),
  entities: z.record(z.string(), z.unknown()).optional().default({}),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).optional().default("neutral"),
  confidence: z.number().min(0).max(1),
  risk_flags: z.array(z.string()).optional().default([]),
  recommended_action: z.string(),
  explanation: z.string().optional().default(""),
  slot_values: z.object({
    greeting: z.string().optional(),
    context_line: z.string().optional(),
    question_1: z.string().optional(),
    question_2: z.string().optional(),
    cta: z.string().optional(),
  }).optional().default({}),
});

export type AIContract = z.infer<typeof AIContractSchema>;

export const REASONING_RISK_FLAGS = [
  "anger",
  "confusion_repeated",
  "unsupported_question",
  "pricing_negotiation",
  "opt_out_signal",
  "competitor_mention",
  "legal_sensitivity",
] as const;

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
