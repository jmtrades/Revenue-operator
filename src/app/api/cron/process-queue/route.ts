/**
 * Cron: process one job from queue (DB or Redis).
 * Call via cron every minute: GET /api/cron/process-queue
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { dequeue } from "@/lib/queue";
import { isDoctrineEnforced } from "@/lib/doctrine/enforce";
import { convertLegacyWebhookToSignalAndEnqueue } from "@/lib/doctrine/legacy-to-signal";
import { runDecisionJobWithEngines } from "@/lib/pipeline/decision-with-engines";
import { runReactivationJob } from "@/lib/reactivation/run-job";
import { checkWorkspaceAlerts, maybeAutoPause } from "@/lib/observability/alerts";
import { processWebhookDeliveries } from "@/lib/outbound-events";
import { processZoomWebhook, fetchRecordingAndTranscript, runAnalyzeCall } from "@/lib/zoom/pipeline";
import { executePostCallPlan } from "@/lib/zoom/post-call";
import { runCalendarCallEndedJob } from "@/lib/calls/calendar-call-ended-job";
import { runPostCallUnknownCheckin } from "@/lib/calls/post-call-unknown-checkin";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

async function processPayload(payload: {
  type?: string;
  webhookId?: string;
  signalId?: string;
  leadId?: string;
  workspaceId?: string;
  meetingId?: string;
  meetingUuid?: string;
  event?: string;
  callSessionId?: string;
  eventId?: string;
  action?: { workspace_id: string; lead_id: string };
  action_command_id?: string;
  escalationId?: string;
  decisionNeeded?: string;
  escalationIds?: string[];
}) {
  let workspaceId: string | undefined;
  if (payload.type === "process_signal" && payload.signalId) {
    const { processCanonicalSignal } = await import("@/lib/signals/consumer");
    await processCanonicalSignal(payload.signalId);
    const db = (await import("@/lib/db/queries")).getDb();
    const { data: sig } = await db.from("canonical_signals").select("workspace_id").eq("id", payload.signalId).maybeSingle();
    if (sig) workspaceId = (sig as { workspace_id: string }).workspace_id;
  } else if (payload.type === "action" && payload.action) {
    const { runActionJob } = await import("@/lib/action-queue/worker");
    await runActionJob(payload.action as import("@/lib/action-queue/types").ActionCommand, payload.action_command_id);
    workspaceId = payload.action.workspace_id;
  } else if (payload.type === "process_webhook" && payload.webhookId) {
    if (isDoctrineEnforced()) {
      await convertLegacyWebhookToSignalAndEnqueue(payload.webhookId);
    } else {
      const { processWebhookJob } = await import("@/lib/pipeline/process-webhook");
      const result = await processWebhookJob(payload.webhookId);
      if (result?.decisionLeadId && result?.decisionWorkspaceId) {
        workspaceId = result.decisionWorkspaceId;
        await runDecisionJobWithEngines(result.decisionLeadId, result.decisionWorkspaceId);
      }
    }
  } else if (payload.type === "zoom_webhook" && payload.webhookId && payload.workspaceId && payload.meetingId && payload.meetingUuid) {
    workspaceId = payload.workspaceId;
    await processZoomWebhook(payload.webhookId, payload.workspaceId, payload.meetingId, payload.meetingUuid);
  } else if (payload.type === "fetch_zoom_recording" && payload.callSessionId && payload.workspaceId && payload.meetingId) {
    await fetchRecordingAndTranscript(payload.callSessionId, payload.workspaceId, payload.meetingId);
  } else if (payload.type === "analyze_call" && payload.callSessionId && payload.workspaceId) {
    await runAnalyzeCall(payload.callSessionId, payload.workspaceId);
  } else if (payload.type === "execute_post_call_plan" && payload.callSessionId && payload.workspaceId && payload.leadId) {
    await executePostCallPlan(payload.callSessionId, payload.workspaceId, payload.leadId);
  } else if (payload.type === "calendar_call_ended" && payload.callSessionId) {
    await runCalendarCallEndedJob(payload.callSessionId);
  } else if (payload.type === "post_call_unknown_checkin" && payload.leadId && payload.workspaceId && payload.callSessionId) {
    await runPostCallUnknownCheckin(payload.leadId, payload.workspaceId, payload.callSessionId);
  } else if (payload.type === "no_show_reminder" && payload.leadId) {
    const db = (await import("@/lib/db/queries")).getDb();
    const { data: lead } = await db.from("leads").select("workspace_id").eq("id", payload.leadId).maybeSingle();
    if (lead) {
      workspaceId = (lead as { workspace_id: string }).workspace_id;
      await runDecisionJobWithEngines(payload.leadId, workspaceId);
    }
  } else if (payload.type === "decision" && payload.leadId && payload.workspaceId) {
    workspaceId = payload.workspaceId;
    await runDecisionJobWithEngines(payload.leadId, payload.workspaceId);
  } else if (payload.type === "reactivation" && payload.leadId) {
    await runReactivationJob(payload.leadId);
  } else if (payload.type === "closure_reconciliation" && payload.workspaceId) {
    const { runReconciliationForWorkspaceSafe } = await import("@/lib/reconciliation/run");
    await runReconciliationForWorkspaceSafe(payload.workspaceId);
    workspaceId = payload.workspaceId;
  } else if (payload.type === "handoff_notify" && payload.escalationId && payload.workspaceId && payload.leadId) {
    const { notifyHandoff } = await import("@/lib/operational-transfer/notify");
    await notifyHandoff(payload.workspaceId, payload.leadId, payload.escalationId, {
      decisionNeeded: payload.decisionNeeded ?? "Decision needed",
    });
    const { verifyEscalationDeliverable } = await import("@/lib/integrity/verify-escalation-delivery");
    await verifyEscalationDeliverable(payload.escalationId);
    workspaceId = payload.workspaceId;
  } else if (payload.type === "handoff_notify_batch" && payload.escalationIds?.length && payload.workspaceId) {
    const { runHandoffBatchSend } = await import("@/lib/operational-transfer/handoff-notifications");
    await runHandoffBatchSend(payload.workspaceId, payload.escalationIds);
    workspaceId = payload.workspaceId;
  }
  if (workspaceId) {
    const alerts = await checkWorkspaceAlerts(workspaceId);
    if (alerts.length > 0) {
      await maybeAutoPause(workspaceId);
    }
  }
}

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  await processWebhookDeliveries().catch((e: unknown) => {
      console.warn("[cron/process-queue] webhook deliveries failed:", e instanceof Error ? e.message : String(e));
    });

  const { enqueueDecision, enqueue } = await import("@/lib/queue");
  const { getDueActionRetries, claimActionRetry } = await import("@/lib/action-queue/persist");
  const { getActionCommandsDueForSend, markStaleSendingAttemptsAsFailed } = await import("@/lib/delivery-assurance/action-attempts");

  await markStaleSendingAttemptsAsFailed();

  for (const row of await getDueActionRetries(20)) {
    const action = {
      workspace_id: row.workspace_id,
      lead_id: row.lead_id,
      type: row.type,
      payload: row.payload,
      dedup_key: row.dedup_key,
    } as import("@/lib/action-queue/types").ActionCommand;
    await enqueue({ type: "action", action, action_command_id: row.id });
    await claimActionRetry(row.id);
  }

  for (const row of await getActionCommandsDueForSend(20)) {
    const action = {
      workspace_id: row.workspace_id,
      lead_id: row.lead_id,
      type: row.type,
      payload: row.payload,
      dedup_key: row.dedup_key,
    } as import("@/lib/action-queue/types").ActionCommand;
    await enqueue({ type: "action", action, action_command_id: row.id });
  }

  const db = (await import("@/lib/db/queries")).getDb();
  const { data: duePlans } = await db
    .from("lead_plans")
    .select("workspace_id, lead_id")
    .eq("status", "active")
    .lte("next_action_at", new Date().toISOString());
  for (const p of duePlans ?? []) {
    const plan = p as { workspace_id: string; lead_id: string };
    await enqueueDecision(plan.lead_id, plan.workspace_id);
  }

  const job = await dequeue();
  if (job) {
    try {
      const { runWithWriteContextAsync, getJobWriteContext } = await import("@/lib/safety/unsafe-write-guard");
      await runWithWriteContextAsync(getJobWriteContext(job.payload), async () => {
        await processPayload(job.payload);
      });
      const { complete } = await import("@/lib/queue");
      await complete(job.id);
    } catch (err) {
      const { fail, enqueue } = await import("@/lib/queue");
      const errMsg = String(err);
      const { IntegrityInvariantError, ProgressStalledError } = await import("@/lib/integrity/errors");
      if (err instanceof IntegrityInvariantError || err instanceof ProgressStalledError) {
        const { logEscalation } = await import("@/lib/escalation");
        let workspaceId: string | null = null;
        let leadId: string | null = null;
        if (job.payload.type === "process_signal" && job.payload.signalId) {
          const { getSignalById } = await import("@/lib/signals/store");
          const signal = await getSignalById(job.payload.signalId);
          if (signal) {
            workspaceId = signal.workspace_id;
            leadId = signal.lead_id;
          }
        } else if (job.payload.type === "decision" && job.payload.workspaceId && job.payload.leadId) {
          workspaceId = job.payload.workspaceId;
          leadId = job.payload.leadId;
        }
        if (workspaceId && leadId) {
          await logEscalation(
            workspaceId,
            leadId,
            "system_integrity_violation",
            err.name,
            errMsg
          );
        }
      }
      if (job.payload.type === "process_signal" && job.payload.signalId) {
        const {
          incrementSignalProcessingAttempts,
          markSignalIrrecoverable,
          MAX_SIGNAL_RETRIES,
          getSignalById,
        } = await import("@/lib/signals/store");
        const { logEscalation } = await import("@/lib/escalation");
        const attempts = await incrementSignalProcessingAttempts(job.payload.signalId);
        if (attempts > MAX_SIGNAL_RETRIES) {
          const signal = await getSignalById(job.payload.signalId);
          const didMark = await markSignalIrrecoverable(job.payload.signalId, "signal_unprocessable");
          if (didMark) {
            const { log } = await import("@/lib/logger");
            log("info", "SIGNAL_IRRECOVERABLE", {
              signal_id: job.payload.signalId,
              lead_id: signal?.lead_id ?? null,
              workspace_id: signal?.workspace_id ?? null,
              attempts,
              reason: "signal_unprocessable",
            });
            if (signal?.workspace_id && signal?.lead_id) {
              await logEscalation(
                signal.workspace_id,
                signal.lead_id,
                "signal_unprocessable",
                "Signal unprocessable after retries",
                errMsg
              );
            }
            if (signal?.workspace_id) {
              await enqueue({ type: "closure_reconciliation", workspaceId: signal.workspace_id });
            }
          }
        }
      }
      await fail(job.id, errMsg);
      return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
    }
    const body: { ok: boolean; processed: number; job_type: string; worker_id?: string; job_id?: string; claim_ttl_seconds?: number; claimed_via_rpc?: boolean } = {
      ok: true,
      processed: 1,
      job_type: job.payload.type,
    };
    if (job.claim) {
      body.worker_id = job.claim.worker_id;
      body.job_id = job.claim.job_id;
      body.claim_ttl_seconds = job.claim.claim_ttl_seconds;
      body.claimed_via_rpc = true;
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("process-queue").catch((e: unknown) => {
      console.warn("[cron/process-queue] heartbeat failed:", e instanceof Error ? e.message : String(e));
    });
    return NextResponse.json(body);
  }

  const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
  await recordCronHeartbeat("process-queue").catch(() => {
      // cron/process-queue error (details omitted to protect PII) 
    });
  return NextResponse.json({ ok: true, processed: 0 });
}
