/**
 * GET /api/integrations/google-calendar/availability?workspace_id=&date= — Free slots for a day.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

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

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
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

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const dateStr = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const token = await getAccessToken(workspaceId);
  if (!token) {
    return NextResponse.json({ slots: [], connected: false });
  }

  const date = dateStr ?? new Date().toISOString().slice(0, 10);
  const timeMin = `${date}T09:00:00Z`;
  const timeMax = `${date}T17:00:00Z`;

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    }
  );

  if (!res.ok) {
    return NextResponse.json({ slots: [], connected: true });
  }

  const data = (await res.json()) as { calendars?: { primary?: { busy?: { start: string; end: string }[] } } };
  const busy = data.calendars?.primary?.busy ?? [];
  const slotMins = 30;
  const slots: string[] = [];
  let t = new Date(timeMin).getTime();
  const end = new Date(timeMax).getTime();
  while (t + slotMins * 60 * 1000 <= end) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + slotMins * 60 * 1000);
    const isBusy = busy.some(
      (b) => slotStart < new Date(b.end) && slotEnd > new Date(b.start)
    );
    if (!isBusy) slots.push(slotStart.toISOString().slice(11, 16));
    t += slotMins * 60 * 1000;
  }

  return NextResponse.json({ slots, connected: true });
}
