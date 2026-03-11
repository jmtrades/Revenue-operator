/**
 * GET /api/appointments — List appointments for workspace (v7 appointments table).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();
  const { data: rows, error } = await db
    .from("appointments")
    .select("id, lead_id, title, start_time, end_time, location, status, notes, external_calendar_id")
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    return {
      id: a.id,
      lead_id: a.lead_id,
      title: a.title,
      start_time: a.start_time,
      end_time: a.end_time,
      location: a.location,
      status: a.status,
      notes: a.notes,
      external_calendar_id: a.external_calendar_id ?? undefined,
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
  if (!title?.trim() || !start_time) return NextResponse.json({ error: "title and start_time required" }, { status: 400 });

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
        state: "new",
        metadata: { source: "calendar_manual" },
      })
      .select("id")
      .single();
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
    .single();
  if (aptErr || !appointment) return NextResponse.json({ error: (aptErr as Error)?.message ?? "Insert failed" }, { status: 500 });

  const apt = appointment as { id: string; external_calendar_id?: string | null };
  let externalCalendarId: string | null = null;
  try {
    const statusRes = await fetch(`${req.nextUrl.origin}/api/integrations/google-calendar/status`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    const statusData = statusRes.ok ? (await statusRes.json()) as { connected?: boolean } : { connected: false };
    if (statusData.connected) {
      const { data: leadRow } = await db.from("leads").select("name, phone").eq("id", leadId).single();
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
      }
    }
  } catch {
    // non-fatal: appointment created, calendar sync skipped
  }

  return NextResponse.json({ ...(appointment as object), external_calendar_id: externalCalendarId ?? (apt as { external_calendar_id?: string | null }).external_calendar_id });
}
