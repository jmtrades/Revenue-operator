/**
 * Temporal anchoring semantics: operational stability across business cycles.
 * No dashboards, reports, counts, or analytics — only one-line anchors.
 */

import { getDb } from "@/lib/db/queries";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "https://app.recall-touch.com";

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
  });
  return res.ok;
}

function getWorkspaceLocal(timezone: string): {
  date: string;
  weekday: string;
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  isLastDayOfMonth: boolean;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10);
  const day = parseInt(get("day"), 10);
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = get("weekday");
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const lastDay = new Date(year, month, 0).getDate();
  const isLastDayOfMonth = day === lastDay;
  return { date, weekday, day, month, year, hour, minute, isLastDayOfMonth };
}

function isFridayClosePlus45(timezone: string, endStr: string): boolean {
  const [endHour, endMin] = (endStr || "17:00").split(":").map((n) => parseInt(n, 10));
  let close45Min = endMin + 45;
  let close45Hour = endHour;
  if (close45Min >= 60) {
    close45Min -= 60;
    close45Hour += 1;
  }
  const loc = getWorkspaceLocal(timezone);
  return loc.weekday === "Fri" && loc.hour === close45Hour && loc.minute >= close45Min && loc.minute < close45Min + 15;
}

function isFirstOfMonth0930(timezone: string): boolean {
  const loc = getWorkspaceLocal(timezone);
  return loc.day === 1 && loc.hour === 9 && loc.minute >= 30 && loc.minute < 45;
}

function isLastDayOfMonthAtClose(timezone: string, endStr: string): boolean {
  const [endHour, endMin] = (endStr || "17:00").split(":").map((n) => parseInt(n, 10));
  const loc = getWorkspaceLocal(timezone);
  return loc.isLastDayOfMonth && loc.hour === endHour && loc.minute >= endMin && loc.minute < endMin + 15;
}

function isThursday1500(timezone: string): boolean {
  const loc = getWorkspaceLocal(timezone);
  return loc.weekday === "Thu" && loc.hour === 15 && loc.minute >= 0 && loc.minute < 15;
}

/** Part 1: Friday at business close + 45 min, no unresolved handoffs → "This week concluded normally." */
export async function runWeekCompletionAnchor(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const now = new Date().toISOString();

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string; end?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";
    const end = (row.business_hours as { end?: string })?.end ?? "17:00";

    try {
      if (!isFridayClosePlus45(tz, end)) continue;

      const { count } = await db
        .from("escalation_logs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("holding_message_sent", true)
        .not("hold_until", "is", null)
        .gt("hold_until", now);
      if ((count ?? 0) > 0) continue;

      const loc = getWorkspaceLocal(tz);
      const weekKey = loc.date;
      const { data: alreadySent } = await db
        .from("week_completion_anchor_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_week_key", weekKey)
        .limit(1);
      if (alreadySent?.length) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const { shouldSuppressPresence, logPresenceSent } = await import("@/lib/operational-presence");
      if (await shouldSuppressPresence(workspaceId, "weekly")) continue;

      const subject = "Conditions are normal.";
      const text = "Conditions are normal.\n\nOpen: " + APP_URL + "/dashboard";
      const sent = await sendEmail(email, subject, text);
      if (sent) {
        await db.from("week_completion_anchor_sent").insert({
          workspace_id: workspaceId,
          sent_week_key: weekKey,
          sent_at: new Date().toISOString(),
        });
        await logPresenceSent(workspaceId, "weekly");
      }
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

/** Part 2: 1st of month at 09:30 local, system active and not paused → "Handling continues into the new month." */
export async function runMonthStartAnchor(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";

    try {
      if (!isFirstOfMonth0930(tz)) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id, status").eq("id", workspaceId).maybeSingle();
      const status = (ws as { status?: string } | null)?.status;
      if (status === "paused" || status === "expired") continue;

      const loc = getWorkspaceLocal(tz);
      const monthKey = `${loc.year}-${String(loc.month).padStart(2, "0")}`;
      const { data: alreadySent } = await db
        .from("month_start_anchor_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("month_key", monthKey)
        .limit(1);
      if (alreadySent?.length) continue;

      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const { shouldSuppressPresence, logPresenceSent } = await import("@/lib/operational-presence");
      if (await shouldSuppressPresence(workspaceId, "monthly")) continue;

      const subject = "Conditions are normal.";
      const text = "Conditions are normal.\n\nOpen: " + APP_URL + "/dashboard";
      const sent = await sendEmail(email, subject, text);
      if (sent) {
        await db.from("month_start_anchor_sent").insert({
          workspace_id: workspaceId,
          month_key: monthKey,
          sent_at: new Date().toISOString(),
        });
        await logPresenceSent(workspaceId, "monthly");
      }
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

/** Part 3: Last day of month at business close, no active escalations → "This month closed without interruption." */
export async function runMonthEndAnchor(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const now = new Date().toISOString();

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string; end?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";
    const end = (row.business_hours as { end?: string })?.end ?? "17:00";

    try {
      if (!isLastDayOfMonthAtClose(tz, end)) continue;

      const { count } = await db
        .from("escalation_logs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("holding_message_sent", true)
        .not("hold_until", "is", null)
        .gt("hold_until", now);
      if ((count ?? 0) > 0) continue;

      const loc = getWorkspaceLocal(tz);
      const monthKey = `${loc.year}-${String(loc.month).padStart(2, "0")}`;
      const { data: alreadySent } = await db
        .from("month_end_anchor_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("month_key", monthKey)
        .limit(1);
      if (alreadySent?.length) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "This month closed without interruption.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("month_end_anchor_sent").insert({
          workspace_id: workspaceId,
          month_key: monthKey,
          sent_at: new Date().toISOString(),
        });
      }
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

/** Part 4: Thursday at 15:00 local, upcoming bookings in next 5 days → "Upcoming commitments remain arranged." */
export async function runPayrollSafetyWindow(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const now = new Date();
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";

    try {
      if (!isThursday1500(tz)) continue;

      const loc = getWorkspaceLocal(tz);
      const { data: alreadySent } = await db
        .from("payroll_safety_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", loc.date)
        .limit(1);
      if (alreadySent?.length) continue;

      const { count } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", now.toISOString())
        .lt("call_started_at", fiveDaysLater.toISOString());
      if ((count ?? 0) === 0) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "Upcoming commitments remain arranged.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("payroll_safety_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: loc.date,
          sent_at: new Date().toISOString(),
        });
      }
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

/** Part 5: 30 consecutive days with no escalation/delivery failure/progress_stalled/signal_unprocessable → send once per streak. */
export async function runLongSilenceConfidence(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const {
    getWorkspacesWith30DayStreak,
    markStreakEmailSent,
  } = await import("@/lib/operational-confidence-streak");

  const workspaceIds = await getWorkspacesWith30DayStreak();
  if (!workspaceIds.length) return results;

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id")
    .in("id", workspaceIds);
  if (!workspaces?.length) return results;

  for (const ws of workspaces as { id: string; owner_id: string }[]) {
    const workspaceId = ws.id;
    try {
      const { data: user } = await db.from("users").select("email").eq("id", ws.owner_id).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const subject = "Attestation";
      const text = "Record integrity is demonstrable.\nAttestation derives from record presence.\nConditions are normal.\n\nOpen: " + APP_URL + "/dashboard";
      const sent = await sendEmail(email, subject, text);
      if (sent) await markStreakEmailSent(workspaceId);
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
