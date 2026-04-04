/**
 * Cron: Progress Watchdog. Ensures queue never stalls permanently.
 * No UI; recovery only. Run every 5–10 min.
 *
 * Per workspace:
 * - Oldest unprocessed signal age > 10 min and no pending process_signal job → enqueue process_signal
 * - Action command with no attempts → enqueue action retry
 * - Escalation without notification → enqueue handoff_notify
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { runSafeCron } from "@/lib/cron/run-safe";
import type { ActionCommandType, ActionPayload } from "@/lib/action-queue/types";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const STALE_SIGNAL_MINUTES = 10;
const MAX_WORKSPACES = 50;
const MAX_ENQUEUES_PER_WORKSPACE = 20;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("progress-watchdog", async () => {
    const db = getDb();
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(MAX_WORKSPACES);
    const workspaceIds = (workspaces ?? []).map((r: { id: string }) => r.id);

    let enqueuedSignals = 0;
    let enqueuedActions = 0;
    let enqueuedHandoffs = 0;

    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - STALE_SIGNAL_MINUTES);
    const cutoffIso = cutoff.toISOString();

    for (const workspaceId of workspaceIds) {
      let workspaceEnqueues = 0;

      // Oldest unprocessed signal (no failure_reason) older than 10 min → enqueue process_signal if no pending job
      const { data: oldestSignal } = await db
        .from("canonical_signals")
        .select("id, occurred_at")
        .eq("workspace_id", workspaceId)
        .is("processed_at", null)
        .is("failure_reason", null)
        .lt("occurred_at", cutoffIso)
        .order("occurred_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (oldestSignal && workspaceEnqueues < MAX_ENQUEUES_PER_WORKSPACE) {
        const signalId = (oldestSignal as { id: string }).id;
        const { data: pendingRows } = await db
          .from("job_queue")
          .select("id, payload")
          .eq("job_type", "process_signal")
          .eq("status", "pending")
          .limit(200);
        const hasPendingForSignal = (pendingRows ?? []).some(
          (r: { payload?: { signalId?: string } }) => (r.payload as { signalId?: string })?.signalId === signalId
        );
        if (!hasPendingForSignal) {
          await enqueue({ type: "process_signal", signalId });
          enqueuedSignals++;
          workspaceEnqueues++;
        }
      }

      // Action commands with no attempts (unprocessed, no action_attempts row)
      const { data: commands } = await db
        .from("action_commands")
        .select("id, workspace_id, lead_id, type, payload, dedup_key")
        .eq("workspace_id", workspaceId)
        .is("processed_at", null)
        .limit(MAX_ENQUEUES_PER_WORKSPACE - workspaceEnqueues);
      const commandList = (commands ?? []) as Array<{
        id: string;
        workspace_id: string;
        lead_id: string;
        type: string;
        payload: unknown;
        dedup_key: string;
      }>;
      // Batch-fetch existing attempts to avoid N+1 per command
      const commandIds = commandList.map((c) => c.id);
      const { data: existingAttempts } = commandIds.length
        ? await db.from("action_attempts").select("action_command_id").in("action_command_id", commandIds)
        : { data: [] };
      const attemptedCommandIds = new Set(
        ((existingAttempts ?? []) as { action_command_id: string }[]).map((a) => a.action_command_id)
      );
      for (const cmd of commandList) {
        if (workspaceEnqueues >= MAX_ENQUEUES_PER_WORKSPACE) break;
        if (!attemptedCommandIds.has(cmd.id)) {
          await enqueue({
            type: "action",
            action: {
              workspace_id: cmd.workspace_id,
              lead_id: cmd.lead_id,
              type: cmd.type as ActionCommandType,
              payload: (cmd.payload ?? {}) as ActionPayload,
              dedup_key: cmd.dedup_key,
            },
            action_command_id: cmd.id,
          });
          enqueuedActions++;
          workspaceEnqueues++;
        }
      }

      // Escalations without notification
      const { data: escalations } = await db
        .from("escalation_logs")
        .select("id, workspace_id, lead_id, escalation_reason")
        .eq("workspace_id", workspaceId)
        .is("notified_at", null)
        .limit(MAX_ENQUEUES_PER_WORKSPACE - workspaceEnqueues);
      for (const e of escalations ?? []) {
        if (workspaceEnqueues >= MAX_ENQUEUES_PER_WORKSPACE) break;
        const row = e as { id: string; workspace_id: string; lead_id: string; escalation_reason?: string };
        await enqueue({
          type: "handoff_notify",
          escalationId: row.id,
          workspaceId: row.workspace_id,
          leadId: row.lead_id,
          decisionNeeded: row.escalation_reason ?? "Decision needed",
        });
        enqueuedHandoffs++;
        workspaceEnqueues++;
      }
    }

    return {
      run: workspaceIds.length,
      enqueuedSignals,
      enqueuedActions,
      enqueuedHandoffs,
    };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
