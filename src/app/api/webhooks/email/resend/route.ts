/**
 * Phase 13a + 13b — Resend email webhook.
 *
 * Resend posts one event at a time to this endpoint. We:
 *   1. Verify signature if RESEND_WEBHOOK_SECRET is configured (svix-compatible).
 *   2. Normalize the event via normalizeResendWebhook().
 *   3. Log a row in email_delivery_events (deduped on provider_event_id).
 *   4. On hard_bounce / complaint / unsubscribe → add to suppression list.
 *   5. On bounced events, if the recipient matches a lead, fire a
 *      LeadEvent(type:'email_bounced') through reactive-event-processor so
 *      downstream sequencing reacts correctly.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import {
  applyResendEvent,
  createSupabaseSuppressionWriter,
  normalizeResendWebhook,
  type ResendWebhookPayload,
} from "@/lib/integrations/email-suppression";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

function verifySvix(raw: string, headers: Headers, secret: string): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Resend secrets are prefixed with "whsec_" and base64-encoded.
  const secretBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");

  const signedPayload = `${svixId}.${svixTimestamp}.${raw}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedPayload)
    .digest("base64");

  // svix-signature header is a space-separated list of "v1,<signature>" values.
  const sigs = svixSignature.split(" ").map((s) => s.trim()).filter(Boolean);
  for (const s of sigs) {
    const parts = s.split(",");
    if (parts.length !== 2) continue;
    const version = parts[0];
    const provided = parts[1];
    if (version !== "v1") continue;
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);
    if (
      providedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return true;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  if (WEBHOOK_SECRET) {
    if (!verifySvix(raw, req.headers, WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    log("error", "resend_webhook.secret_not_configured", {
      message: "rejecting request — RESEND_WEBHOOK_SECRET must be set in production",
    });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 403 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(raw) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resolve workspace. Resend tags are the canonical mechanism — the sendEmail
  // caller should tag with { name: "workspace_id", value: <uuid> }. We fall
  // back to looking up the queue row by external_id (email_id) if present.
  const tags = payload.data?.tags ?? [];
  let workspaceId =
    tags.find((t) => t.name === "workspace_id" || t.name === "workspaceId")?.value ?? null;
  let queueId: string | null = null;

  const db = getDb();
  const emailId = payload.data?.email_id ?? null;
  if (emailId) {
    try {
      const { data } = await db
        .from("email_send_queue")
        .select("id, workspace_id")
        .eq("external_id", emailId)
        .maybeSingle();
      if (data) {
        const r = data as { id: string; workspace_id: string };
        queueId = r.id;
        workspaceId = workspaceId ?? r.workspace_id;
      }
    } catch {
      // queue row may not exist (e.g. test event) — fall through
    }
  }

  if (!workspaceId) {
    // Accept but no-op — can't scope to a workspace.
    return NextResponse.json({ received: true, scoped: false });
  }

  const normalized = normalizeResendWebhook(payload);
  if (!normalized) {
    return NextResponse.json({ received: true, unmapped_type: payload.type ?? null });
  }

  const writer = createSupabaseSuppressionWriter(db);
  const result = await applyResendEvent(workspaceId, normalized, writer, { queueId });

  // If this is a bounce and we can link it to a lead, fire an email_bounced
  // event into the reactive event processor so sequencing halts. This is
  // additive — failure here never breaks webhook acknowledgement.
  if (normalized.eventType === "bounced" && normalized.toEmail) {
    try {
      const { data: lead } = await db
        .from("leads")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", normalized.toEmail)
        .maybeSingle();
      if (lead) {
        // We log as a raw_webhook_event so any downstream job picks it up —
        // directly invoking processEvent requires a LeadContext fetch that
        // belongs in a background worker, not a webhook handler.
        await db.from("raw_webhook_events").insert({
          provider: "resend",
          dedupe_key: `resend:bounced:${normalized.providerEventId ?? normalized.occurredAt}:${normalized.toEmail}`,
          payload: {
            lead_id: (lead as { id: string }).id,
            workspace_id: workspaceId,
            event_type: "email_bounced",
            email: normalized.toEmail,
            bounce_type: normalized.bounceType,
            occurred_at: normalized.occurredAt,
          },
        });
      }
    } catch {
      // additive — never fail the webhook
    }
  }

  return NextResponse.json({
    received: true,
    event_inserted: result.eventInserted,
    suppressed: result.suppressed,
    suppression_reason: result.suppressionReason,
  });
}
