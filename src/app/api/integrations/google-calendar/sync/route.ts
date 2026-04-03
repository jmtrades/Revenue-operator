/**
 * POST /api/integrations/google-calendar/sync — Inbound sync from Google Calendar to appointments table.
 * Fetches Google Calendar events for the next 30 days and creates/updates appointments.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import {
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret,
} from "@/lib/integrations/google-calendar-env";
import { assertSameOrigin } from "@/lib/http/csrf";
import { decrypt, encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

/**
 * Get and refresh Google Calendar access token if needed.
 */
async function getAccessToken(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const row = data as {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: string | null;
  } | null;
  if (!row?.access_token) return null;

  const accessToken = await decrypt(row.access_token);
  const refreshToken = row.refresh_token ? await decrypt(row.refresh_token) : null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (Date.now() < expiresAt - 60_000) return accessToken;

  // Token expired, refresh it
  const clientId = getGoogleCalendarClientId();
  const clientSecret = getGoogleCalendarClientSecret();
  if (!clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const newExpires = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  const newAccessEnc = json.access_token ? await encrypt(json.access_token) : null;
  await db
    .from("google_calendar_tokens")
    .update({
      access_token: newAccessEnc,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  return json.access_token ?? null;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  attendees?: Array<{ email?: string; displayName?: string }>;
  updated?: string;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const token = await getAccessToken(session.workspaceId);
  if (!token) {
    return NextResponse.json(
      {
        error: "Calendar connection expired. Reconnect in Settings.",
        code: "calendar_connection_expired",
      },
      { status: 401 }
    );
  }

  const db = getDb();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let syncedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;

  try {
    // Fetch Google Calendar events for the next 30 days
    const eventsRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: thirtyDaysFromNow.toISOString(),
          maxResults: "250",
          singleEvents: "true",
          orderBy: "startTime",
        }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (eventsRes.status === 401 || eventsRes.status === 403) {
      return NextResponse.json(
        {
          error: "Calendar connection expired. Reconnect in Settings.",
          code: "calendar_connection_expired",
        },
        { status: 401 }
      );
    }

    if (!eventsRes.ok) {
      const errText = await eventsRes.text();
      log("error", "[google-calendar-sync] fetch failed:", { error: errText });
      return NextResponse.json(
        { error: "Failed to fetch calendar events" },
        { status: 502 }
      );
    }

    const eventsData = (await eventsRes.json()) as {
      items?: GoogleCalendarEvent[];
    };
    const events = eventsData.items ?? [];

    // Process each event
    for (const event of events) {
      if (!event.id || !event.summary) continue;

      // Skip cancelled events
      if (event.status === "cancelled") continue;

      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      if (!startTime) continue;

      // Try to find existing appointment by google_event_id in metadata
      const { data: existing } = await db
        .from("appointments")
        .select("id, updated_at")
        .eq("workspace_id", session.workspaceId)
        .contains("metadata", { google_event_id: event.id })
        .maybeSingle();

      // Map attendees to a lead
      let leadId: string | null = null;
      if (event.attendees && event.attendees.length > 0) {
        // Try to find a lead by email from attendees (skip the organizer)
        for (const attendee of event.attendees) {
          if (!attendee.email) continue;

          const { data: leadRow } = await db
            .from("leads")
            .select("id")
            .eq("workspace_id", session.workspaceId)
            .eq("email", attendee.email)
            .maybeSingle();

          if (leadRow) {
            leadId = (leadRow as { id: string }).id;
            break;
          }
        }

        // If no matching lead found, create one from first attendee
        if (!leadId && event.attendees[0]?.email) {
          const attendee = event.attendees[0];
          const { data: newLead } = await db
            .from("leads")
            .insert({
              workspace_id: session.workspaceId,
              name: attendee.displayName || "Google Calendar Contact",
              email: attendee.email,
              phone: null,
              company: null,
              status: "NEW",
              metadata: { source: "google_calendar_sync" },
            })
            .select("id")
            .maybeSingle();

          if (newLead) {
            leadId = (newLead as { id: string }).id;
          }
        }
      }

      // If still no lead, create a generic one
      if (!leadId) {
        const { data: newLead } = await db
          .from("leads")
          .insert({
            workspace_id: session.workspaceId,
            name: "Calendar Event",
            email: null,
            phone: null,
            company: null,
            status: "NEW",
            metadata: { source: "google_calendar_sync" },
          })
          .select("id")
          .maybeSingle();

        if (newLead) {
          leadId = (newLead as { id: string }).id;
        }
      }

      if (!leadId) continue; // Skip if we couldn't create a lead

      const metadata = {
        google_event_id: event.id,
        source: "google_calendar_sync",
      };

      // Map Google Calendar status to appointment status
      const aptStatus =
        event.status === "tentative" ? "pending" : "confirmed";

      if (existing) {
        // Update existing appointment if modified
        const eventUpdated = event.updated ? new Date(event.updated) : now;
        const appointmentUpdated = new Date(existing.updated_at);

        if (eventUpdated > appointmentUpdated) {
          await db
            .from("appointments")
            .update({
              title: event.summary,
              start_time: startTime,
              end_time: endTime || undefined,
              notes: event.description || null,
              status: aptStatus,
              metadata,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          updatedCount++;
        }
      } else {
        // Create new appointment
        await db
          .from("appointments")
          .insert({
            workspace_id: session.workspaceId,
            lead_id: leadId,
            title: event.summary,
            start_time: startTime,
            end_time: endTime || undefined,
            location: null,
            notes: event.description || null,
            status: aptStatus,
            metadata,
          });

        createdCount++;
      }

      syncedCount++;
    }

    return NextResponse.json({
      ok: true,
      synced: syncedCount,
      created: createdCount,
      updated: updatedCount,
    });
  } catch (err) {
    log("error", "[google-calendar-sync] error:", { error: err });
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
import { log } from "@/lib/logger";
