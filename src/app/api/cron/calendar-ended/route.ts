/**
 * Cron: detect recently ended calendar events (last 10 min), create call_session, enqueue calendar_call_ended.
 * Call periodically (e.g. every 5 min). Idempotent via (workspace_id, external_event_id).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { ensureCallSessionFromCalendarEvent } from "@/lib/calls/calendar-fallback";
import { enqueue } from "@/lib/queue";

const CRON_SECRET = process.env.CRON_SECRET;
const WINDOW_MINUTES = 10;

export async function GET(req: NextRequest) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const windowEnd = new Date();
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - WINDOW_MINUTES);

  const { data: events } = await db
    .from("calendar_events")
    .select("id, workspace_id, external_event_id, title, start_at, end_at, status, attendees, meeting_link")
    .gte("end_at", windowStart.toISOString())
    .lte("end_at", windowEnd.toISOString());

  let processed = 0;
  for (const ev of events ?? []) {
    const e = ev as { workspace_id: string; external_event_id: string; title?: string; start_at: string; end_at: string; status?: string; attendees?: unknown; meeting_link?: string };
    const { call_session_id, lead_id } = await ensureCallSessionFromCalendarEvent({
      workspace_id: e.workspace_id,
      external_event_id: e.external_event_id,
      title: e.title,
      start_at: e.start_at,
      end_at: e.end_at,
      status: e.status,
      attendees: Array.isArray(e.attendees) ? e.attendees as Array<{ email?: string; name?: string }> : [],
      meeting_link: e.meeting_link,
    });
    if (lead_id) {
      await enqueue({ type: "calendar_call_ended", callSessionId: call_session_id });
      processed++;
    }
  }

  return NextResponse.json({ ok: true, events_checked: (events ?? []).length, processed });
}
