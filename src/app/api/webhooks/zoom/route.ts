/**
 * Zoom webhook: meeting.ended, recording.completed, transcript.completed
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";


export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-zm-signature") ?? req.headers.get("authorization") ?? "";

  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  if (secret && signature && signature.startsWith("v0=")) {
    const crypto = await import("crypto");
    const expected = `v0=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
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
    .single();

  if (existing) {
    return NextResponse.json({ received: true, dedupe: true });
  }

  const { data: zoomAccount } = await db
    .from("zoom_accounts")
    .select("workspace_id")
    .limit(1)
    .single();

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
      .single();

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
