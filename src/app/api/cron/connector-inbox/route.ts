/**
 * Cron: connector inbox. Every 5 minutes.
 * Loads unprocessed inbox events, maps to canonical signals, marks processed.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getUnprocessedInboxEvents, markInboxEventProcessed } from "@/lib/connectors/install-pack/webhook-inbox";
import { mapInboxEventToSignal } from "@/lib/connectors/install-pack/inbox-mapper";

const BATCH_SIZE = 50;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const events = await getUnprocessedInboxEvents(BATCH_SIZE);
  let processed = 0;
  for (const event of events) {
    try {
      const { mapped } = await mapInboxEventToSignal(event);
      await markInboxEventProcessed(event.id);
      if (mapped) processed++;
    } catch (err) {
      console.error("[connector-inbox] map failed", event.id, err);
    }
  }
  const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
  await recordCronHeartbeat("connector-inbox").catch(() => {});
  return NextResponse.json({ ok: true, processed, total: events.length });
}
