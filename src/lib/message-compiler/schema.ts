/**
 * Zod schema for MessagePlan. LLM may only return these fields.
 */

import { z } from "zod";

const messageIntentSchema = z.enum([
  "follow_up",
  "confirm_booking",
  "reschedule_request",
  "payment_link",
  "payment_reminder",
  "clarification",
  "close_loop",
  "handoff_hold",
  "acknowledgement_request",
  "dispute_resolution",
  "outcome_confirmation",
]);

const stanceSchema = z.enum(["confirm", "request", "inform", "close"]);
const toneSchema = z.enum(["neutral", "firm", "warm"]);
const clauseTypeSchema = z.enum([
  "acknowledgment",
  "next_step",
  "confirmation_request",
  "payment_prompt",
  "outcome",
  "close_loop",
  "handoff",
  "record_expectation",
]);

export const messagePlanSchema = z.object({
  intent: messageIntentSchema,
  stance: stanceSchema,
  entities: z.object({
    name: z.string().optional(),
    time: z.string().optional(),
    amount: z.string().optional(),
    link: z.string().optional(),
    service: z.string().optional(),
    invoice_id: z.string().optional(),
    booking_id: z.string().optional(),
  }),
  constraints: z.object({
    max_chars: z.number().optional(),
    channel: z.enum(["sms", "email", "web"]).optional(),
    forbidden_terms: z.array(z.string()).optional(),
    must_include: z.array(z.string()).optional(),
  }),
  tone: toneSchema,
  proof_anchor: z.string().optional(),
  reason_tags: z.array(z.string()),
  clauses: z.array(z.object({ type: clauseTypeSchema })).optional(),
});

export type MessagePlanSchemaType = z.infer<typeof messagePlanSchema>;

export function parseMessagePlan(raw: unknown): { success: true; data: MessagePlanSchemaType } | { success: false; error: string } {
  const result = messagePlanSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.message };
}
