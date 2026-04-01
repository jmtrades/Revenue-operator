/**
 * Slack and Microsoft Teams notifications (Task 24).
 * OAuth for Slack; incoming webhook for Teams. Configurable per notification type and channel.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

const logSlackSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `slack.${ctx}`, { error: e instanceof Error ? e.message : String(e) });
};

export type NotificationType =
  | "new_lead"
  | "call_summary"
  | "daily_digest"
  | "quality_alert"
  | "appointment_reminder";

export interface WorkspaceSlackConfig {
  workspace_id: string;
  team_id: string | null;
  team_name: string | null;
  has_token: boolean;
}

export interface WorkspaceTeamsConfig {
  workspace_id: string;
  has_webhook: boolean;
}

export interface NotificationChannelPref {
  id: string;
  notification_type: NotificationType;
  provider: "slack" | "teams";
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  enabled: boolean;
}

async function getSlackToken(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_slack_config")
    .select("access_token_encrypted")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const enc = (data as { access_token_encrypted?: string | null } | null)?.access_token_encrypted?.trim();
  if (!enc) return null;
  try {
    const { decrypt } = await import("@/lib/encryption");
    return await decrypt(enc);
  } catch {
    return null;
  }
}

export async function getWorkspaceSlackConfig(workspaceId: string): Promise<WorkspaceSlackConfig | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_slack_config")
    .select("workspace_id, team_id, team_name, access_token_encrypted")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  const r = data as { workspace_id: string; team_id?: string | null; team_name?: string | null; access_token_encrypted?: string | null };
  return {
    workspace_id: r.workspace_id,
    team_id: r.team_id ?? null,
    team_name: r.team_name ?? null,
    has_token: Boolean(r.access_token_encrypted),
  };
}

export async function getWorkspaceTeamsConfig(workspaceId: string): Promise<WorkspaceTeamsConfig | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_teams_config")
    .select("workspace_id, webhook_url_encrypted")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  const r = data as { workspace_id: string; webhook_url_encrypted?: string | null };
  return {
    workspace_id: r.workspace_id,
    has_webhook: Boolean(r.webhook_url_encrypted),
  };
}

export async function getNotificationChannels(
  workspaceId: string,
  notificationType?: NotificationType
): Promise<NotificationChannelPref[]> {
  const db = getDb();
  let q = db
    .from("workspace_notification_channels")
    .select("id, notification_type, provider, slack_channel_id, slack_channel_name, enabled")
    .eq("workspace_id", workspaceId)
    .eq("enabled", true);
  if (notificationType) q = q.eq("notification_type", notificationType);
  const { data } = await q;
  const rows = (data ?? []) as {
    id: string;
    notification_type: string;
    provider: string;
    slack_channel_id: string | null;
    slack_channel_name: string | null;
    enabled: boolean;
  }[];
  return rows.map((row) => ({
    id: row.id,
    notification_type: row.notification_type as NotificationType,
    provider: row.provider as "slack" | "teams",
    slack_channel_id: row.slack_channel_id,
    slack_channel_name: row.slack_channel_name,
    enabled: row.enabled,
  }));
}

/** Post a message to a Slack channel. */
export async function sendSlackMessage(
  workspaceId: string,
  channelId: string,
  payload: { text?: string; blocks?: unknown[] }
): Promise<{ ok: boolean; error?: string }> {
  const token = await getSlackToken(workspaceId);
  if (!token) return { ok: false, error: "Slack not connected" };
  const body: { channel: string; text?: string; blocks?: unknown[] } = { channel: channelId };
  if (payload.blocks?.length) body.blocks = payload.blocks;
  if (payload.text) body.text = payload.text;
  else if (!body.blocks) body.text = "—";
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) return { ok: false, error: json.error ?? res.statusText };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Resolve Teams webhook URL for a workspace (default or per-type override). */
async function getTeamsWebhookForNotification(
  workspaceId: string,
  notificationType: NotificationType
): Promise<string | null> {
  const db = getDb();
  const { data: pref } = await db
    .from("workspace_notification_channels")
    .select("teams_webhook_url_encrypted")
    .eq("workspace_id", workspaceId)
    .eq("notification_type", notificationType)
    .eq("provider", "teams")
    .eq("enabled", true)
    .maybeSingle();
  if (pref && (pref as { teams_webhook_url_encrypted?: string | null }).teams_webhook_url_encrypted) {
    try {
      const { decrypt } = await import("@/lib/encryption");
      return await decrypt((pref as { teams_webhook_url_encrypted: string }).teams_webhook_url_encrypted);
    } catch {
      // fall through to workspace default
    }
  }
  const { data: cfg } = await db
    .from("workspace_teams_config")
    .select("webhook_url_encrypted")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const enc = (cfg as { webhook_url_encrypted?: string | null } | null)?.webhook_url_encrypted?.trim();
  if (!enc) return null;
  try {
    const { decrypt } = await import("@/lib/encryption");
    return await decrypt(enc);
  } catch {
    return null;
  }
}

