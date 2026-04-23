/**
 * Phase 13b — Inbound email webhook (provider-agnostic).
 *
 * Accepts:
 *   - Resend inbound   (type: "email.received")
 *   - Postmark inbound (PascalCase)
 *   - SendGrid Parse   (JSON form) — post-configure the Inbound Parse URL to
 *                      POST JSON to this endpoint
 *   - Any normalized payload matching GenericInboundPayload
 *
 * Flow:
 *   1. Auth — Bearer INBOUND_EMAIL_WEBHOOK_SECRET (or the existing
 *      INBOUND_WEBHOOK_SECRET if email-specific not set).
 *   2. Normalize via normalizeInboundEmail().
 *   3. Resolve workspace by matching toEmail → workspace_email_config.from_email
 *      (case-insensitive).
 *   4. Persist to raw_webhook_events so downstream workers pick it up.
 *   5. Enqueue process_email_reply so the reactive event processor fires with
 *      a fully-assembled LeadContext.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { log } from "@/lib/logger";
import {
  normalizeInboundEmail,
  toEmailReplyEventData,
} from "@/lib/integrations/inbound-email";

const SECRET =
  process.env.INBOUND_EMAIL_WEBHOOK_SECRET ??
  process.env.INBOUND_WEBHOOK_SECRET ??
  null;

export async function POST(req: NextRequest) {
  // Bearer auth only for the cross-provider endpoint. Provider-specific
  // signature verification can be added per-provider later; this is the single
  // port where your ESP is configured to POST JSON.
  if (!SECRET && process.env.NODE_ENV === "production") {
    log("error", "inbound_email.secret_not_configured", {
      message: "rejecting — INBOUND_EMAIL_WEBHOOK_SECRET must be set in production",
    });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = normalizeInboundEmail(payload);
  if (!normalized) {
    return NextResponse.json({ received: true, normalized: false });
  }

  const db = getDb();

  // Resolve workspace by matching the recipient (the `to` address the sender
  // used) to a configured workspace from_email. Exact-match first, then
  // domain-match as fallback.
  let workspaceId: string | null = null;
  try {
    const { data } = await db
      .from("workspace_email_config")
      .select("workspace_id, from_email")
      .ilike("from_email", normalized.toEmail)
      .maybeSingle();
    if (data) {
      workspaceId = (data as { workspace_id: string }).workspace_id;
    }
    if (!workspaceId) {
      const domain = normalized.toEmail.split("@")[1];
      if (domain) {
        const { data: byDomain } = await db
          .from("workspace_email_config")
          .select("workspace_id, from_email")
          .ilike("from_email", `%@${domain}`)
          .limit(1)
          .maybeSingle();
        if (byDomain) workspaceId = (byDomain as { workspace_id: string }).workspace_id;
      }
    }
  } catch {
    // fall through to unscoped accept
  }

  // Always acknowledge — providers aggressively retry on non-2xx.
  if (!workspaceId) {
    return NextResponse.json({ received: true, scoped: false });
  }

  // Resolve the lead by from-address in this workspace.
  let leadId: string | null = null;
  try {
    const { data: lead } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", normalized.fromEmail)
      .maybeSingle();
    if (lead) leadId = (lead as { id: string }).id;
  } catch {
    // no-op
  }

  const dedupeKey = `inbound_email:${workspaceId}:${normalized.messageId ?? `${normalized.fromEmail}:${normalized.receivedAt}`}`;

  try {
    await db.from("raw_webhook_events").insert({
      provider: `inbound_email_${normalized.provider}`,
      dedupe_key: dedupeKey,
      payload: {
        workspace_id: workspaceId,
        lead_id: leadId,
        event_type: "email_reply",
        event_data: toEmailReplyEventData(normalized),
        received_at: normalized.receivedAt,
      },
    });
  } catch {
    // If raw_webhook_events doesn't exist or dedup collides, still ack.
  }

  if (leadId) {
    try {
      await enqueue({
        type: "process_email_reply",
        workspaceId,
        leadId,
        receivedAt: normalized.receivedAt,
        text: normalized.text,
        subject: normalized.subject,
        fromEmail: normalized.fromEmail,
        messageId: normalized.messageId,
      });
    } catch {
      // additive
    }
  }

  return NextResponse.json({
    received: true,
    scoped: true,
    lead_matched: Boolean(leadId),
    provider: normalized.provider,
  });
}
