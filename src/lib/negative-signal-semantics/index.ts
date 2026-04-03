/**
 * Negative signal semantics: absence of communication conveys state.
 * No dashboards, settings, logs, or indicators — only passive coordination signals.
 */

import { getDb } from "@/lib/db/queries";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
      signal: AbortSignal.timeout(10_000),
  });
  return res.ok;
}

function getWorkspaceLocalDate(timezone: string): { date: string; isWeekday: boolean; weekday: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  return { date: `${year}-${month}-${day}`, isWeekday, weekday };
}

function formatIsoDateInTz(isoString: string, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(isoString));
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function isTimeWindowLocal(timezone: string, hour: number, minuteStart: number, minuteEnd: number): boolean {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [h, m] = formatter.format(new Date()).split(":").map((n) => parseInt(n, 10));
  return h === hour && m >= minuteStart && m < minuteEnd;
}

function isOneHourBeforeClose(timezone: string, endStr: string): boolean {
  const [endHour, _endMin] = (endStr || "17:00").split(":").map((n) => parseInt(n, 10));
  const oneHourBefore = endHour - 1;
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [h, m] = formatter.format(new Date()).split(":").map((n) => parseInt(n, 10));
  return h === (oneHourBefore < 0 ? 23 : oneHourBefore) && m >= 0 && m < 30;
}

function isClosePlus30(timezone: string, endStr: string): boolean {
  const [endHour, _endMin] = (endStr || "17:00").split(":").map((n) => parseInt(n, 10));
  let close30Min = _endMin + 30;
  let close30Hour = endHour;
  if (close30Min >= 60) {
    close30Min -= 60;
    close30Hour += 1;
  }
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [h, m] = formatter.format(new Date()).split(":").map((n) => parseInt(n, 10));
  return h === close30Hour && m >= close30Min && m < close30Min + 15;
}

/** Part 1: If no morning-state email was sent by 11:30 local and zero handoffs since midnight → "No decisions waiting." */
export async function runMorningAbsence(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";

    try {
      const { date: localDate, isWeekday } = getWorkspaceLocalDate(tz);
      if (!isWeekday) continue;
      if (!isTimeWindowLocal(tz, 11, 30, 45)) continue;

      const { data: morningSent } = await db
        .from("morning_state_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (morningSent?.length) continue;

      const { data: handoffRows } = await db
        .from("escalation_logs")
        .select("id, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", twentyFourHoursAgo);

      const handoffsToday = (handoffRows ?? []).filter(
        (r) => formatIsoDateInTz((r as { created_at: string }).created_at, tz) === localDate
      );
      if (handoffsToday.length > 0) continue;

      const { data: alreadySent } = await db
        .from("morning_absence_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (alreadySent?.length) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "No decisions waiting.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("morning_absence_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: localDate,
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

/** Part 2: 1h before business close, at least one booking today and no booking-shortly sent → "All upcoming attendance remains arranged." */
export async function runBookingQuietGuarantee(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  const now = new Date();

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string; end?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";
    const end = (row.business_hours as { end?: string })?.end ?? "17:00";

    try {
      const { date: localDate, isWeekday } = getWorkspaceLocalDate(tz);
      if (!isWeekday) continue;
      if (!isOneHourBeforeClose(tz, end)) continue;

      const { data: shortlySent } = await db
        .from("booking_shortly_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (shortlySent?.length) continue;

      const { data: alreadySent } = await db
        .from("booking_quiet_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (alreadySent?.length) continue;

      const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const dayEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions } = await db
        .from("call_sessions")
        .select("id, call_started_at")
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", dayStart)
        .lt("call_started_at", dayEnd);
      const bookingsToday = (sessions ?? []).filter(
        (s) => (s as { call_started_at?: string }).call_started_at && formatIsoDateInTz((s as { call_started_at: string }).call_started_at, tz) === localDate
      );
      if (bookingsToday.length === 0) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "All upcoming attendance remains arranged.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("booking_quiet_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: localDate,
          sent_at: now.toISOString(),
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

/** Part 3: At business close + 30 min, if no unresolved handoffs → "Everything concluded for today." */
export async function runDailyCompletionConfirmation(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const now = new Date().toISOString();

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string; end?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";
    const end = (row.business_hours as { end?: string })?.end ?? "17:00";

    try {
      const { date: localDate, isWeekday } = getWorkspaceLocalDate(tz);
      if (!isWeekday) continue;
      if (!isClosePlus30(tz, end)) continue;

      const { count } = await db
        .from("escalation_logs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("holding_message_sent", true)
        .not("hold_until", "is", null)
        .gt("hold_until", now);
      if ((count ?? 0) > 0) continue;

      const { data: alreadySent } = await db
        .from("daily_completion_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (alreadySent?.length) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "Everything concluded for today.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("daily_completion_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: localDate,
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

/** Part 4: If system health fails or queues stall >10 min → "Handling may be interrupted." Once per incident. */
export async function runInterruptionSignal(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, status");
  if (!workspaces?.length) return results;

  const stalledPayloadWorkspaceIds = new Set<string>();
  const { data: stalledJobs } = await db
    .from("job_queue")
    .select("id, payload, created_at")
    .eq("status", "pending")
    .lt("created_at", tenMinAgo);
  for (const j of stalledJobs ?? []) {
    const p = (j as { payload?: { workspace_id?: string; workspaceId?: string } }).payload;
    const wid = p?.workspace_id ?? p?.workspaceId;
    if (wid) stalledPayloadWorkspaceIds.add(wid);
  }

  for (const ws of workspaces as { id: string; owner_id: string; status?: string }[]) {
    const workspaceId = ws.id;
    try {
      const healthFailed = ws.status === "paused" || ws.status === "expired";
      const queueStalled = stalledPayloadWorkspaceIds.has(workspaceId);
      if (!healthFailed && !queueStalled) continue;

      const incidentAt = tenMinAgo;
      const { data: alreadySent } = await db
        .from("interruption_signal_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("incident_detected_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
        .limit(1);
      if (alreadySent?.length) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ws.owner_id).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "Handling may be interrupted.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("interruption_signal_sent").insert({
          workspace_id: workspaceId,
          incident_detected_at: incidentAt,
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

/** Part 5: Saturday 10:00 local, if upcoming bookings next week → "Next week is prepared." */
export async function runWeekendState(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  const now = new Date();
  const nextWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";

    try {
      const { date: localDate, weekday } = getWorkspaceLocalDate(tz);
      if (weekday !== "Sat") continue;
      if (!isTimeWindowLocal(tz, 10, 0, 15)) continue;

      const { data: alreadySent } = await db
        .from("weekend_prepared_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (alreadySent?.length) continue;

      const { count } = await db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", now.toISOString())
        .lt("call_started_at", nextWeekEnd.toISOString());
      if ((count ?? 0) === 0) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "Next week is prepared.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("weekend_prepared_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: localDate,
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
