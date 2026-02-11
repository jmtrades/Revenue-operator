/**
 * Webhook: Inbound message ingestion
 * Security: signature verification, replay protection, rate limiting, workspace isolation
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { burstDrain } from "@/lib/queue/burst-drain";
import { withContext } from "@/lib/logger";
import { verifyWebhookSignature, isTimestampFresh } from "@/lib/security/webhook-signature";
import { claimReplayNonce } from "@/lib/security/replay";
import { checkInboundRateLimit, incrementInboundRateLimit } from "@/lib/security/rate-limit";
import { createHash } from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function makeDedupeKey(body: Record<string, unknown>): string {
  const raw = JSON.stringify({
    workspace_id: body.workspace_id,
    channel: body.channel,
    external_lead_id: body.external_lead_id,
    thread_id: body.thread_id,
    message: body.message,
    external_message_id: body.external_message_id,
  });
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = withContext(requestId);

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    log.warn("webhook invalid body");
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let signature: string | null = null;
  let timestampMs: number | null = null;
  if (WEBHOOK_SECRET) {
    const sig = request.headers.get("x-webhook-signature");
    const tsHeader = request.headers.get("x-webhook-timestamp");
    const secretHeader = request.headers.get("x-webhook-secret");
    if (sig) {
      signature = sig;
      timestampMs = Number(tsHeader) || Date.now();
      if (!verifyWebhookSignature(rawBody, sig, WEBHOOK_SECRET)) {
        log.warn("webhook signature invalid");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (tsHeader && !isTimestampFresh(Number(tsHeader))) {
        log.warn("webhook timestamp stale");
        return NextResponse.json({ error: "Request expired" }, { status: 401 });
      }
    } else if (secretHeader !== WEBHOOK_SECRET) {
      log.warn("webhook secret invalid");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, channel, external_lead_id, message } = body as Record<string, string>;
  if (!workspace_id || !channel || !external_lead_id || !message) {
    return NextResponse.json(
      { error: "Missing workspace_id, channel, external_lead_id, or message" },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const allowed = await checkInboundRateLimit(workspace_id, ip);
  if (!allowed) {
    log.warn("webhook rate limited", { workspace_id });
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const dedupeKey = makeDedupeKey(body);
  const db = getDb();

  if (signature !== null && timestampMs !== null) {
    const claimed = await claimReplayNonce(workspace_id, signature, timestampMs);
    if (!claimed) {
      log.warn("webhook replay rejected");
      return NextResponse.json({ error: "Replay detected" }, { status: 409 });
    }
  }

  try {
    const { data: existing } = await db
      .from("raw_webhook_events")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .eq("workspace_id", workspace_id)
      .single();

    if (existing) {
      await incrementInboundRateLimit(workspace_id, ip);
      return NextResponse.json({ ok: true, idempotent: true });
    }

    const { data: inserted, error } = await db
      .from("raw_webhook_events")
      .insert({
        dedupe_key: dedupeKey,
        workspace_id,
        payload: body,
        source: "inbound",
        processed: false,
      })
      .select("id")
      .single();

    if (error) {
      const isConflict = String(error).includes("duplicate") || String(error).includes("unique");
      if (isConflict) return NextResponse.json({ ok: true, idempotent: true });
      log.error("webhook insert failed", { err: String(error) });
      return NextResponse.json({ error: "Failed to store event" }, { status: 500 });
    }

    if (!inserted) return NextResponse.json({ ok: true });

    await incrementInboundRateLimit(workspace_id, ip);

    const webhookId = (inserted as { id: string }).id;
    await enqueue({ type: "process_webhook", webhookId });

    const { processed } = await burstDrain();
    return NextResponse.json({ ok: true, webhook_id: webhookId, burst_processed: processed });
  } catch (err) {
    log.error("webhook error", { err: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
