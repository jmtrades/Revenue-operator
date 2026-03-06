/**
 * POST /api/integrations/google-calendar/book — Create a calendar event (requires session + workspace).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import {
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret,
} from "@/lib/integrations/google-calendar-env";

export const dynamic = "force-dynamic";

async function getAccessToken(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("workspace_id", workspaceId)
    .single();

  const row = data as { access_token?: string | null; refresh_token?: string | null; expires_at?: string | null } | null;
  if (!row?.access_token) return null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (Date.now() < expiresAt - 60_000) return row.access_token;

  const clientId = getGoogleCalendarClientId();
  const clientSecret = getGoogleCalendarClientSecret();
  if (!clientId || !clientSecret || !row.refresh_token) return row.access_token;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  const newExpires = json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null;
  await db
    .from("google_calendar_tokens")
    .update({
      access_token: json.access_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);
  return json.access_token ?? null;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; start?: string; end?: string };
  try {
    body = (await req.json()) as { title?: string; start?: string; end?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "Appointment").trim();
  const start = body.start ?? new Date().toISOString();
  const end = body.end ?? new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const token = await getAccessToken(session.workspaceId);
  if (!token) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
  }

  const eventRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      summary: title,
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
    }),
  });

  if (!eventRes.ok) {
    await eventRes.text();
    return NextResponse.json({ error: "Calendar create failed" }, { status: 502 });
  }

  const event = (await eventRes.json()) as { id?: string; htmlLink?: string };
  return NextResponse.json({ ok: true, eventId: event.id, link: event.htmlLink });
}
