/**
 * GET /api/appointments — List appointments for workspace (v7 appointments table).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();
  const statusFilter = req.nextUrl.searchParams.get("status");
  const limitParam = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10), 200);

  let query = db
    .from("appointments")
    .select("id, lead_id, title, start_time, end_time, location, status, notes, external_calendar_id")
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: true })
    .limit(limitParam);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });

  const list = (rows ?? []) as { id: string; lead_id: string; title: string; start_time: string; end_time?: string | null; location?: string | null; status: string; notes?: string | null; external_calendar_id?: string | null }[];
  const leadIds = [...new Set(list.map((a) => a.lead_id))];
  const { data: leadRows } = leadIds.length
    ? await db.from("leads").select("id, name, phone").in("id", leadIds)
    : { data: [] };
  const leadMap = ((leadRows ?? []) as { id: string; name?: string | null; phone?: string | null }[]).reduce(
    (acc, l) => {
      acc[l.id] = l;
      return acc;
    },
    {} as Record<string, { name?: string | null; phone?: string | null }>
  );

  const appointments = list.map((a) => {
    const lead = leadMap[a.lead_id];
    const start = new Date(a.start_time);
    const end = a.end_time ? new Date(a.end_time) : null;
    const durationMinutes = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 30;
    return {
      id: a.id,
      lead_id: a.lead_id,
      title: a.title,
      start_time: a.start_time,
      end_time: a.end_time,
      scheduled_at: a.start_time, // alias for AppointmentManagementCard
      duration_minutes: durationMinutes,
      meeting_url: a.location?.startsWith("http") ? a.location : null,
      location: a.location,
      status: a.status,
      notes: a.notes,
      description: a.notes,
      external_calendar_id: a.external_calendar_id ?? undefined,
      lead_name: lead?.name ?? null,
      lead_phone: lead?.phone ?? "",
      contactName: lead?.name ?? "Contact",
      contactPhone: lead?.phone ?? "",
      date: start.toISOString().slice(0, 10),
      time: start.toTimeString().slice(0, 5),
      type: a.title,
      source: "Inbound call" as const,
    };
  });

  return NextResponse.json({ appointments });
}

/**
 * POST /api/appointments — Create appointment; optionally book to Google Calendar (Task 20).
 */
