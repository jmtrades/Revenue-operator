/**
 * Daily operational presence: "Nothing required today".
 * Once per workspace per local day. Suppression: login in last 12h, or higher-priority email in last 6h.
 */

import { getDb } from "@/lib/db/queries";
import {
  shouldSuppressPresence,
  sendDailyPresenceEmail,
  alreadySentInRange,
} from "./index";

function getWorkspaceLocal(timezone: string): { date: string; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  return { date, hour, minute };
}

/** 18:00 local, 15-min window so cron running every 15 min catches it once. */
function isDailyPresenceTime(timezone: string): boolean {
  const loc = getWorkspaceLocal(timezone);
  return loc.hour === 18 && loc.minute < 15;
}

export async function runOperationalPresenceDaily(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";

    try {
      if (!isDailyPresenceTime(tz)) continue;

      const { data: ws } = await db
        .from("workspaces")
        .select("owner_id, status, pause_reason, last_dashboard_open_at")
        .eq("id", workspaceId)
        .maybeSingle();
      const w = ws as { owner_id?: string; status?: string; pause_reason?: string; last_dashboard_open_at?: string } | null;
      if (!w) continue;
      if (w.status !== "active" && w.status != null) continue;
      if (w.pause_reason) continue;

      if (w.last_dashboard_open_at && w.last_dashboard_open_at > twelveHoursAgo) continue;

      const { count: handoffCount } = await db
        .from("escalation_logs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", twentyFourHoursAgo);
      if ((handoffCount ?? 0) > 0) continue;

      if (await shouldSuppressPresence(workspaceId, "daily")) continue;

      const dayStartIso = twentyFourHoursAgo;
      if (await alreadySentInRange(workspaceId, "daily", dayStartIso, now.toISOString())) continue;

      const ownerId = w.owner_id;
      if (!ownerId) continue;
      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const sent = await sendDailyPresenceEmail(workspaceId, email);
      results.push({ workspaceId, sent });
    } catch (e) {
      results.push({
        workspaceId,
        sent: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}
