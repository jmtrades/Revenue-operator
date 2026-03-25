/**
 * Zod schemas for speech governance: policy JSON, template slots, trace outputs.
 */

import { z } from "zod";

export const policySchema = z.object({
  banned_phrases: z.array(z.string()).optional().default([]),
  required_clauses: z.array(z.object({
    when_intents: z.array(z.string()),
    clause_type: z.string(),
  })).optional().default([]),
  required_disclosures: z.array(z.object({
    trigger_terms: z.array(z.string()),
    disclosure_template_key: z.string(),
  })).optional().default([]),
  forbidden_terms_by_intent: z.array(z.object({
    intent_type: z.string(),
    terms: z.array(z.string()),
  })).optional().default([]),
  contact_limits: z.object({
    per_day: z.number(),
    cooldown_minutes: z.number(),
  }).optional(),
  pii_redaction: z.object({
    deny_terms: z.array(z.string()),
  }).optional().default({ deny_terms: [] }),
});

export type PolicySchema = z.infer<typeof policySchema>;

export const templateSlotsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export type TemplateSlots = z.infer<typeof templateSlotsSchema>;

export const checkResultSchema = z.object({
  check: z.string(),
  passed: z.boolean(),
  reason: z.string().optional(),
});

export const traceOutputSchema = z.object({
  policy_checks: z.array(checkResultSchema),
  templates_used: z.array(z.object({ key: z.string(), version: z.number() })),
  clause_plan: z.record(z.string(), z.unknown()).optional(),
});

export type CheckResult = z.infer<typeof checkResultSchema>;
export type TraceOutput = z.infer<typeof traceOutputSchema>;
