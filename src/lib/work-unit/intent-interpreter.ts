/**
 * Unified Intent Interpreter.
 * Returns strict JSON only. Maps intent → work_unit_type deterministically.
 * Policy decides final action; AI never selects arbitrary next action.
 */

import { z } from "zod";
import { parseAIContract, type AIContract } from "@/lib/ai/contract";

export const IntentInterpreterSchema = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string(), z.unknown()).optional().default({}),
  urgency: z.enum(["low", "normal", "high", "critical"]).optional().default("normal"),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).optional().default("neutral"),
  risk_flags: z.array(z.string()).optional().default([]),
  recommended_action: z.string(),
  work_unit_type: z.string(),
});

export type IntentInterpreterResult = z.infer<typeof IntentInterpreterSchema>;

/** Deterministic map: intent (normalized) → work_unit_type. No probabilistic choice. */
const INTENT_TO_WORK_UNIT_TYPE: Record<string, string> = {
  inquiry: "shared_transaction",
  booking: "appointment",
  confirmation: "shared_transaction",
  payment: "payment_obligation",
  delivery: "shared_transaction",
  agreement: "contract_execution",
  greeting: "shared_transaction",
  question: "shared_transaction",
  clarifying_question: "shared_transaction",
  follow_up: "followup_commitment",
  call_invite: "qualification_call",
  opt_out: "shared_transaction",
  objection: "shared_transaction",
  reschedule: "appointment",
  cancellation: "appointment",
  inbound_lead: "inbound_lead",
  outbound_prospect: "outbound_prospect",
  document_request: "document_request",
  compliance_notice: "compliance_notice",
  retention: "retention_cycle",
  dispute: "dispute_resolution",
  default: "shared_transaction",
};

function mapIntentToWorkUnitType(intent: string): string {
  const normalized = intent.toLowerCase().replace(/\s+/g, "_").slice(0, 64);
  return INTENT_TO_WORK_UNIT_TYPE[normalized] ?? INTENT_TO_WORK_UNIT_TYPE.default;
}

function urgencyFromRiskFlags(riskFlags: string[]): "low" | "normal" | "high" | "critical" {
  if (riskFlags.includes("legal_sensitivity") || riskFlags.includes("anger")) return "high";
  if (riskFlags.includes("opt_out_signal")) return "critical";
  if (riskFlags.length > 0) return "normal";
  return "low";
}

/**
 * Interpret inbound message to strict JSON.
 * Uses existing AI contract; adds work_unit_type (deterministic) and urgency.
 * Never allow AI to select arbitrary next action — recommended_action is still gated by policy.
 */
export function interpretInboundMessage(contract: AIContract): IntentInterpreterResult {
  const work_unit_type = mapIntentToWorkUnitType(contract.intent);
  const urgency = urgencyFromRiskFlags(contract.risk_flags ?? []);
  const result = IntentInterpreterSchema.safeParse({
    intent: contract.intent,
    confidence: contract.confidence,
    entities: contract.entities ?? {},
    urgency,
    sentiment: contract.sentiment ?? "neutral",
    risk_flags: contract.risk_flags ?? [],
    recommended_action: contract.recommended_action,
    work_unit_type,
  });
  if (result.success) return result.data;
  return {
    intent: contract.intent,
    confidence: contract.confidence,
    entities: contract.entities ?? {},
    urgency: "normal",
    sentiment: (contract.sentiment ?? "neutral") as "positive" | "neutral" | "negative" | "mixed",
    risk_flags: contract.risk_flags ?? [],
    recommended_action: contract.recommended_action,
    work_unit_type,
  };
}

/**
 * Parse raw AI output and return unified interpreter result.
 * Use when you have raw string from LLM and need strict JSON + work_unit_type.
 */
export function parseAndInterpret(raw: string): { success: true; data: IntentInterpreterResult } | { success: false; error: string } {
  const parsed = parseAIContract(raw);
  if (!parsed.success) return parsed;
  return { success: true, data: interpretInboundMessage(parsed.data) };
}
