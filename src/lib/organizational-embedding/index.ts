/**
 * Organizational embedding: expectation shaping via email and state.
 * - Silence defines completion: send "Nothing else requires review." when handoffs go to zero.
 * - Morning state: at 8:30am workspace local (weekdays), send one-line state.
 */

import { getDb } from "@/lib/db/queries";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@revenueoperator.ai>";

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
  });
  return res.ok;
}

/** Count active handoffs for a workspace (hold_until > now, holding_message_sent). */
async function getActiveHandoffCount(db: ReturnType<typeof getDb>, workspaceId: string): Promise<number> {
  const now = new Date().toISOString();
  const { count } = await db
    .from("escalation_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("holding_message_sent", true)
    .not("hold_until", "is", null)
    .gt("hold_until", now);
  return count ?? 0;
}

/** Part 2: When active handoffs go from >=1 to 0, send "Nothing else requires review." to owner only. */
export async function runSilenceDefinesCompletion(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: workspaces } = await db.from("workspaces").select("id, owner_id");
  if (!workspaces?.length) return results;

  for (const ws of workspaces as { id: string; owner_id: string }[]) {
    const workspaceId = ws.id;
    try {
      const current = await getActiveHandoffCount(db, workspaceId);

      const { data: stateRow } = await db
        .from("organizational_embedding_state")
        .select("last_active_handoff_count")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      const last = (stateRow as { last_active_handoff_count?: number } | null)?.last_active_handoff_count ?? 0;

      await db.from("organizational_embedding_state").upsert(
        {
          workspace_id: workspaceId,
          last_active_handoff_count: current,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );

      if (current === 0 && last > 0) {
        const { data: user } = await db.from("users").select("email").eq("id", ws.owner_id).maybeSingle();
        const email = (user as { email?: string } | null)?.email;
        if (email) {
          const sent = await sendEmail(email, "Nothing else requires review.", "Nothing else requires review.");
          results.push({ workspaceId, sent });
        } else {
          results.push({ workspaceId, sent: false });
        }
        await recordPostDecisionCalmPending(workspaceId);
      }
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

/** Part 2 (Operational Scheduling): When handoffs go to 0, record for post-decision calm (10 min later). */
export async function recordPostDecisionCalmPending(workspaceId: string): Promise<void> {
  const db = getDb();
  await db.from("post_decision_calm_pending").upsert(
    { workspace_id: workspaceId, zero_at: new Date().toISOString() },
    { onConflict: "workspace_id" }
  );
}

/** Get workspace local date (YYYY-MM-DD) and whether it's a weekday (1–5). */
function getWorkspaceLocalDate(timezone: string): { date: string; isWeekday: boolean } {
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
  return { date: `${year}-${month}-${day}`, isWeekday };
}

/** Check if it's 8:30am in the given timezone (narrow window so we send once when cron runs every 15 min). */
function is830Local(timezone: string): boolean {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [hour, minute] = formatter
    .format(new Date())
    .split(":")
    .map((n) => parseInt(n, 10));
  return hour === 8 && minute >= 30 && minute < 45;
}

/** Part 3: At 8:30am workspace local (weekdays), send one-line morning state. No counts, no links. */
export async function runMorningState(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";

    try {
      const { date: localDate, isWeekday } = getWorkspaceLocalDate(tz);
      if (!isWeekday) continue;
      if (!is830Local(tz)) continue;

      const { data: alreadySent } = await db
        .from("morning_state_sent")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);

      if (alreadySent?.length) continue;

      const activeCount = await getActiveHandoffCount(db, workspaceId);
      if (activeCount === 0) continue;

      const text = activeCount === 1 ? "A decision is ready." : "Today's decisions are ready.";

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const sent = await sendEmail(email, text, text);
      if (sent) {
        await db.from("morning_state_sent").insert({
          workspace_id: workspaceId,
          sent_at: new Date().toISOString(),
          sent_local_date: localDate,
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

/** Check if current time in timezone is after business hours end (e.g. "17:00"). */
function isAfterBusinessHours(timezone: string, endStr: string): boolean {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [hour, minute] = formatter
    .format(new Date())
    .split(":")
    .map((n) => parseInt(n, 10));
  const [endHour, endMin] = (endStr || "17:00").split(":").map((n) => parseInt(n, 10));
  return hour > endHour || (hour === endHour && minute >= endMin);
}

/** Part 2 (Operational Scheduling): After business hours, if conversations remain active, send "Everything else will continue." Once per day. */
export async function runAfterHoursStability(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_hours");
  if (!settingsRows?.length) return results;

  const now = new Date().toISOString();
  const activeStates = ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED"];

  for (const row of settingsRows as { workspace_id: string; business_hours?: { timezone?: string; end?: string } }[]) {
    const workspaceId = row.workspace_id;
    const tz = row.business_hours?.timezone ?? "UTC";
    const end = (row.business_hours as { end?: string })?.end ?? "17:00";

    try {
      const { date: localDate, isWeekday } = getWorkspaceLocalDate(tz);
      if (!isWeekday) continue;
      if (!isAfterBusinessHours(tz, end)) continue;

      const { data: alreadySent } = await db
        .from("after_hours_stability_sent")
        .select("workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (alreadySent?.length) continue;

      const { count } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("state", activeStates)
        .gte("last_activity_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if ((count ?? 0) === 0) continue;

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) continue;

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) continue;

      const sent = await sendEmail(email, "Everything else will continue.", "Everything else will continue.");
      if (sent) {
        await db.from("after_hours_stability_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: localDate,
          sent_at: now,
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

/** Part 4 (Operational Scheduling): 10 min after last handoff of day resolved, send "No further decisions today." Once per day. */
export async function runPostDecisionCalm(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  const { data: pendingRows } = await db
    .from("post_decision_calm_pending")
    .select("workspace_id, zero_at")
    .lte("zero_at", tenMinAgo);

  if (!pendingRows?.length) return results;

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_hours");
  const settingsMap = (settingsRows ?? []).reduce(
    (acc, r) => {
      acc[(r as { workspace_id: string }).workspace_id] = r as { business_hours?: { timezone?: string } };
      return acc;
    },
    {} as Record<string, { business_hours?: { timezone?: string } }>
  );

  for (const row of pendingRows as { workspace_id: string; zero_at: string }[]) {
    const workspaceId = row.workspace_id;
    try {
      const tz = settingsMap[workspaceId]?.business_hours?.timezone ?? "UTC";
      const { date: localDate } = getWorkspaceLocalDate(tz);

      const { data: alreadySent } = await db
        .from("no_further_decisions_sent")
        .select("workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (alreadySent?.length) {
        await db.from("post_decision_calm_pending").delete().eq("workspace_id", workspaceId);
        continue;
      }

      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (!ownerId) {
        await db.from("post_decision_calm_pending").delete().eq("workspace_id", workspaceId);
        continue;
      }

      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (!email) {
        await db.from("post_decision_calm_pending").delete().eq("workspace_id", workspaceId);
        continue;
      }

      const sent = await sendEmail(email, "No further decisions today.", "No further decisions today.");
      if (sent) {
        await db.from("no_further_decisions_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: localDate,
          sent_at: now.toISOString(),
        });
      }
      await db.from("post_decision_calm_pending").delete().eq("workspace_id", workspaceId);
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
