/**
 * Refresh operability anchor from LIVE maintenance sources (not authority lists).
 * Called from cron only. Responsibility is read-only.
 */

import { getDb } from "@/lib/db/queries";
import { getConfidencePhase } from "@/lib/confidence-engine";
import { log } from "@/lib/logger";
import {
  upsertOperationalExpectation,
  removeOperationalExpectation,
} from "./expectations";
import type { ExpectationType } from "./types";

const logRefreshSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `refresh.${ctx}`, { error: e instanceof Error ? e.message : String(e) });
};

const RECENT_HOURS = 24;
const NEXT_ACTION_WINDOW_MINUTES = 60;

export async function refreshOperabilityAnchor(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const nextActionLimit = new Date(now.getTime() + NEXT_ACTION_WINDOW_MINUTES * 60 * 1000).toISOString();
  const recentCutoff = new Date(now.getTime() - RECENT_HOURS * 60 * 60 * 1000).toISOString();

  const phase = await getConfidencePhase(workspaceId);
  const notObserving = phase !== "observing";

  const currentIds: Record<ExpectationType, Set<string>> = {
    awaiting_reply: new Set(),
    awaiting_confirmation: new Set(),
    awaiting_payment: new Set(),
    awaiting_counterparty: new Set(),
  };

  // A) awaiting_reply: opportunity_states slowing/stalled, authority_required=false, revive_attempts<3, (next_action_at null or <= now+60m)
  const { data: oppRows } = await db
    .from("opportunity_states")
    .select("id, conversation_id, revive_attempts, next_action_at")
    .eq("workspace_id", workspaceId)
    .in("momentum_state", ["slowing", "stalled"])
    .eq("authority_required", false)
    .lt("revive_attempts", 3)
    .or(`next_action_at.is.null,next_action_at.lte.${nextActionLimit}`);

  const hasRecentShadowOpportunity = notObserving
    ? await db
        .from("shadow_execution_log")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("action_type", "opportunity_revival")
        .gte("created_at", recentCutoff)
        .limit(1)
        .then((r) => (r?.data?.length ?? 0) > 0)
    : false;

  for (const row of oppRows ?? []) {
    const r = row as { conversation_id: string; revive_attempts: number; next_action_at: string | null };
    currentIds.awaiting_reply.add(r.conversation_id);
    const maintained =
      notObserving &&
      (r.revive_attempts > 0 || r.next_action_at != null || hasRecentShadowOpportunity);
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_reply",
      r.conversation_id,
      maintained
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }

  // B) awaiting_confirmation: commitments state in (overdue, recovery_required, awaiting_response), authority_required=false, recovery_attempts<2
  const { data: commRows } = await db
    .from("commitments")
    .select("id, recovery_attempts")
    .eq("workspace_id", workspaceId)
    .in("state", ["overdue", "recovery_required", "awaiting_response"])
    .eq("authority_required", false)
    .lt("recovery_attempts", 2);

  const hasRecentActionCommitment = notObserving
    ? await db
        .from("action_commands")
        .select("id, payload")
        .eq("workspace_id", workspaceId)
        .gte("created_at", recentCutoff)
        .limit(500)
        .then((res) => {
          const rows = res?.data ?? [];
          return rows.some(
            (x: { payload?: { action_type?: string } }) =>
              (x.payload as { action_type?: string })?.action_type === "commitment_recovery"
          );
        })
    : false;
  const hasShadowCommitment = notObserving
    ? await db
        .from("shadow_execution_log")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("action_type", "commitment_recovery")
        .gte("created_at", recentCutoff)
        .limit(1)
        .then((r) => (r?.data?.length ?? 0) > 0)
    : false;

  for (const row of commRows ?? []) {
    const r = row as { id: string; recovery_attempts: number };
    currentIds.awaiting_confirmation.add(r.id);
    const maintained =
      notObserving &&
      (r.recovery_attempts > 0 || hasRecentActionCommitment || hasShadowCommitment);
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_confirmation",
      r.id,
      maintained
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }

  // C) awaiting_payment: payment_obligations state in (overdue, recovering), authority_required=false, recovery_attempts<3
  const { data: payRows } = await db
    .from("payment_obligations")
    .select("id, recovery_attempts, next_attempt_at")
    .eq("workspace_id", workspaceId)
    .in("state", ["overdue", "recovering"])
    .eq("authority_required", false)
    .lt("recovery_attempts", 3);

  const hasShadowPayment = notObserving
    ? await db
        .from("shadow_execution_log")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("action_type", "payment_recovery")
        .gte("created_at", recentCutoff)
        .limit(1)
        .then((r) => (r?.data?.length ?? 0) > 0)
    : false;

  for (const row of payRows ?? []) {
    const r = row as { id: string; recovery_attempts: number; next_attempt_at: string | null };
    currentIds.awaiting_payment.add(r.id);
    const maintained =
      notObserving &&
      (r.recovery_attempts > 0 || r.next_attempt_at != null || hasShadowPayment);
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_payment",
      r.id,
      maintained
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }

  // D) awaiting_counterparty: shared_transactions state=pending_acknowledgement, authority_required=false
  const { data: txRows } = await db
    .from("shared_transactions")
    .select("id, reminder_sent_count")
    .eq("workspace_id", workspaceId)
    .eq("state", "pending_acknowledgement")
    .eq("authority_required", false);

  const { data: tokenRows } = await db
    .from("shared_transaction_tokens")
    .select("transaction_id, expires_at")
    .eq("workspace_id", workspaceId)
    .gte("expires_at", nowIso);

  const txIdsWithToken = new Set(
    (tokenRows ?? []).map((x: { transaction_id: string }) => x.transaction_id)
  );

  for (const row of txRows ?? []) {
    const r = row as { id: string; reminder_sent_count?: number };
    currentIds.awaiting_counterparty.add(r.id);
    const hasToken = txIdsWithToken.has(r.id);
    const maintained =
      notObserving && (hasToken || (r.reminder_sent_count ?? 0) >= 0);
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_counterparty",
      r.id,
      maintained
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }

  // Remove expectations no longer in source sets
  const { data: existing } = await db
    .from("active_operational_expectations")
    .select("expectation_type, reference_id")
    .eq("workspace_id", workspaceId);

  for (const row of existing ?? []) {
    const r = row as { expectation_type: ExpectationType; reference_id: string };
    const set = currentIds[r.expectation_type];
    if (!set.has(r.reference_id)) {
      await removeOperationalExpectation(workspaceId, r.expectation_type, r.reference_id).catch(
        logRefreshSideEffect("remove_expectation")
      );
    }
  }

  const { processMaintainsOperation } = await import("./expectations");
  const { recordContinuityLoad } = await import("@/lib/continuity-load");
  if (await processMaintainsOperation(workspaceId)) {
    const hourBucket = new Date().toISOString().slice(0, 13);
    recordContinuityLoad(workspaceId, "operation_sustained", `anchor:${hourBucket}`).catch(logRefreshSideEffect("record_continuity_load"));
  }
}

export async function refreshCommitmentExpectations(
  workspaceId: string,
  commitmentIds: string[],
  maintainedBySystem: boolean
): Promise<void> {
  for (const id of commitmentIds) {
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_confirmation",
      id,
      maintainedBySystem
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }
}

export async function refreshOpportunityExpectations(
  workspaceId: string,
  conversationIds: string[],
  maintainedBySystem: boolean
): Promise<void> {
  for (const id of conversationIds) {
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_reply",
      id,
      maintainedBySystem
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }
}

export async function refreshPaymentExpectations(
  workspaceId: string,
  obligationIds: string[],
  maintainedBySystem: boolean
): Promise<void> {
  for (const id of obligationIds) {
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_payment",
      id,
      maintainedBySystem
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }
}

export async function refreshSharedTransactionExpectations(
  workspaceId: string,
  transactionIds: string[],
  maintainedBySystem: boolean
): Promise<void> {
  for (const id of transactionIds) {
    await upsertOperationalExpectation(
      workspaceId,
      "awaiting_counterparty",
      id,
      maintainedBySystem
    ).catch(logRefreshSideEffect("upsert_expectation"));
  }
}
