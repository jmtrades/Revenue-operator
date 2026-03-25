/**
 * Calendar provider read API for reconciliation. No direct state writes.
 */

export interface CalendarEventRow {
  external_event_id: string;
  start_at: string;
  status: string;
  updated_at: string;
}

export interface CalendarReadProvider {
  getEvent(params: { workspaceId: string; external_event_id: string }): Promise<{
    exists: boolean;
    start_at?: string;
    status?: string;
    updated_at?: string;
    cancelled?: boolean;
  }>;
  listUpcomingEvents(params: { workspaceId: string; from: string; to: string; limit: number }): Promise<CalendarEventRow[]>;
}

/**
 * Stub: use existing calendar integration if present; otherwise return empty.
 */
export function createCalendarReadProvider(): CalendarReadProvider {
  return {
    async getEvent({ workspaceId, external_event_id }) {
      try {
        const db = (await import("@/lib/db/queries")).getDb();
        const { data: ev } = await db
          .from("calendar_events")
          .select("external_event_id, start_at, status, updated_at")
          .eq("workspace_id", workspaceId)
          .eq("external_event_id", external_event_id)
          .maybeSingle();
        if (!ev) return { exists: false };
        const row = ev as { start_at?: string; status?: string; updated_at?: string };
        return {
          exists: true,
          start_at: row.start_at ?? undefined,
          status: row.status ?? undefined,
          updated_at: row.updated_at ?? undefined,
          cancelled: row.status === "cancelled",
        };
      } catch {
        return { exists: false };
      }
    },

    async listUpcomingEvents({ workspaceId, from, to, limit }) {
      try {
        const db = (await import("@/lib/db/queries")).getDb();
        const { data: rows } = await db
          .from("calendar_events")
          .select("external_event_id, start_at, status, updated_at")
          .eq("workspace_id", workspaceId)
          .gte("start_at", from)
          .lte("start_at", to)
          .limit(limit);
        return (rows ?? []).map((r: { external_event_id?: string; start_at?: string; status?: string; updated_at?: string }) => ({
          external_event_id: r.external_event_id ?? "",
          start_at: r.start_at ?? "",
          status: r.status ?? "unknown",
          updated_at: r.updated_at ?? "",
        }));
      } catch {
        return [];
      }
    },
  };
}

export function getCalendarProvider(): CalendarReadProvider {
  return createCalendarReadProvider();
}
