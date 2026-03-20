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
    log("warn", "voice_events.secret_not_configured", { message: "skipping signature verification" });
    return true;
  }
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
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
    await db.from("events").insert({
      workspace_id: workspaceId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      trigger_source: "voice",
    });
  } catch {
    // Best-effort logging; don't fail the voice pipeline.
  }

  return NextResponse.json({ ok: true });
}