export async function POST(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: {
    lead_id?: string;
    contactName?: string;
    contactPhone?: string;
    title: string;
    start_time: string;
    end_time?: string;
    location?: string;
    notes?: string;
    callSummary?: string;
    agentName?: string;
    recordingLink?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { title, start_time, end_time, location, notes, contactName, contactPhone, callSummary, agentName, recordingLink } = body;

  // Validate title
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (title.trim().length > 255) return NextResponse.json({ error: "title must not exceed 255 characters" }, { status: 400 });

  // Validate start_time is provided
  if (!start_time) return NextResponse.json({ error: "start_time is required" }, { status: 400 });

  // Validate start_time is valid ISO 8601
  const startDate = new Date(start_time);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "start_time must be a valid ISO 8601 date" }, { status: 400 });
  }

  // Validate start_time is not in the past (allow 5 minute grace)
  const now = new Date();
  const graceTime = new Date(now.getTime() + 5 * 60 * 1000);
  if (startDate < graceTime) {
    return NextResponse.json({ error: "start_time cannot be in the past" }, { status: 400 });
  }

  // Validate end_time if provided
  if (end_time) {
    const endDate = new Date(end_time);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "end_time must be a valid ISO 8601 date" }, { status: 400 });
    }
    if (endDate <= startDate) {
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
    }
  }

  const db = getDb();
  let leadId = body.lead_id?.trim() || null;
  if (!leadId && contactName?.trim() && contactPhone?.trim()) {
    const { data: newLead, error: leadErr } = await db
      .from("leads")
      .insert({
        workspace_id: workspaceId,
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: null,
        company: null,
        status: "NEW",
        metadata: { source: "calendar_manual" },
      })
      .select("id")
      .maybeSingle();
    if (leadErr || !newLead) return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    leadId = (newLead as { id: string }).id;
  }
  if (!leadId) return NextResponse.json({ error: "lead_id or (contactName and contactPhone) required" }, { status: 400 });

  const endTime = end_time ?? new Date(new Date(start_time).getTime() + 60 * 60 * 1000).toISOString();
  const { data: appointment, error: aptErr } = await db
    .from("appointments")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      title: title.trim(),
      start_time,
      end_time: endTime,
      location: location?.trim() || null,
      notes: notes?.trim() || null,
      status: "confirmed",
    })
    .select()
    .maybeSingle();
  if (aptErr || !appointment) {
    console.error("[appointments] insert error:", (aptErr as Error)?.message);
    return NextResponse.json({ error: "Could not create appointment. Please try again." }, { status: 500 });
  }

  const apt = appointment as { id: string; external_calendar_id?: string | null };
  let externalCalendarId: string | null = null;
  try {
    const statusRes = await fetch(`${req.nextUrl.origin}/api/integrations/google-calendar/status`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    const statusData = statusRes.ok ? (await statusRes.json()) as { connected?: boolean } : { connected: false };
    if (statusData.connected) {
      const { data: leadRow } = await db.from("leads").select("name, phone").eq("id", leadId).maybeSingle();
      const lead = leadRow as { name?: string | null; phone?: string | null } | null;
      const bookRes = await fetch(`${req.nextUrl.origin}/api/integrations/google-calendar/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
        body: JSON.stringify({
          title: title.trim(),
          start: start_time,
          end: endTime,
          contactName: lead?.name ?? contactName ?? "",
          contactPhone: lead?.phone ?? contactPhone ?? "",
          callSummary: callSummary ?? "",
          agentName: agentName ?? "",
          recordingLink: recordingLink ?? "",
        }),
      });
      if (bookRes.ok) {
        const bookJson = (await bookRes.json()) as { eventId?: string };
        if (bookJson.eventId) {
          externalCalendarId = bookJson.eventId;
          await db.from("appointments").update({ external_calendar_id: externalCalendarId, updated_at: new Date().toISOString() }).eq("id", apt.id);
        }
      } else {
        const bookErr = (await bookRes.json().catch(() => null)) as { code?: string } | null;
        if (bookErr?.code === "calendar_connection_expired") {
          return NextResponse.json(
            {
              ...(appointment as object),
              external_calendar_id: null,
              warning: "Calendar connection expired. Reconnect in Settings.",
              warning_code: "calendar_connection_expired",
            },
            { status: 200 },
          );
        }
      }
    }
  } catch {
    // non-fatal: appointment created, calendar sync skipped
  }

  return NextResponse.json({ ...(appointment as object), external_calendar_id: externalCalendarId ?? (apt as { external_calendar_id?: string | null }).external_calendar_id });
}

/**
 * PATCH /api/appointments — Update appointment (cancel, reschedule, mark complete).
 */
export async function PATCH(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: {
    id: string;
    status?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status, start_time, end_time, location, notes } = body;
  if (!id?.trim()) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status !== undefined) updates.status = status;
  if (start_time !== undefined) updates.start_time = start_time;
  if (end_time !== undefined) updates.end_time = end_time;
  if (location !== undefined) updates.location = location;
  if (notes !== undefined) updates.notes = notes;

  const { data: appointment, error: updateErr } = await db
    .from("appointments")
    .update(updates)
    .eq("id", id.trim())
    .eq("workspace_id", workspaceId)
    .select()
    .maybeSingle();

  if (updateErr || !appointment) {
    console.error("[appointments] update error:", (updateErr as Error)?.message);
    return NextResponse.json({ error: "Could not update appointment" }, { status: 500 });
  }

  return NextResponse.json(appointment);
}
