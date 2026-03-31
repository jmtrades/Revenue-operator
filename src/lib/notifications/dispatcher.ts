/**
 * Notification Dispatcher — Routes workspace events to Slack/Teams.
 * Non-blocking, fire-and-forget pattern. All errors are swallowed.
 */

import {
  getWorkspaceSlackConfig,
  getNotificationChannels,
  sendSlackMessage,
  type NotificationType,
} from "@/lib/integrations/slack";
import type { AutonomousActionType } from "@/lib/intelligence/autonomous-executor";

export type WorkspaceEventType = "autonomous_action" | "quality_alert" | "new_lead";

export interface WorkspaceEventPayload {
  autonomous_action?: {
    action: AutonomousActionType;
    leadName?: string;
    leadId: string;
    result: {
      success: boolean;
      details: string;
      confidence: number;
    };
  };
  quality_alert?: {
    leadName?: string;
    riskFlags: string[];
    leadId: string;
    details?: string;
  };
  new_lead?: {
    leadName?: string;
    leadId: string;
    source?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Map workspace event types to Slack notification types
 */
function mapEventToNotificationType(eventType: WorkspaceEventType): NotificationType {
  const mapping: Record<WorkspaceEventType, NotificationType> = {
    autonomous_action: "quality_alert",
    quality_alert: "quality_alert",
    new_lead: "new_lead",
  };
  return mapping[eventType];
}

/**
 * Format event payload into Slack blocks (Block Kit)
 */
function buildSlackBlocks(
  eventType: WorkspaceEventType,
  payload: WorkspaceEventPayload
): { text?: string; blocks: unknown[] } {
  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  if (eventType === "autonomous_action" && payload.autonomous_action) {
    const { action, leadName, result } = payload.autonomous_action;
    const statusEmoji = result.success ? ":white_check_mark:" : ":warning:";
    const text = `*Autonomous Action Executed*\n${statusEmoji} *Action*: ${action}\n*Lead*: ${leadName || "Unknown"}\n*Success*: ${result.success ? "Yes" : "No"}\n*Details*: ${result.details}\n*Confidence*: ${(result.confidence * 100).toFixed(0)}%\n_${now}_`;

    return {
      text: `Autonomous action: ${action}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
      ],
    };
  }

  if (eventType === "quality_alert" && payload.quality_alert) {
    const { leadName, riskFlags, details } = payload.quality_alert;
    const flagsStr = riskFlags.length > 0 ? riskFlags.join(", ") : "—";
    const text = `*Quality Alert*\n:exclamation: *Lead*: ${leadName || "Unknown"}\n*Risk Flags*: ${flagsStr}\n${details ? `*Details*: ${details}` : ""}\n_${now}_`;

    return {
      text: `Quality alert: ${leadName || "Unknown"}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
      ],
    };
  }

  if (eventType === "new_lead" && payload.new_lead) {
    const { leadName, source, phone, email } = payload.new_lead;
    const contactInfo = [
      phone ? `Phone: ${phone}` : null,
      email ? `Email: ${email}` : null,
    ]
      .filter(Boolean)
      .join(" • ");
    const sourceStr = source ? ` from ${source}` : "";
    const text = `*New Lead*\n:person_with_blond_hair: *Name*: ${leadName || "Unknown"}${sourceStr}\n${contactInfo ? `*Contact*: ${contactInfo}` : ""}\n_${now}_`;

    return {
      text: `New lead: ${leadName || "Unknown"}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
      ],
    };
  }

  return {
    text: `Event: ${eventType}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Event*: ${eventType}\n_${now}_`,
        },
      },
    ],
  };
}

/**
 * Main notification dispatcher: checks if Slack is connected, checks notification preferences,
 * and sends formatted messages (fire-and-forget, non-blocking).
 *
 * @param workspaceId - Workspace ID
 * @param eventType - Type of event (autonomous_action, quality_alert, new_lead)
 * @param payload - Event payload with data
 *
 * Non-blocking: all errors are swallowed, promise returned but not awaited by caller.
 */
export async function notifyWorkspace(
  workspaceId: string,
  eventType: WorkspaceEventType,
  payload: WorkspaceEventPayload
): Promise<void> {
  // Fire-and-forget: do not await and do not throw
  void dispatchNotification(workspaceId, eventType, payload).catch(() => {
    // Silently swallow all errors (logging would require explicit setup)
  });
}

/**
 * Internal: perform the actual notification dispatch.
 */
async function dispatchNotification(
  workspaceId: string,
  eventType: WorkspaceEventType,
  payload: WorkspaceEventPayload
): Promise<void> {
  try {
    // 1. Check if Slack is configured for workspace
    const slackConfig = await getWorkspaceSlackConfig(workspaceId);
    if (!slackConfig || !slackConfig.has_token) {
      return; // Slack not connected, skip
    }

    // 2. Map event type to notification preference type and check if enabled
    const notificationType = mapEventToNotificationType(eventType);
    const channels = await getNotificationChannels(workspaceId, notificationType);

    if (channels.length === 0) {
      return; // No channels configured for this notification type
    }

    // 3. Build Slack message blocks
    const message = buildSlackBlocks(eventType, payload);

    // 4. Send to all configured Slack channels (non-blocking per channel)
    for (const channel of channels) {
      if (channel.provider === "slack" && channel.slack_channel_id) {
        try {
          await sendSlackMessage(workspaceId, channel.slack_channel_id, message).catch(
            () => {
              // Non-blocking: skip this channel on error
            }
          );
        } catch {
          // Swallow error
        }
      }
    }
  } catch {
    // Swallow all errors — notifications should never break the main flow
  }
}
