/**
 * Cron: process one job from queue (DB or Redis).
 * Call via cron every minute: GET /api/cron/process-queue
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { dequeue } from "@/lib/queue";
import { processWebhookJob } from "@/lib/pipeline/process-webhook";
import { runDecisionJob } from "@/lib/pipeline/decision-job";
import { runReactivationJob } from "@/lib/reactivation/run-job";
import { checkWorkspaceAlerts, maybeAutoPause } from "@/lib/observability/alerts";
import { processWebhookDeliveries } from "@/lib/outbound-events";
import { processZoomWebhook, fetchRecordingAndTranscript, runAnalyzeCall } from "@/lib/zoom/pipeline";
import { executePostCallPlan } from "@/lib/zoom/post-call";
import { runCalendarCallEndedJob } from "@/lib/calls/calendar-call-ended-job";
import { runPostCallUnknownCheckin } from "@/lib/calls/post-call-unknown-checkin";

const CRON_SECRET = process.env.CRON_SECRET;

async function processPayload(payload: {
  type?: string;
  webhookId?: string;
  leadId?: string;
  workspaceId?: string;
  meetingId?: string;
  meetingUuid?: string;
  event?: string;
  callSessionId?: string;
  eventId?: string;
}) {
  let workspaceId: string | undefined;
  if (payload.type === "process_webhook" && payload.webhookId) {
    const result = await processWebhookJob(payload.webhookId);
    if (result?.decisionLeadId && result?.decisionWorkspaceId) {
      workspaceId = result.decisionWorkspaceId;
      await runDecisionJob(result.decisionLeadId, result.decisionWorkspaceId);
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
    const { data: lead } = await db.from("leads").select("workspace_id").eq("id", payload.leadId).single();
    if (lead) {
      workspaceId = (lead as { workspace_id: string }).workspace_id;
      await runDecisionJob(payload.leadId, workspaceId);
    }
  } else if (payload.type === "decision" && payload.leadId && payload.workspaceId) {
    workspaceId = payload.workspaceId;
    await runDecisionJob(payload.leadId, payload.workspaceId);
  } else if (payload.type === "reactivation" && payload.leadId) {
    await runReactivationJob(payload.leadId);
  }
  if (workspaceId) {
    const alerts = await checkWorkspaceAlerts(workspaceId);
    if (alerts.length > 0) {
      console.warn("[process-queue] workspace alerts", { workspaceId, alerts });
      await maybeAutoPause(workspaceId);
    }
  }
}

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await processWebhookDeliveries().catch(() => {});

  const job = await dequeue();
  if (job) {
    try {
      await processPayload(job.payload);
      const { complete } = await import("@/lib/queue");
      await complete(job.id);
    } catch (err) {
      const { fail } = await import("@/lib/queue");
      await fail(job.id, String(err));
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, processed: 1, job_type: job.payload.type });
  }

  return NextResponse.json({ ok: true, processed: 0 });
}
