/**
 * Observability alerts: opt_out_rate, delivery_failure_rate, fallback_rate, dlq_size.
 * Log warning and optionally auto-pause on abnormal metrics.
 */

import { getDb } from "@/lib/db/queries";

const OPT_OUT_RATE_THRESHOLD = 0.05;
const DELIVERY_FAILURE_RATE_THRESHOLD = 0.1;
const FALLBACK_RATE_THRESHOLD = 0.3;
const DLQ_SIZE_THRESHOLD = 100;

export async function checkWorkspaceAlerts(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const alerts: string[] = [];

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: metricsRows } = await db
    .from("metrics")
    .select("metric_key, metric_value")
    .eq("workspace_id", workspaceId)
    .gte("period_start", todayStart.toISOString());

  const sums = (metricsRows ?? []).reduce(
    (acc: Record<string, number>, r: { metric_key: string; metric_value: number }) => {
      acc[r.metric_key] = (acc[r.metric_key] ?? 0) + Number(r.metric_value);
      return acc;
    },
    {}
  );

  const repliesSent = sums.replies_sent ?? 0;
  const fallbackUsed = sums.fallback_used ?? 0;
  const deliveryFailed = sums.delivery_failed ?? 0;
  const optOut = sums.opt_out ?? 0;

  const total = repliesSent + fallbackUsed + deliveryFailed;
  const delivered = repliesSent + fallbackUsed;
  const optOutRate = total > 0 ? optOut / total : 0;
  const deliveryFailRate = delivered > 0 ? deliveryFailed / delivered : 0;
  const fallbackRate = total > 0 ? fallbackUsed / total : 0;

  if (optOutRate > OPT_OUT_RATE_THRESHOLD) {
    alerts.push(`opt_out_rate ${(optOutRate * 100).toFixed(2)}% exceeds ${OPT_OUT_RATE_THRESHOLD * 100}%`);
  }
  if (deliveryFailRate > DELIVERY_FAILURE_RATE_THRESHOLD) {
    alerts.push(`delivery_failure_rate ${(deliveryFailRate * 100).toFixed(2)}% exceeds ${DELIVERY_FAILURE_RATE_THRESHOLD * 100}%`);
  }
  if (fallbackRate > FALLBACK_RATE_THRESHOLD) {
    alerts.push(`fallback_rate ${(fallbackRate * 100).toFixed(2)}% exceeds ${FALLBACK_RATE_THRESHOLD * 100}%`);
  }

  const { count: dlqCount } = await db
    .from("job_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");
  if ((dlqCount ?? 0) > DLQ_SIZE_THRESHOLD) {
    alerts.push(`dlq_size ${dlqCount} exceeds ${DLQ_SIZE_THRESHOLD}`);
  }

  return alerts;
}

export async function maybeAutoPause(workspaceId: string): Promise<boolean> {
  const alerts = await checkWorkspaceAlerts(workspaceId);
  if (alerts.length === 0) return false;
  const db = getDb();
  await db
    .from("workspaces")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
      pause_reason: alerts.join("; "),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);
  return true;
}
