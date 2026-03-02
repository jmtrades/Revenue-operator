/**
 * Coordination semantics: operator determines WHEN humans act.
 * No dashboards, notification spam, tasks, or urgency language.
 * Human override absorption: suppress signals when humans have already acted.
 */

import { getDb } from "@/lib/db/queries";
import {
  allActiveHandoffsTouchedInLastMinutes,
  everyPendingHandoffHasHumanActivityAfter,
  leadHasHumanMessageInLastMinutes,
} from "@/lib/human-override/human-activity";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@revenue-operator.com>";

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
  });
  return res.ok;
}

function getWorkspaceLocal(timezone: string): { date: string; weekday: string; hour: number; minute: number } {
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
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = get("weekday");
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  return { date, weekday, hour, minute };
}

function isTimeWindow(timezone: string, hour: number, minStart: number, minEnd: number): boolean {
  const loc = getWorkspaceLocal(timezone);
  return loc.hour === hour && loc.minute >= minStart && loc.minute < minEnd;
}

function isStartOfBusiness(timezone: string, startStr: string): boolean {
  const [startHour, startMin] = (startStr || "09:00").split(":").map((n) => parseInt(n, 10));
  const loc = getWorkspaceLocal(timezone);
  return loc.hour === startHour && loc.minute >= startMin && loc.minute < startMin + 15;
}

function isMidday(timezone: string): boolean {
  return isTimeWindow(timezone, 12, 0, 15);
}

function isBusinessClose(timezone: string, endStr: string): boolean {
  const [endHour, endMin] = (endStr || "17:00").split(":").map((n) => parseInt(n, 10));
  const loc = getWorkspaceLocal(timezone);
  return loc.hour === endHour && loc.minute >= endMin && loc.minute < endMin + 15;
}

async function getActiveHandoffCount(db: ReturnType<typeof getDb>, workspaceId: string): Promise<number> {
  const now = new Date().toISOString();
  const { count } = await db
    .from("escalation_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("holding_message_sent", true)
    .eq("resolved_by_human_pre_notice", false)
    .not("hold_until", "is", null)
    .gt("hold_until", now);
  return count ?? 0;
}

/** Part 1: At start of business hours, if handoffs exist → "Items are ready." */
export async function runStartOfWorkWindow(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string; start?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";
    const start = (row.business_hours as { start?: string })?.start ?? "09:00";

    try {
      const loc = getWorkspaceLocal(tz);
      if (loc.weekday === "Sat" || loc.weekday === "Sun") continue;
      if (!isStartOfBusiness(tz, start)) continue;

      const { data: alreadySent } = await db
        .from("start_of_work_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", loc.date)
        .limit(1);
      if (alreadySent?.length) continue;

      const count = await getActiveHandoffCount(db, workspaceId);
      if (count === 0) continue;

      if (await allActiveHandoffsTouchedInLastMinutes(workspaceId, 15)) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).single();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "Items are ready.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("start_of_work_sent").insert({
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

/** Part 2: At local midday, if handoffs still exist → "Pending decisions remain." */
export async function runMiddayClarityWindow(): Promise<
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
      const loc = getWorkspaceLocal(tz);
      if (loc.weekday === "Sat" || loc.weekday === "Sun") continue;
      if (!isMidday(tz)) continue;

      const { data: alreadySent } = await db
        .from("midday_clarity_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", loc.date)
        .limit(1);
      if (alreadySent?.length) continue;

      const count = await getActiveHandoffCount(db, workspaceId);
      if (count === 0) continue;

      if (await everyPendingHandoffHasHumanActivityAfter(workspaceId)) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).single();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "Pending decisions remain.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("midday_clarity_sent").insert({
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

function formatIsoDateInTz(isoString: string, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(isoString));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Part 3: 30 minutes before first booking of the day → "Preparation will be useful shortly." */
export async function runPreCallPreparationWindow(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const now = new Date();

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  const _dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dayEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";

    try {
      const loc = getWorkspaceLocal(tz);
      const { data: alreadySent } = await db
        .from("pre_call_prep_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", loc.date)
        .limit(1);
      if (alreadySent?.length) continue;

      const { data: sessions } = await db
        .from("call_sessions")
        .select("id, call_started_at, lead_id")
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", now.toISOString())
        .lt("call_started_at", dayEnd)
        .order("call_started_at", { ascending: true })
        .limit(10);

      const todaySessions = (sessions ?? []).filter(
        (s) => (s as { call_started_at?: string }).call_started_at && formatIsoDateInTz((s as { call_started_at: string }).call_started_at, tz) === loc.date
      );
      const first = todaySessions[0] as { call_started_at: string; lead_id?: string } | undefined;
      if (!first?.call_started_at) continue;

      const firstLeadId = first.lead_id;
      if (firstLeadId && (await leadHasHumanMessageInLastMinutes(firstLeadId, 10))) continue;

      const firstAt = new Date(first.call_started_at).getTime();
      const thirtyBefore = firstAt - 30 * 60 * 1000;
      const windowEnd = thirtyBefore + 15 * 60 * 1000;
      const nowMs = now.getTime();
      if (nowMs < thirtyBefore || nowMs >= windowEnd) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).single();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const text = "Preparation will be useful shortly.";
      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("pre_call_prep_sent").insert({
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

/** Part 5: At business close, if no pending handoffs → "Nothing further today." or "All set." if no coordination signal sent today. */
export async function runWorkdayCompletionSignal(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const _now = new Date().toISOString();

  const { data: settingsRows } = await db.from("settings").select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string; end?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";
    const end = (row.business_hours as { end?: string })?.end ?? "17:00";

    try {
      const loc = getWorkspaceLocal(tz);
      if (loc.weekday === "Sat" || loc.weekday === "Sun") continue;
      if (!isBusinessClose(tz, end)) continue;

      const count = await getActiveHandoffCount(db, workspaceId);
      if (count > 0) continue;

      const [{ data: workdaySent }, { data: allSetSent }, { data: startSent }, { data: middaySent }, { data: preCallSent }] = await Promise.all([
        db.from("workday_completion_sent").select("id").eq("workspace_id", workspaceId).eq("sent_local_date", loc.date).limit(1),
        db.from("all_set_sent").select("id").eq("workspace_id", workspaceId).eq("sent_local_date", loc.date).limit(1),
        db.from("start_of_work_sent").select("id").eq("workspace_id", workspaceId).eq("sent_local_date", loc.date).limit(1),
        db.from("midday_clarity_sent").select("id").eq("workspace_id", workspaceId).eq("sent_local_date", loc.date).limit(1),
        db.from("pre_call_prep_sent").select("id").eq("workspace_id", workspaceId).eq("sent_local_date", loc.date).limit(1),
      ]);
      if (workdaySent?.length || allSetSent?.length) continue;

      const anyCoordinationSent = (startSent?.length ?? 0) > 0 || (middaySent?.length ?? 0) > 0 || (preCallSent?.length ?? 0) > 0;
      const text = anyCoordinationSent ? "Nothing further today." : "All set.";
      const table = anyCoordinationSent ? "workday_completion_sent" : "all_set_sent";

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).single();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from(table).insert({
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
