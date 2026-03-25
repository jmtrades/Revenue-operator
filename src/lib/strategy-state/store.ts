/**
 * Conversation strategy state store. Deterministic. No Date.now() in logic; use DB timestamps or explicit ISO.
 */

import { getDb } from "@/lib/db/queries";

const STRATEGY_STATES = [
  "discovery", "pain_identification", "qualification", "authority_check", "timeline_check",
  "financial_alignment", "objection_handling", "offer_positioning", "compliance_disclosure",
  "commitment_request", "follow_up_lock", "escalation", "disqualification",
  "cold_prospect", "warm_inbound", "appointment_set", "no_show", "recovered",
  "payment_pending", "contract_sent", "disclosure_required", "awaiting_compliance",
  "disputed", "reactivation",
] as const;

export type StrategyStateValue = (typeof STRATEGY_STATES)[number];

export interface StrategyStateRow {
  workspace_id: string;
  conversation_id: string;
  thread_id: string | null;
  work_unit_id: string | null;
  domain_type: string;
  current_state: string;
  last_intent_type: string | null;
  last_channel: string | null;
  jurisdiction: string | null;
  updated_at: string;
}

export interface UpsertStrategyStateInput {
  workspace_id: string;
  conversation_id: string;
  thread_id?: string | null;
  work_unit_id?: string | null;
  domain_type?: string;
  current_state?: string;
  last_intent_type?: string | null;
  last_channel?: string | null;
  jurisdiction?: string | null;
  updated_at?: string;
}

function normalizeState(state: string): StrategyStateValue {
  const s = state.toLowerCase().trim();
  return STRATEGY_STATES.includes(s as StrategyStateValue) ? (s as StrategyStateValue) : "discovery";
}

/** All allowed state values (strategy + lifecycle). */
export const ALL_STRATEGY_STATES = [...STRATEGY_STATES];

export async function getStrategyState(
  workspaceId: string,
  conversationId: string
): Promise<StrategyStateRow | null> {
  const db = getDb();
  const { data } = await db
    .from("conversation_strategy_state")
    .select("workspace_id, conversation_id, thread_id, work_unit_id, domain_type, current_state, last_intent_type, last_channel, jurisdiction, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  return data as StrategyStateRow | null;
}

export async function upsertStrategyState(input: UpsertStrategyStateInput): Promise<void> {
  const db = getDb();
  const now = input.updated_at ?? new Date().toISOString();
  const current_state = input.current_state != null ? normalizeState(input.current_state) : "discovery";
  await db
    .from("conversation_strategy_state")
    .upsert(
      {
        workspace_id: input.workspace_id,
        conversation_id: input.conversation_id,
        thread_id: input.thread_id ?? null,
        work_unit_id: input.work_unit_id ?? null,
        domain_type: input.domain_type ?? "general",
        current_state,
        last_intent_type: input.last_intent_type ?? null,
        last_channel: input.last_channel ?? null,
        jurisdiction: input.jurisdiction ?? null,
        updated_at: now,
      },
      { onConflict: "workspace_id,conversation_id" }
    );
}
