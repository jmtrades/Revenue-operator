/**
 * PATCH /api/appointments/[id] — Reschedule; syncs to Google Calendar if linked.
 * DELETE /api/appointments/[id] — Cancel and remove from Google if linked (Task 20).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const { id } = await ctx.params;
  let body: { start_time?: string; end_time?: string };
  try {
    body = (await req.json()) as { start_time?: string; end_time?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const start_time = body.start_time ?? undefined;
  const end_time = body.end_time ?? undefined;
  if (!start_time && !end_time) return NextResponse.json({ error: "start_time or end_time required" }, { status: 400 });

  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("appointments")
    .select("id, workspace_id, start_time, end_time, external_calendar_id")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = existing as { workspace_id: string; external_calendar_id?: string | null };
  if (row.workspace_id !== session.workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updatePayload: { start_time?: string; end_time?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (start_time) updatePayload.start_time = start_time;
  if (end_time) updatePayload.end_time = end_time;
  const finalStart = start_time ?? (existing as { start_time: string }).start_time;
  const finalEnd = end_time ?? (existing as { end_time?: string }).end_time ?? new Date(new Date(finalStart).getTime() + 3600000).toISOString();

  const { data: updated, error: updateErr } = await db
    .from("appointments")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
  if (updateErr) return NextResponse.json({ error: (updateErr as Error).message }, { status: 500 });

  if (row.external_calendar_id) {
    try {
      await fetch(`${req.nextUrl.origin}/api/integrations/google-calendar/events/${encodeURIComponent(row.external_calendar_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
        body: JSON.stringify({ start: finalStart, end: finalEnd }),
      });
    } catch {
      // non-fatal
    }
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("appointments")
    .select("id, workspace_id, external_calendar_id")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = existing as { workspace_id: string; external_calendar_id?: string | null };
  if (row.workspace_id !== session.workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (row.external_calendar_id) {
    try {
      await fetch(`${req.nextUrl.origin}/api/integrations/google-calendar/events/${encodeURIComponent(row.external_calendar_id)}`, {
        method: "DELETE",
        headers: { cookie: req.headers.get("cookie") ?? "" },
      });
    } catch {
      // non-fatal
    }
  }

  const { error: deleteErr } = await db.from("appointments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  if (deleteErr) return NextResponse.json({ error: (deleteErr as Error).message }, { status: 500 });
  return NextResponse.json({ ok: true });
}