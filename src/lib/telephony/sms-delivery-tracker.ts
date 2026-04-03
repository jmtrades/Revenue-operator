/**
 * SMS Delivery Confirmation Tracker
 *
 * Tracks SMS delivery status end-to-end: queued → sent → delivered → failed.
 * Persists delivery events for analytics and compliance.
 *
 * Telnyx sends delivery status via webhook. This module:
 * 1. Records outbound SMS with initial "queued" status
 * 2. Updates status on webhook callbacks (sent, delivered, failed, undelivered)
 * 3. Provides delivery rate metrics per workspace
 * 4. Alerts on delivery failures for retry or escalation
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type SmsDeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed"
  | "expired";

export interface SmsDeliveryRecord {
  id?: string;
  workspace_id: string;
  lead_id?: string;
  message_id: string;       // Telnyx/Twilio message ID
  provider: "telnyx" | "twilio";
  from_number: string;
  to_number: string;
  body_preview: string;     // First 50 chars (for debugging without storing full PII)
  status: SmsDeliveryStatus;
  error_code?: string;
  error_message?: string;
  queued_at: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Record an outbound SMS for delivery tracking.
 * Call this immediately after sendSms() returns a messageId.
 */
export async function trackSmsSent(params: {
  workspaceId: string;
  leadId?: string;
  messageId: string;
  provider: "telnyx" | "twilio";
  fromNumber: string;
  toNumber: string;
  bodyPreview: string;
}): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    await db.from("sms_delivery_log").insert({
      workspace_id: params.workspaceId,
      lead_id: params.leadId || null,
      message_id: params.messageId,
      provider: params.provider,
      from_number: params.fromNumber,
      to_number: params.toNumber,
      body_preview: params.bodyPreview.slice(0, 50),
      status: "queued",
      queued_at: now,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    // Non-blocking — table may not exist yet
    log("warn", "sms.delivery_track_failed", {
      messageId: params.messageId,
      error: (err as Error).message,
    });
  }
}

/**
 * Update SMS delivery status from a webhook callback.
 * Called from Telnyx/Twilio webhook handlers.
 */
export async function updateSmsDeliveryStatus(
  messageId: string,
  newStatus: SmsDeliveryStatus,
  errorInfo?: { code?: string; message?: string }
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (newStatus === "sent" || newStatus === "sending") {
    update.sent_at = now;
  }
  if (newStatus === "delivered") {
    update.delivered_at = now;
  }
  if (newStatus === "failed" || newStatus === "undelivered") {
    update.failed_at = now;
    if (errorInfo?.code) update.error_code = errorInfo.code;
    if (errorInfo?.message) update.error_message = errorInfo.message.slice(0, 255);
  }

  try {
    await db
      .from("sms_delivery_log")
      .update(update)
      .eq("message_id", messageId);
  } catch (err) {
    log("warn", "sms.delivery_update_failed", {
      messageId,
      newStatus,
      error: (err as Error).message,
    });
  }
}

/**
 * Get delivery metrics for a workspace over a time period.
 */
export async function getSmsDeliveryMetrics(
  workspaceId: string,
  sinceDaysAgo = 7
): Promise<{
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}> {
  const db = getDb();
  const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [deliveredRes, failedRes, totalRes, pendingRes] = await Promise.all([
      db.from("sms_delivery_log").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("status", "delivered").gte("created_at", since),
      db.from("sms_delivery_log").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).in("status", ["failed", "undelivered"]).gte("created_at", since),
      db.from("sms_delivery_log").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).gte("created_at", since),
      db.from("sms_delivery_log").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).in("status", ["queued", "sending", "sent"]).gte("created_at", since),
    ]);

    const total = totalRes.count ?? 0;
    const delivered = deliveredRes.count ?? 0;
    const failed = failedRes.count ?? 0;
    const pending = pendingRes.count ?? 0;

    return {
      total,
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    };
  } catch {
    return { total: 0, delivered: 0, failed: 0, pending: 0, deliveryRate: 0 };
  }
}

/**
 * Get recent failed SMS for a workspace (for retry or escalation).
 */
export async function getRecentFailedSms(
  workspaceId: string,
  limit = 20
): Promise<Array<{ messageId: string; toNumber: string; errorCode?: string; failedAt: string }>> {
  const db = getDb();

  try {
    const { data } = await db
      .from("sms_delivery_log")
      .select("message_id, to_number, error_code, failed_at")
      .eq("workspace_id", workspaceId)
      .in("status", ["failed", "undelivered"])
      .order("failed_at", { ascending: false })
      .limit(limit);

    return ((data ?? []) as Array<{
      message_id: string;
      to_number: string;
      error_code?: string;
      failed_at: string;
    }>).map(row => ({
      messageId: row.message_id,
      toNumber: row.to_number,
      errorCode: row.error_code,
      failedAt: row.failed_at,
    }));
  } catch {
    return [];
  }
}
