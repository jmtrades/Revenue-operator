/**
 * Zoom webhook: meeting.ended, recording.completed, transcript.completed
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-zm-signature") ?? req.headers.get("authorization") ?? "";

  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  if (secret) {
    if (!signature || !signature.startsWith("v0=")) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const expected = `v0=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(signature);
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    log("warn", "zoom_webhook.secret_not_configured", { message: "signature verification skipped" });
  }

  let body: { event?: string; payload?: { object?: { id?: string; uuid?: string; participant_user_ids?: string[] }; account_id?: string } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  const payload = body.payload ?? {};
  const meetingId = String(payload.object?.id ?? "");
  const meetingUuid = payload.object?.uuid ?? "";

  const dedupeKey = `zoom:${event}:${meetingId}:${meetingUuid}`;
  const db = getDb();

  const { data: existing } = await db
    .from("raw_webhook_events")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, dedupe: true });
  }

  const { data: zoomAccount } = await db
    .from("zoom_accounts")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();

  const workspaceId = (zoomAccount as { workspace_id?: string })?.workspace_id ?? null;

  await db.from("raw_webhook_events").insert({
    dedupe_key: dedupeKey,
    workspace_id: workspaceId,
    payload: body,
    source: "zoom",
  });

  if (event === "meeting.ended" || event === "recording.completed" || event === "transcript.completed") {
    const { data: inserted } = await db
      .from("raw_webhook_events")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();

    if (inserted && workspaceId) {
      await enqueue({
        type: "zoom_webhook",
        webhookId: (inserted as { id: string }).id,
        workspaceId,
        meetingId,
        meetingUuid,
        event,
      });
    }
  }

  return NextResponse.json({ received: true });
}
