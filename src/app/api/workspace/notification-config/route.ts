/**
 * GET /api/workspace/notification-config — Slack/Teams config and channel prefs per notification type.
 * PATCH /api/workspace/notification-config — Update channel prefs; set Teams webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import {
  getWorkspaceSlackConfig,
  getWorkspaceTeamsConfig,
  getNotificationChannels,
  type NotificationType,
} from "@/lib/integrations/slack";
import { encrypt } from "@/lib/encryption";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

const NOTIFICATION_TYPES: NotificationType[] = [
  "new_lead",
  "call_summary",
  "daily_digest",
  "quality_alert",
  "appointment_reminder",
];

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const [slack, teams, channels] = await Promise.all([
    getWorkspaceSlackConfig(session.workspaceId),
    getWorkspaceTeamsConfig(session.workspaceId),
    getNotificationChannels(session.workspaceId),
  ]);

  const prefsByType: Record<string, { slack?: { channel_id: string; channel_name: string }; teams_enabled: boolean }> = {};
  for (const t of NOTIFICATION_TYPES) {
    const forType = channels.filter((c) => c.notification_type === t);
    const slackCh = forType.find((c) => c.provider === "slack" && c.slack_channel_id);
    prefsByType[t] = {
      slack: slackCh ? { channel_id: slackCh.slack_channel_id!, channel_name: slackCh.slack_channel_name ?? "" } : undefined,
      teams_enabled: forType.some((c) => c.provider === "teams"),
    };
  }

  return NextResponse.json({
    slack: slack ? { connected: true, team_id: slack.team_id, team_name: slack.team_name } : { connected: false },
    teams: teams ? { connected: teams.has_webhook } : { connected: false },
    channels: prefsByType,
  });
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErrPatch = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPatch) return authErrPatch;

  let body: {
    teams_webhook_url?: string;
    channels?: Record<string, { slack_channel_id?: string; slack_channel_name?: string; teams_enabled?: boolean }>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  if (typeof body.teams_webhook_url === "string") {
    const url = body.teams_webhook_url.trim();
    const enc = url ? await encrypt(url) : null;
    await db
      .from("workspace_teams_config")
      .upsert(
        {
          workspace_id: session.workspaceId,
          webhook_url_encrypted: enc,
          updated_at: now,
        },
        { onConflict: "workspace_id" }
      );
  }

  if (body.channels && typeof body.channels === "object") {
    for (const [notificationType, prefs] of Object.entries(body.channels)) {
      if (!NOTIFICATION_TYPES.includes(notificationType as NotificationType)) continue;
      const slackId = prefs?.slack_channel_id?.trim();
      const slackName = prefs?.slack_channel_name?.trim() ?? "";
      const teamsEnabled = Boolean(prefs?.teams_enabled);

      if (slackId) {
        await db
          .from("workspace_notification_channels")
          .upsert(
            {
              workspace_id: session.workspaceId,
              notification_type: notificationType,
              provider: "slack",
              slack_channel_id: slackId,
              slack_channel_name: slackName,
              enabled: true,
              updated_at: now,
            },
            { onConflict: "workspace_id,notification_type,provider" }
          );
      } else {
        await db
          .from("workspace_notification_channels")
          .delete()
          .eq("workspace_id", session.workspaceId)
          .eq("notification_type", notificationType)
          .eq("provider", "slack");
      }

      if (teamsEnabled) {
        await db
          .from("workspace_notification_channels")
          .upsert(
            {
              workspace_id: session.workspaceId,
              notification_type: notificationType,
              provider: "teams",
              slack_channel_id: null,
              slack_channel_name: null,
              enabled: true,
              updated_at: now,
            },
            { onConflict: "workspace_id,notification_type,provider" }
          );
      } else {
        await db
          .from("workspace_notification_channels")
          .delete()
          .eq("workspace_id", session.workspaceId)
          .eq("notification_type", notificationType)
          .eq("provider", "teams");
      }
    }
  }

  const [slack, teams, channels] = await Promise.all([
    getWorkspaceSlackConfig(session.workspaceId),
    getWorkspaceTeamsConfig(session.workspaceId),
    getNotificationChannels(session.workspaceId),
  ]);
  const prefsByType: Record<string, { slack?: { channel_id: string; channel_name: string }; teams_enabled: boolean }> = {};
  for (const t of NOTIFICATION_TYPES) {
    const forType = channels.filter((c) => c.notification_type === t);
    const slackCh = forType.find((c) => c.provider === "slack" && c.slack_channel_id);
    prefsByType[t] = {
      slack: slackCh ? { channel_id: slackCh.slack_channel_id!, channel_name: slackCh.slack_channel_name ?? "" } : undefined,
      teams_enabled: forType.some((c) => c.provider === "teams"),
    };
  }
  return NextResponse.json({
    slack: slack ? { connected: true, team_id: slack.team_id, team_name: slack.team_name } : { connected: false },
    teams: teams ? { connected: teams.has_webhook } : { connected: false },
    channels: prefsByType,
  });
}