/** Send a message to Microsoft Teams via incoming webhook (MessageCard). */
export async function sendTeamsMessage(
  webhookUrl: string,
  payload: { title: string; text: string; sections?: { title: string; facts: { name: string; value: string }[] }[] }
): Promise<{ ok: boolean; error?: string }> {
  const card = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: payload.title,
    themeColor: "2C2C2C",
    title: payload.title,
    text: payload.text,
    sections: payload.sections?.map((s) => ({
      activityTitle: s.title,
      facts: s.facts.map((f) => ({ name: f.name, value: f.value })),
    })),
  };
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    if (!res.ok) return { ok: false, error: res.statusText };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function slackBlockSection(text: string): unknown {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function slackBlockActions(buttons: { text: string; url: string }[]): unknown {
  return {
    type: "actions",
    elements: buttons.map((b) => ({ type: "button", text: { type: "plain_text", text: b.text }, url: b.url })),
  };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/** Dispatch new_lead notifications to all configured Slack/Teams channels. */
export async function notifyNewLead(
  workspaceId: string,
  payload: { lead_id: string; name?: string | null; phone?: string | null; email?: string | null }
): Promise<void> {
  const channels = await getNotificationChannels(workspaceId, "new_lead");
  const leadUrl = APP_URL ? `${APP_URL.replace(/\/$/, "")}/app/leads?lead=${payload.lead_id}` : "";
  const text = `*New lead*: ${(payload.name || "Unknown").toString().trim()}${payload.phone ? ` • ${payload.phone}` : ""}${payload.email ? ` • ${payload.email}` : ""}`;
  for (const ch of channels) {
    if (ch.provider === "slack" && ch.slack_channel_id) {
      const blocks: unknown[] = [
        slackBlockSection(text),
        ...(leadUrl ? [slackBlockActions([{ text: "View lead", url: leadUrl }])] : []),
      ];
      await sendSlackMessage(workspaceId, ch.slack_channel_id, { text, blocks }).catch(logSlackSideEffect("send_slack_new_lead"));
    } else if (ch.provider === "teams") {
      const url = await getTeamsWebhookForNotification(workspaceId, "new_lead");
      if (url)
        await sendTeamsMessage(url, {
          title: "New lead",
          text: `${(payload.name || "Unknown").toString().trim()}${payload.phone ? ` • ${payload.phone}` : ""}${payload.email ? ` • ${payload.email}` : ""}`,
          sections: leadUrl ? [{ title: "Quick action", facts: [{ name: "Link", value: leadUrl }] }] : undefined,
        }).catch(logSlackSideEffect("send_teams_new_lead"));
    }
  }
}

/** Dispatch call_summary notifications. */
export async function notifyCallSummary(
  workspaceId: string,
  payload: {
    call_session_id: string;
    lead_name?: string | null;
    caller_phone?: string | null;
    outcome?: string | null;
    summary?: string | null;
    duration_seconds?: number | null;
  }
): Promise<void> {
  const channels = await getNotificationChannels(workspaceId, "call_summary");
  const callUrl = APP_URL ? `${APP_URL.replace(/\/$/, "")}/app/calls?call=${payload.call_session_id}` : "";
  const duration = payload.duration_seconds != null ? `${Math.round(payload.duration_seconds / 60)}m` : "—";
  const summaryLine = (payload.summary || "No summary").toString().slice(0, 300);
  for (const ch of channels) {
    if (ch.provider === "slack" && ch.slack_channel_id) {
      const blocks: unknown[] = [
        slackBlockSection(`*Call completed*\n• *Contact*: ${(payload.lead_name || payload.caller_phone || "Unknown").toString().trim()}\n• *Outcome*: ${(payload.outcome || "—").toString()}\n• *Duration*: ${duration}\n• *Summary*: ${summaryLine}`),
        ...(callUrl ? [slackBlockActions([{ text: "View call", url: callUrl }])] : []),
      ];
      await sendSlackMessage(workspaceId, ch.slack_channel_id, { text: `Call: ${payload.lead_name || payload.caller_phone}`, blocks }).catch(logSlackSideEffect("send_slack_call_summary"));
    } else if (ch.provider === "teams") {
      const url = await getTeamsWebhookForNotification(workspaceId, "call_summary");
      if (url)
        await sendTeamsMessage(url, {
          title: "Call completed",
          text: summaryLine,
          sections: [
            { title: "Details", facts: [
              { name: "Contact", value: (payload.lead_name || payload.caller_phone || "Unknown").toString() },
              { name: "Outcome", value: (payload.outcome || "—").toString() },
              { name: "Duration", value: duration },
              ...(callUrl ? [{ name: "Link", value: callUrl }] : []),
            ] },
          ],
        }).catch(logSlackSideEffect("send_teams_call_summary"));
    }
  }
}

/** Dispatch daily_digest (cron). */
export async function notifyDailyDigest(
  workspaceId: string,
  payload: { calls_today: number; leads_today: number; appointments_today: number; message: string }
): Promise<void> {
  const channels = await getNotificationChannels(workspaceId, "daily_digest");
  const text = `*Daily digest*\n${payload.message}\n• Calls: ${payload.calls_today}\n• New leads: ${payload.leads_today}\n• Appointments: ${payload.appointments_today}`;
  for (const ch of channels) {
    if (ch.provider === "slack" && ch.slack_channel_id) {
      await sendSlackMessage(workspaceId, ch.slack_channel_id, { text, blocks: [slackBlockSection(text)] }).catch(logSlackSideEffect("send_slack_daily_digest"));
    } else if (ch.provider === "teams") {
      const url = await getTeamsWebhookForNotification(workspaceId, "daily_digest");
      if (url)
        await sendTeamsMessage(url, {
          title: "Daily digest",
          text: payload.message,
          sections: [{ title: "Today", facts: [
            { name: "Calls", value: String(payload.calls_today) },
            { name: "New leads", value: String(payload.leads_today) },
            { name: "Appointments", value: String(payload.appointments_today) },
          ] }],
        }).catch(logSlackSideEffect("send_teams_daily_digest"));
    }
  }
}

/** Dispatch quality_alert (flagged / low-quality call). */
export async function notifyQualityAlert(
  workspaceId: string,
  payload: { call_session_id: string; reason: string; summary?: string | null }
): Promise<void> {
  const channels = await getNotificationChannels(workspaceId, "quality_alert");
  const callUrl = APP_URL ? `${APP_URL.replace(/\/$/, "")}/app/calls?call=${payload.call_session_id}` : "";
  for (const ch of channels) {
    if (ch.provider === "slack" && ch.slack_channel_id) {
      const blocks: unknown[] = [
        slackBlockSection(`*Quality alert*\n• *Reason*: ${payload.reason}\n${payload.summary ? `• *Summary*: ${payload.summary.slice(0, 200)}` : ""}`),
        ...(callUrl ? [slackBlockActions([{ text: "Review call", url: callUrl }])] : []),
      ];
      await sendSlackMessage(workspaceId, ch.slack_channel_id, { text: `Quality alert: ${payload.reason}`, blocks }).catch(logSlackSideEffect("send_slack_quality_alert"));
    } else if (ch.provider === "teams") {
      const url = await getTeamsWebhookForNotification(workspaceId, "quality_alert");
      if (url)
        await sendTeamsMessage(url, {
          title: "Quality alert",
          text: payload.reason,
          sections: [{ title: "Details", facts: [{ name: "Summary", value: (payload.summary || "").slice(0, 200) }, ...(callUrl ? [{ name: "Link", value: callUrl }] : [])] }],
        }).catch(logSlackSideEffect("send_teams_quality_alert"));
    }
  }
}

/** Dispatch appointment_reminder (upcoming appointment). */
export async function notifyAppointmentReminder(
  workspaceId: string,
  payload: { appointment_id: string; lead_name?: string | null; title: string; start_time: string }
): Promise<void> {
  const channels = await getNotificationChannels(workspaceId, "appointment_reminder");
  const apptUrl = APP_URL ? `${APP_URL.replace(/\/$/, "")}/app/calendar` : "";
  const time = new Date(payload.start_time).toLocaleString();
  for (const ch of channels) {
    if (ch.provider === "slack" && ch.slack_channel_id) {
      const blocks: unknown[] = [
        slackBlockSection(`*Appointment reminder*\n• *With*: ${(payload.lead_name || "Contact").toString()}\n• *When*: ${time}\n• *Title*: ${payload.title}`),
        ...(apptUrl ? [slackBlockActions([{ text: "View calendar", url: apptUrl }])] : []),
      ];
      await sendSlackMessage(workspaceId, ch.slack_channel_id, { text: `Appointment: ${payload.title} at ${time}`, blocks }).catch(logSlackSideEffect("send_slack_appointment_reminder"));
    } else if (ch.provider === "teams") {
      const url = await getTeamsWebhookForNotification(workspaceId, "appointment_reminder");
      if (url)
        await sendTeamsMessage(url, {
          title: "Appointment reminder",
          text: `${payload.title} — ${(payload.lead_name || "Contact").toString()} at ${time}`,
          sections: apptUrl ? [{ title: "Link", facts: [{ name: "Calendar", value: apptUrl }] }] : undefined,
        }).catch(logSlackSideEffect("send_teams_appointment_reminder"));
    }
  }
}

/** Fetch Slack channels list for channel selector (requires chat:read scope). */
export async function getSlackChannelsList(workspaceId: string): Promise<{ id: string; name: string }[] | { error: string }> {
  const token = await getSlackToken(workspaceId);
  if (!token) return { error: "Slack not connected" };
  try {
    const res = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as { ok?: boolean; channels?: { id: string; name: string }[]; error?: string };
    if (!res.ok || !json.ok) return { error: json.error ?? res.statusText };
    const list = (json.channels ?? []).map((c) => ({ id: c.id, name: c.name }));
    return list;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
