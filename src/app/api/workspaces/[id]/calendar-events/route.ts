/**
 * Ingest a calendar event (e.g. from Zapier). Creates call_session if event has ended,
 * enqueues calendar_call_ended for conservative follow-up when no Zoom transcript.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { ensureCallSessionFromCalendarEvent } from "@/lib/calls/calendar-fallback";
import { enqueue } from "@/lib/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  let body: {
    external_event_id: string;
    title?: string;
    start_at: string;
    end_at: string;
    status?: string;
    attendees?: Array<{ email?: string; name?: string }>;
    meeting_link?: string;
  } = { external_event_id: "", start_at: "", end_at: "" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.external_event_id || !body.start_at || !body.end_at) {
    return NextResponse.json({ error: "external_event_id, start_at, end_at required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspaceId).single();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const endAt = new Date(body.end_at);
  const now = new Date();
  if (endAt > now) {
    await db.from("calendar_events").upsert(
      {
        workspace_id: workspaceId,
        external_event_id: body.external_event_id,
        title: body.title,
        start_at: body.start_at,
        end_at: body.end_at,
        status: body.status ?? "confirmed",
        attendees: body.attendees ?? [],
        meeting_link: body.meeting_link,
        meeting_link_domain: (() => {
          try { return body.meeting_link ? new URL(body.meeting_link).hostname : null; } catch { return null; }
        })(),
      },
      { onConflict: "workspace_id,external_event_id" }
    );
    return NextResponse.json({ status: "scheduled", message: "Event not yet ended" });
  }

  const { call_session_id, lead_id } = await ensureCallSessionFromCalendarEvent({
    workspace_id: workspaceId,
    external_event_id: body.external_event_id,
    title: body.title,
    start_at: body.start_at,
    end_at: body.end_at,
    status: body.status,
    attendees: body.attendees,
    meeting_link: body.meeting_link,
  });

  if (!lead_id) {
    return NextResponse.json({ status: "no_lead", call_session_id, message: "No lead matched" });
  }

  await enqueue({ type: "calendar_call_ended", callSessionId: call_session_id });
  return NextResponse.json({ status: "processed", call_session_id, lead_id });
}
