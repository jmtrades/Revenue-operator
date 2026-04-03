/**
 * POST /api/voice/events — Voice event logging for the contact timeline
 *
 * Pipecat (self-hosted) sends call lifecycle events (answered, intent detected, booking made, etc).
 * We persist them into the `events` table so the dashboard can render an activity feed.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/http/csrf";

type VoiceEventBody = {
  event: string;
  workspace_id: string;
  call_sid?: string;
  voice_id?: string;
  entity_type?: string;
  entity_id?: string;
  payload?: unknown;
};

function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    // SECURITY: Reject all requests when secret is not configured.
    // Never fail-open on authentication.
    log("error", "voice_events.secret_not_configured", {
      message: "VOICE_WEBHOOK_SECRET not set — rejecting request",
    });
    return false;
  }
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
  // Use timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signature, "utf-8");
  try {
    const { timingSafeEqual } = await import("crypto");
    return timingSafeEqual(a, b);
  } catch {
    return expected === signature;
  }
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const signature = req.headers.get("x-voice-webhook-signature");
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: VoiceEventBody;
  try {
    body = JSON.parse(rawBody) as VoiceEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = typeof body?.event === "string" ? body.event.trim() : "";
  const workspaceId = typeof body?.workspace_id === "string" ? body.workspace_id.trim() : "";
  if (!eventType || !workspaceId) {
    return NextResponse.json({ error: "event and workspace_id required" }, { status: 400 });
  }

  const entityType = typeof body?.entity_type === "string" ? body.entity_type : "call";
  const entityId = typeof body?.entity_id === "string" ? body.entity_id : (body.call_sid ?? workspaceId);
  const payload = typeof body?.payload !== "undefined" ? body.payload : body;

  const db = getDb();
  try {
    const { error: insertErr } = await db.from("events").insert({
      workspace_id: workspaceId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      trigger_source: "voice",
    });
    if (insertErr) {
      log("warn", "voice_events.insert_failed", { workspace_id: workspaceId, event: eventType, error: insertErr.message });
    }
  } catch (err) {
    log("warn", "voice_events.insert_error", { workspace_id: workspaceId, event: eventType, error: err instanceof Error ? err.message : String(err) });
  }

  return NextResponse.json({ ok: true });
}

