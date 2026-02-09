/**
 * Cron: process one job from queue (DB or Redis).
 * Call via cron every minute: GET /api/cron/process-queue
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { dequeue } from "@/lib/queue";
import { processWebhookJob } from "@/lib/pipeline/process-webhook";
import { runDecisionJob } from "@/lib/pipeline/decision-job";
import { checkWorkspaceAlerts, maybeAutoPause } from "@/lib/observability/alerts";

const CRON_SECRET = process.env.CRON_SECRET;

async function processPayload(payload: { type?: string; webhookId?: string; leadId?: string; workspaceId?: string }) {
  let workspaceId: string | undefined;
  if (payload.type === "process_webhook" && payload.webhookId) {
    const result = await processWebhookJob(payload.webhookId);
    if (result?.decisionLeadId && result?.decisionWorkspaceId) {
      workspaceId = result.decisionWorkspaceId;
      await runDecisionJob(result.decisionLeadId, result.decisionWorkspaceId);
    }
  } else if (payload.type === "decision" && payload.leadId && payload.workspaceId) {
    workspaceId = payload.workspaceId;
    await runDecisionJob(payload.leadId, payload.workspaceId);
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
