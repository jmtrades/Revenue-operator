/**
 * Commitment & Momentum Scoring Engine — deterministic, append-only.
 * Updated after every interaction. Stored in ledger only. Never deletes history.
 */

import { getDb } from "@/lib/db/queries";
import { appendLedgerEvent } from "@/lib/ops/ledger";

export interface CommitmentState {
  trustScore: number;
  momentumScore: number;
  frictionScore: number;
  volatilityScore: number;
  probabilityScore: number;
}

const CLAMP = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n))));

/** Default state when no prior score exists. */
export const DEFAULT_COMMITMENT_STATE: CommitmentState = {
  trustScore: 50,
  momentumScore: 50,
  frictionScore: 50,
  volatilityScore: 0,
  probabilityScore: 50,
};

/** Structured input from voice outcome. Deterministic deltas only. */
export interface VoiceOutcomeInput {
  outcome: "connected" | "no_answer" | "voicemail" | "busy" | "failed" | "completed";
  consent_recorded?: boolean | null;
  disclosures_read?: boolean | null;
  objection_key?: string | null;
  next_required_action?: string | null;
}

/** Structured input from message/send outcome. */
export interface MessageOutcomeInput {
  result_status: "succeeded" | "failed" | "skipped";
  intent_type?: string | null;
}

/**
 * Compute next commitment state from previous state and structured input.
 * Pure deterministic increments/decrements. No randomness.
 */
export function computeNextCommitmentState(
  previous: CommitmentState,
  input: VoiceOutcomeInput | MessageOutcomeInput
): CommitmentState {
  let trust = previous.trustScore;
  let momentum = previous.momentumScore;
  let friction = previous.frictionScore;
  let volatility = previous.volatilityScore;

  if ("outcome" in input) {
    const v = input as VoiceOutcomeInput;
    if (v.outcome === "completed" || v.outcome === "connected") {
      trust = Math.min(100, trust + 5);
      momentum = Math.min(100, momentum + 8);
      friction = Math.max(0, friction - 5);
    } else if (v.outcome === "no_answer" || v.outcome === "voicemail" || v.outcome === "busy") {
      momentum = Math.max(0, momentum - 3);
      friction = Math.min(100, friction + 2);
    } else if (v.outcome === "failed") {
      momentum = Math.max(0, momentum - 5);
      friction = Math.min(100, friction + 5);
      volatility = Math.min(100, volatility + 5);
    }
    if (v.consent_recorded === true) trust = Math.min(100, trust + 5);
    if (v.disclosures_read === true) trust = Math.min(100, trust + 3);
    if (v.objection_key) {
      friction = Math.min(100, friction + 4);
      volatility = Math.min(100, volatility + 3);
    }
    if (v.next_required_action === "escalate_to_human") {
      volatility = Math.min(100, volatility + 10);
      friction = Math.min(100, friction + 5);
    }
  } else {
    const m = input as MessageOutcomeInput;
    if (m.result_status === "succeeded") {
      momentum = Math.min(100, momentum + 4);
      friction = Math.max(0, friction - 2);
    } else if (m.result_status === "failed") {
      momentum = Math.max(0, momentum - 4);
      friction = Math.min(100, friction + 4);
    }
  }

  if ("commitment_fulfilled" in input && (input as { commitment_fulfilled?: boolean }).commitment_fulfilled) {
    trust = Math.min(100, trust + 15);
  }
  if ("commitment_broken" in input && (input as { commitment_broken?: boolean }).commitment_broken) {
    trust = Math.max(0, trust - 20);
    volatility = Math.min(100, volatility + 10);
  }

  const probabilityScore = CLAMP((trust * 0.3 + momentum * 0.4 + (100 - friction) * 0.2 + (100 - volatility) * 0.1));

  return {
    trustScore: CLAMP(trust),
    momentumScore: CLAMP(momentum),
    frictionScore: CLAMP(friction),
    volatilityScore: CLAMP(volatility),
    probabilityScore,
  };
}

const COMMITMENT_EVENT = "commitment_score_updated";

/**
 * Append new commitment state to ledger (append-only). Never deletes.
 */
export async function appendCommitmentScore(
  workspaceId: string,
  threadId: string,
  state: CommitmentState,
  nowIso?: string
): Promise<{ ok: boolean }> {
  return appendLedgerEvent({
    workspaceId,
    eventType: COMMITMENT_EVENT,
    severity: "info",
    subjectType: "thread",
    subjectRef: threadId.slice(0, 160),
    details: {
      thread_id: threadId,
      trustScore: state.trustScore,
      momentumScore: state.momentumScore,
      frictionScore: state.frictionScore,
      volatilityScore: state.volatilityScore,
      probabilityScore: state.probabilityScore,
      at: nowIso ?? new Date().toISOString(),
    },
  });
}

/**
 * Get latest commitment state for a thread from ledger. Bounded: ORDER BY + LIMIT 1.
 */
export async function getLatestCommitmentState(
  workspaceId: string,
  threadId: string
): Promise<CommitmentState | null> {
  const db = getDb();
  const { data: row } = await db
    .from("operational_ledger")
    .select("details_json")
    .eq("workspace_id", workspaceId)
    .eq("event_type", COMMITMENT_EVENT)
    .eq("subject_type", "thread")
    .eq("subject_ref", threadId.slice(0, 160))
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const d = (row as { details_json?: Record<string, unknown> } | null)?.details_json;
  if (!d || typeof d !== "object") return null;
  const t = Number((d as Record<string, unknown>).trustScore);
  const m = Number((d as Record<string, unknown>).momentumScore);
  const f = Number((d as Record<string, unknown>).frictionScore);
  const v = Number((d as Record<string, unknown>).volatilityScore);
  const p = Number((d as Record<string, unknown>).probabilityScore);
  if (Number.isNaN(t)) return null;
  return {
    trustScore: CLAMP(t),
    momentumScore: CLAMP(m),
    frictionScore: CLAMP(f),
    volatilityScore: CLAMP(v),
    probabilityScore: Number.isNaN(p) ? CLAMP(t * 0.3 + m * 0.4 + (100 - f) * 0.2 + (100 - v) * 0.1) : CLAMP(p),
  };
}

/**
 * Update commitment from voice outcome: get latest, compute next, append to ledger.
 */
export async function updateCommitmentFromVoiceOutcome(
  workspaceId: string,
  threadId: string,
  input: VoiceOutcomeInput
): Promise<{ ok: boolean }> {
  const previous = await getLatestCommitmentState(workspaceId, threadId) ?? DEFAULT_COMMITMENT_STATE;
  const next = computeNextCommitmentState(previous, input);
  return appendCommitmentScore(workspaceId, threadId, next);
}

/**
 * Update commitment from message outcome: get latest, compute next, append to ledger.
 */
export async function updateCommitmentFromMessageOutcome(
  workspaceId: string,
  threadId: string,
  input: MessageOutcomeInput
): Promise<{ ok: boolean }> {
  const previous = await getLatestCommitmentState(workspaceId, threadId) ?? DEFAULT_COMMITMENT_STATE;
  const next = computeNextCommitmentState(previous, input);
  return appendCommitmentScore(workspaceId, threadId, next);
}
