/**
 * Observability: reply rate, booking rate, fallback rate, failure rate, opt-out rate.
 */

import { getDb } from "@/lib/db/queries";

export async function recordMetric(
  workspaceId: string,
  key: string,
  value: number,
  periodStart: Date,
  periodEnd: Date,
  meta?: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  await db.from("metrics").insert({
    workspace_id: workspaceId,
    metric_key: key,
    metric_value: value,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    meta: meta ?? {},
  });
}

export async function incrementMetric(
  workspaceId: string,
  key: string,
  delta: number = 1
): Promise<void> {
  try {
    const db = getDb();
    const now = new Date();
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    await db.from("metrics").insert({
      workspace_id: workspaceId,
      metric_key: key,
      metric_value: delta,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
    });
  } catch {
    // Non-fatal
  }
}

export const METRIC_KEYS = {
  REPLIES_SENT: "replies_sent",
  FALLBACK_USED: "fallback_used",
  DELIVERY_FAILED: "delivery_failed",
  OPT_OUT: "opt_out",
  BOOKINGS: "bookings",
} as const;
