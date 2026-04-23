/**
 * Burst drain: process up to N jobs within a time budget.
 * Used after webhook ingest for fast response without waiting on cron.
 */

import { getDb } from "@/lib/db/queries";
import { isDoctrineEnforced } from "@/lib/doctrine/enforce";
import { convertLegacyWebhookToSignalAndEnqueue } from "@/lib/doctrine/legacy-to-signal";
import { processWebhookJob } from "@/lib/pipeline/process-webhook";
import { runDecisionJobWithEngines } from "@/lib/pipeline/decision-with-engines";
import { runReactivationJob } from "@/lib/reactivation/run-job";
import { checkWorkspaceAlerts, maybeAutoPause } from "@/lib/observability/alerts";
import { processZoomWebhook, fetchRecordingAndTranscript, runAnalyzeCall } from "@/lib/zoom/pipeline";
import { executePostCallPlan } from "@/lib/zoom/post-call";
import { runCalendarCallEndedJob } from "@/lib/calls/calendar-call-ended-job";
import { runPostCallUnknownCheckin } from "@/lib/calls/post-call-unknown-checkin";
import { fetchSingleRow, type DbSingleQuery } from "@/lib/db/single-row";
import { decideRetryOrDlq, nextAttemptNumber } from "./retry-policy";

const BURST_MAX_JOBS = 10;
const BURST_BUDGET_MS = 7000;

type JobPayload =
  | { type: "process_webhook"; webhookId: string }
  | { type: "decision"; leadId: string; workspaceId: string; eventId: string }
  | { type: "no_reply"; leadId: string }
  | { type: "reactivation"; leadId: string }
  | { type: "billing"; workspaceId: string }
  | { type: "zoom_webhook"; webhookId: string; workspaceId: string; meetingId: string; meetingUuid: string; event: string }
  | { type: "fetch_zoom_recording"; callSessionId: string; workspaceId: string; meetingId: string }
  | { type: "analyze_call"; callSessionId: string; workspaceId: string }
  | { type: "execute_post_call_plan"; callSessionId: string; workspaceId: string; leadId: string }
  | { type: "calendar_call_ended"; callSessionId: string }
  | { type: "post_call_unknown_checkin"; leadId: string; workspaceId: string; callSessionId: string }
  | { type: "no_show_reminder"; leadId: string };

async function acquireLock(
  db: ReturnType<typeof getDb>,
  _workerId: string
): Promise<{ id: string; payload: unknown; job_type: string; attempts: number } | null> {
  let row: unknown = null;
  try {
    const q = db
      .from("job_queue")
      .select("id, payload, job_type, attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1) as unknown as DbSingleQuery;
    row = await fetchSingleRow(q);
  } catch {
    row = null;
  }

  if (!row) return null;
  const r = row as { id: string; payload: unknown; job_type: string; attempts?: number | null };
  // Monotonic increment — previously hardcoded to 1, which silently disabled
  // the retry cap (MAX_QUEUE_ATTEMPTS in retry-policy.ts).
  const nextAttempts = nextAttemptNumber(r.attempts);

  const updatePayload = { status: "processing" as const, attempts: nextAttempts };
  try {
    const q = db
      .from("job_queue")
      .update(updatePayload)
      .eq("id", r.id)
      .eq("status", "pending")
      .select("id") as unknown as DbSingleQuery;
    const updated = await fetchSingleRow(q);
    if (!updated) return null;
  } catch {
    return null;
  }
  return { id: r.id, payload: r.payload, job_type: r.job_type, attempts: nextAttempts };
}

async function processPayload(payload: JobPayload): Promise<void> {
  if (payload.type === "process_webhook" && payload.webhookId) {
    if (isDoctrineEnforced()) {
      await convertLegacyWebhookToSignalAndEnqueue(payload.webhookId);
    } else {
      const result = await processWebhookJob(payload.webhookId);
      if (result?.decisionLeadId && result?.decisionWorkspaceId) {
        await runDecisionJobWithEngines(result.decisionLeadId, result.decisionWorkspaceId);
      }
    }
  } else if (payload.type === "zoom_webhook" && payload.webhookId && payload.workspaceId && payload.meetingId && payload.meetingUuid) {
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
    const db = getDb();
    let lead: unknown = null;
    try {
      const q = db.from("leads").select("workspace_id").eq("id", payload.leadId) as unknown as DbSingleQuery;
      lead = await fetchSingleRow(q);
    } catch {
      lead = null;
    }
    if (lead) await runDecisionJobWithEngines(payload.leadId, (lead as { workspace_id: string }).workspace_id);
  } else if (payload.type === "decision" && payload.leadId && payload.workspaceId) {
    await runDecisionJobWithEngines(payload.leadId, payload.workspaceId);
    const alerts = await checkWorkspaceAlerts(payload.workspaceId);
    if (alerts.length > 0) {
      await maybeAutoPause(payload.workspaceId);
    }
  } else if (payload.type === "reactivation" && payload.leadId) {
    await runReactivationJob(payload.leadId);
  }
}

export async function burstDrain(workerId?: string): Promise<{ processed: number; errors: number }> {
  const db = getDb();
  const wId = workerId ?? `burst-${crypto.randomUUID().slice(0, 8)}`;
  const deadline = Date.now() + BURST_BUDGET_MS;
  let processed = 0;
  let errors = 0;

  while (Date.now() < deadline && processed < BURST_MAX_JOBS) {
    const job = await acquireLock(db, wId);
    if (!job) break;

    const p = (job.payload ?? {}) as Record<string, unknown>;
    const payload: JobPayload = (p.type ? p : { ...p, type: job.job_type }) as JobPayload;

    const completionId = crypto.randomUUID();
    try {
      await processPayload(payload);
      await db
        .from("job_queue")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          completion_id: completionId,
        })
        .eq("id", job.id);
      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Route exhausted jobs to DLQ; others stay in `failed` where the
      // existing tooling can re-enqueue them for a manual retry.
      const finalStatus = decideRetryOrDlq(job.attempts) === "dlq" ? "dlq" : "failed";
      await db
        .from("job_queue")
        .update({ status: finalStatus, error: errMsg })
        .eq("id", job.id);
      errors++;
    }
  }

  return { processed, errors };
}
