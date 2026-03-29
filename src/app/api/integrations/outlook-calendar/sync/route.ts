/**
 * POST /api/integrations/outlook-calendar/sync — Inbound sync from Outlook/Microsoft 365 Calendar.
 * Fetches events for the next 30 days via Microsoft Graph API and creates/updates appointments.
 * Auto-refreshes expired OAuth tokens using the stored refresh_token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

/**
 * Get and refresh Microsoft 365 access token if needed.
 */
async function getAccessToken(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_crm_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "microsoft_365")
    .eq("status", "active")
    .maybeSingle();

  const row = data as {
    access_token?: string | null;
    refresh_token?: string | null;
    token_expires_at?: string | null;
  } | null;
  if (!row?.access_token) return null;

  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;
  if (Date.now() < expiresAt - 60_000) return row.access_token;

  // Token expired, refresh it
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret || !row.refresh_token) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refresh_token,
    grant_type: "refresh_token",
    scope: "Calendars.Read offline_access",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const newExpires = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  await db
    .from("workspace_crm_connections")
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token || row.refresh_token,
      token_expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", "microsoft_365");

  return json.access_token ?? null;
}

interface OutlookEvent {
  id?: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isCancelled?: boolean;
  lastModifiedDateTime?: string;
  attendees?: Array<{
    emailAddress?: { address?: string; name?: string };
    type?: string;
    status?: { response?: string };
  }>;
  location?: { displayName?: string };
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
        error: "Outlook connection expired. Reconnect Microsoft 365 in Settings.",
        code: "calendar_connection_expired",
      },
      { status: 401 }
    );
  }

  const db = getDb();
  const now = new Date();
  const thirtyDaysFromNow = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  let syncedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;

  try {
    // Fetch Outlook Calendar events for the next 30 days via Microsoft Graph
    const params = new URLSearchParams({
      startDateTime: now.toISOString(),
      endDateTime: thirtyDaysFromNow.toISOString(),
      $top: "250",
      $select:
        "id,subject,body,start,end,isCancelled,lastModifiedDateTime,attendees,location",
      $orderby: "start/dateTime",
    });

    const eventsRes = await fetch(
      `${GRAPH_BASE}/me/calendarView?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Prefer: 'outlook.timezone="UTC"',
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (eventsRes.status === 401 || eventsRes.status === 403) {
      return NextResponse.json(
        {
          error:
            "Outlook connection expired. Reconnect Microsoft 365 in Settings.",
          code: "calendar_connection_expired",
        },
        { status: 401 }
      );
    }

    if (!eventsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Outlook calendar events" },
        { status: 502 }
      );
    }

    const eventsData = (await eventsRes.json()) as {
      value?: OutlookEvent[];
    };
    const events = eventsData.value ?? [];

    for (const event of events) {
      if (!event.id || !event.subject) continue;

      // Skip cancelled events
      if (event.isCancelled) continue;

      const startTime = event.start?.dateTime;
      const endTime = event.end?.dateTime;

      if (!startTime) continue;

      // Try to find existing appointment by outlook_event_id in metadata
      const { data: existing } = await db
        .from("appointments")
        .select("id, updated_at")
        .eq("workspace_id", session.workspaceId)
        .contains("metadata", { outlook_event_id: event.id })
        .maybeSingle();

      // Map attendees to a lead
      let leadId: string | null = null;
      if (event.attendees && event.attendees.length > 0) {
        for (const attendee of event.attendees) {
          const email = attendee.emailAddress?.address;
          if (!email) continue;

          const { data: leadRow } = await db
            .from("leads")
            .select("id")
            .eq("workspace_id", session.workspaceId)
            .eq("email", email)
            .maybeSingle();

          if (leadRow) {
            leadId = (leadRow as { id: string }).id;
            break;
          }
        }

        // Create lead from first attendee if no match found
        if (!leadId && event.attendees[0]?.emailAddress?.address) {
          const attendee = event.attendees[0];
          const { data: newLead } = await db
            .from("leads")
            .insert({
              workspace_id: session.workspaceId,
              name:
                attendee.emailAddress?.name || "Outlook Calendar Contact",
              email: attendee.emailAddress?.address,
              phone: null,
              company: null,
              status: "NEW",
              metadata: { source: "outlook_calendar_sync" },
            })
            .select("id")
            .maybeSingle();

          if (newLead) {
            leadId = (newLead as { id: string }).id;
          }
        }
      }

      // Create generic lead if still no lead
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
            metadata: { source: "outlook_calendar_sync" },
          })
          .select("id")
          .maybeSingle();

        if (newLead) {
          leadId = (newLead as { id: string }).id;
        }
      }

      if (!leadId) continue;

      const metadata = {
        outlook_event_id: event.id,
        source: "outlook_calendar_sync",
        location: event.location?.displayName || null,
      };

      // Determine appointment status from attendees
      const hasDeclined = event.attendees?.some(
        (a) => a.status?.response === "declined"
      );
      const aptStatus = hasDeclined ? "cancelled" : "confirmed";

      // Strip HTML from body if present
      const notes =
        event.body?.contentType === "html"
          ? (event.body.content || "").replace(/<[^>]*>/g, "").trim()
          : event.body?.content || null;

      if (existing) {
        const eventUpdated = event.lastModifiedDateTime
          ? new Date(event.lastModifiedDateTime)
          : now;
        const appointmentUpdated = new Date(existing.updated_at);

        if (eventUpdated > appointmentUpdated) {
          await db
            .from("appointments")
            .update({
              title: event.subject,
              start_time: startTime,
              end_time: endTime || undefined,
              notes: notes ? notes.slice(0, 5000) : null,
              status: aptStatus,
              metadata,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          updatedCount++;
        }
      } else {
        await db.from("appointments").insert({
          workspace_id: session.workspaceId,
          lead_id: leadId,
          title: event.subject,
          start_time: startTime,
          end_time: endTime || undefined,
          location: event.location?.displayName || null,
          notes: notes ? notes.slice(0, 5000) : null,
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
    console.error("[outlook-calendar-sync] error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
