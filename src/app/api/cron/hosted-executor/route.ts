/**
 * Cron: hosted executor batch. Bounded: max N workspaces, max M intents per workspace per run.
 * ORDER BY + LIMIT only. No DELETE. No provider calls.
 * If rate ceiling hit → emit pause_execution and ledger event rate_ceiling_triggered.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/execution-plan/rate-limits";
import { createActionIntent } from "@/lib/action-intents";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import { evaluateSelfHealing } from "@/lib/intelligence/self-healing";
import { evaluateWorkspacePatternGuard, type WorkspacePatternGuardResult } from "@/lib/intelligence/workspace-pattern-guard";
import { log } from "@/lib/logger";

const MAX_WORKSPACES_PER_RUN = 10;
const MAX_INTENTS_PER_WORKSPACE_PER_RUN = 5;
const MIN_RUN_INTERVAL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();

  const { data: heartbeat } = await db
    .from("system_cron_heartbeats")
    .select("last_ran_at")
    .eq("job_name", "hosted-executor")
    .limit(1)
    .maybeSingle();
  const lastRan = (heartbeat as { last_ran_at?: string } | null)?.last_ran_at;
  if (lastRan) {
    const elapsed = Date.now() - new Date(lastRan).getTime();
    if (elapsed < MIN_RUN_INTERVAL_MS) {
      const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
      await recordCronHeartbeat("hosted-executor").catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      return NextResponse.json({ ok: true, skipped: true, reason: "concurrency_guard" });
    }
  }

  const { data: unclaimed } = await db
    .from("action_intents")
    .select("id, workspace_id, intent_type, created_at")
    .is("claimed_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_WORKSPACES_PER_RUN * MAX_INTENTS_PER_WORKSPACE_PER_RUN * 2);

  const byWorkspace = new Map<string, { id: string; intent_type: string }[]>();
  for (const row of unclaimed ?? []) {
    const r = row as { id: string; workspace_id: string; intent_type: string };
    if (!byWorkspace.has(r.workspace_id)) byWorkspace.set(r.workspace_id, []);
    const arr = byWorkspace.get(r.workspace_id)!;
    if (arr.length < MAX_INTENTS_PER_WORKSPACE_PER_RUN) arr.push({ id: r.id, intent_type: r.intent_type });
  }

  let workspaceIds = Array.from(byWorkspace.keys()).slice(0, MAX_WORKSPACES_PER_RUN);
  const skippedByPattern: string[] = [];
  for (const workspaceId of workspaceIds) {
    const guard: WorkspacePatternGuardResult = await evaluateWorkspacePatternGuard(workspaceId).catch(() => ({}));
    if (guard.requiresPause) {
      await createActionIntent(workspaceId, {
        threadId: null,
        workUnitId: null,
        intentType: "pause_execution",
        payload: { reason: "workspace_pattern_pause", workspace_id: workspaceId },
        dedupeKey: `hosted-exec:pattern:${workspaceId}:${Date.now()}`,
      }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      await appendLedgerEvent({
        workspaceId,
        eventType: "workspace_pattern_pause",
        severity: "warning",
        subjectType: "workspace",
        subjectRef: workspaceId,
        details: { advisory: guard.advisory },
      }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      skippedByPattern.push(workspaceId);
    }
    if (guard.requiresEscalation) {
      await appendLedgerEvent({
        workspaceId,
        eventType: "workspace_pattern_escalation",
        severity: "warning",
        subjectType: "workspace",
        subjectRef: workspaceId,
        details: { advisory: guard.advisory },
      }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
    }
  }
  workspaceIds = workspaceIds.filter((id) => !skippedByPattern.includes(id));
  let rateCeilingHit = 0;

  for (const workspaceId of workspaceIds) {
    const intents = byWorkspace.get(workspaceId) ?? [];
    for (const intent of intents) {
      const kind = intent.intent_type === "place_outbound_call" ? "voice" : "message";
      try {
        await assertWithinRateLimit(workspaceId, kind);
      } catch (err) {
        if (err instanceof RateLimitExceededError) {
          await createActionIntent(workspaceId, {
            threadId: null,
            workUnitId: null,
            intentType: "pause_execution",
            payload: { reason: "rate_ceiling_triggered", workspace_id: workspaceId },
            dedupeKey: `hosted-exec:rate:${workspaceId}:${Date.now()}`,
          }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
          await appendLedgerEvent({
            workspaceId,
            eventType: "rate_ceiling_triggered",
            severity: "warning",
            subjectType: "workspace",
            subjectRef: workspaceId,
            details: { source: "hosted_executor" },
          }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
          await appendLedgerEvent({
            workspaceId,
            eventType: "batch_wave_paused",
            severity: "notice",
            subjectType: "workspace",
            subjectRef: workspaceId,
            details: { reason: "rate_ceiling" },
          }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
          rateCeilingHit++;
          break;
        }
        throw err;
      }
    }
  }

  const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
  await recordCronHeartbeat("hosted-executor").catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });

  for (const wid of workspaceIds) {
    const intentsForWorkspace = byWorkspace.get(wid) ?? [];
    await appendLedgerEvent({
      workspaceId: wid,
      eventType: "batch_wave_selected",
      severity: "info",
      subjectType: "executor",
      subjectRef: "hosted-executor",
      details: { intent_count: intentsForWorkspace.length },
    }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });

    await appendLedgerEvent({
      workspaceId: wid,
      eventType: "execution_cycle_completed",
      severity: "info",
      subjectType: "executor",
      subjectRef: "hosted-executor",
    }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });

    const stuckCount = intentsForWorkspace.length;
    const rateHit = rateCeilingHit > 0;
    await evaluateSelfHealing({
      workspaceId: wid,
      intentsCompleted: 0,
      escalationsThisCycle: 0,
      stuckIntentCount: stuckCount,
      rateCeilingHit: rateHit,
    }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
  }

  return NextResponse.json({
    ok: true,
    workspaces_checked: workspaceIds.length,
    rate_ceiling_hits: rateCeilingHit,
  });
}
