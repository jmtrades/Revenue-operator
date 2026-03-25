/**
 * Multi-channel orchestration — channel types and policy.
 * No uncontrolled dispatching. Channel selection per intent, fallback, escalation, quiet hours.
 */

export const CHANNEL_TYPES = [
  "sms",
  "email",
  "whatsapp",
  "voice",
  "instagram_dm",
  "web_chat",
  "voicemail_drop",
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

export interface ChannelPolicy {
  primary_channel: ChannelType;
  fallback_channel: ChannelType | null;
  escalation_channel: ChannelType;
  quiet_hours_enforced: boolean;
  quiet_hours_tz?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface ChannelPolicyResolverInput {
  workspaceId: string;
  intentType: string;
  regionState?: string | null;
  compliancePackQuietHours?: { start: string; end: string; tz: string } | null;
}
