/**
 * PATCH /api/appointments/[id] — Reschedule; syncs to Google Calendar if linked.
 * DELETE /api/appointments/[id] — Cancel and remove from Google if linked (Task 20).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const updateAppointmentSchema = z.object({
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
}).strict().refine(
  (data) => data.start_time || data.end_time,
  { message: "start_time or end_time required" }
);

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateAppointmentSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
  }
  const start_time = parsed.data.start_time;
  const end_time = parsed.data.end_time;

  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("appointments")
    .select("id, workspace_id, start_time, end_time, external_calendar_id")
    .eq("id", id)
    .maybeSingle();
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
    .maybeSingle();
  if (updateErr) {
    log("error", "appointments.update_error", { error: (updateErr as Error).message });
    return NextResponse.json({ error: "Could not update appointment. Please try again." }, { status: 500 });
  }

  if (row.external_calendar_id) {
    try {
      await fetch(`${req.nextUrl.origin}/api/integrations/google-calendar/events/${encodeURIComponent(row.external_calendar_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
        body: JSON.stringify({ start: finalStart, end: finalEnd }),
        signal: AbortSignal.timeout(15_000),
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
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  // Rate limit: 20 appointment deletes per minute per workspace
  const rl = await checkRateLimit(`appointments_delete:${session.workspaceId}`, 20, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many delete requests. Please slow down." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("appointments")
    .select("id, workspace_id, external_calendar_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = existing as { workspace_id: string; external_calendar_id?: string | null };
  if (row.workspace_id !== session.workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (row.external_calendar_id) {
    try {
      await fetch(`${req.nextUrl.origin}/api/integrations/google-calendar/events/${encodeURIComponent(row.external_calendar_id)}`, {
        method: "DELETE",
        headers: { cookie: req.headers.get("cookie") ?? "" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      // non-fatal
    }
  }

  const { error: deleteErr } = await db.from("appointments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  if (deleteErr) return NextResponse.json({ error: "Could not process appointment. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}