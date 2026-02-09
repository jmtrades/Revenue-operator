/**
 * Autopilot Policy Engine
 * Allowed actions per state, business hours, VIP exclusion, forbidden phrases.
 * Never blocks—always chooses a safe fallback.
 */

import type { LeadState } from "@/lib/types";
import { ALLOWED_ACTIONS_BY_STATE } from "@/lib/types";

export type RiskLevel = "safe" | "balanced" | "aggressive";

export interface WorkspaceSettings {
  risk_level: RiskLevel;
  business_hours: { start: string; end: string; timezone: string; days: number[] };
  forbidden_phrases: string[];
  vip_rules: { exclude_from_messaging?: boolean; exclude_from_calls?: boolean; domains?: string[] };
  opt_out_keywords: string[];
  safe_fallback_action: string;
  min_message_interval_sec?: number;
  max_messages_per_day?: number;
}

const DEFAULT_SETTINGS: WorkspaceSettings = {
  risk_level: "balanced",
  business_hours: { start: "09:00", end: "17:00", timezone: "UTC", days: [1, 2, 3, 4, 5] },
  forbidden_phrases: [],
  vip_rules: { exclude_from_messaging: false, exclude_from_calls: false, domains: [] },
  opt_out_keywords: ["stop", "unsubscribe", "opt out"],
  safe_fallback_action: "clarifying_question",
  min_message_interval_sec: 300,
  max_messages_per_day: 3,
};

export function mergeSettings(partial?: Partial<WorkspaceSettings> | null): WorkspaceSettings {
  if (!partial) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    business_hours: { ...DEFAULT_SETTINGS.business_hours, ...partial.business_hours },
    vip_rules: { ...DEFAULT_SETTINGS.vip_rules, ...partial.vip_rules },
  };
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  safeFallback: string;
}

/** Check if we're within business hours. */
export function isWithinBusinessHours(settings: WorkspaceSettings): boolean {
  const { start, end, timezone, days } = settings.business_hours;
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const t = `${hour}:${minute}`;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayStr = dayFormatter.format(now).slice(0, 3);
  const day = dayMap[dayStr] ?? 0;
  if (!days.includes(day)) return false;
  return t >= start && t <= end;
}

/** Check if lead is VIP (excluded from messaging/calls). */
export function isVipExcluded(lead: { is_vip?: boolean; company?: string }, settings: WorkspaceSettings): boolean {
  if (lead.is_vip) return true;
  const domains = settings.vip_rules.domains ?? [];
  if (!lead.company) return false;
  const domain = lead.company.toLowerCase().replace(/.*@/, "").split(" ")[0];
  return domains.some((d) => domain.includes(d.toLowerCase()));
}

/** Check if message contains forbidden phrase. */
export function containsForbiddenPhrase(text: string, settings: WorkspaceSettings): boolean {
  const phrases = settings.forbidden_phrases ?? [];
  const lower = text.toLowerCase();
  return phrases.some((p) => lower.includes(p.toLowerCase()));
}

/** Check if message is opt-out. */
export function isOptOut(text: string, settings: WorkspaceSettings): boolean {
  const keywords = settings.opt_out_keywords ?? [];
  const lower = text.toLowerCase().trim();
  return keywords.some((k) => lower.includes(k));
}

/** Get safe fallback action when primary is blocked. */
export function getSafeFallback(settings: WorkspaceSettings, allowedActions: string[]): string {
  const fallback = settings.safe_fallback_action;
  if (fallback === "clarifying_question" && allowedActions.length > 0) return allowedActions[0];
  if (fallback === "book_cta") return "booking";
  return "clarifying_question";
}

/** Full policy check before sending. */
export function checkPolicy(
  lead: { is_vip?: boolean; company?: string; opt_out?: boolean },
  proposedText: string,
  action: string,
  settings: WorkspaceSettings,
  state: LeadState
): PolicyCheckResult {
  const allowedActions = ALLOWED_ACTIONS_BY_STATE[state] ?? [];
  const safeFallback = getSafeFallback(settings, allowedActions);

  if (lead.opt_out) return { allowed: false, reason: "opt_out", safeFallback };
  if (settings.vip_rules.exclude_from_messaging && isVipExcluded(lead, settings)) {
    return { allowed: false, reason: "vip_excluded", safeFallback };
  }
  if (containsForbiddenPhrase(proposedText, settings)) {
    return { allowed: false, reason: "forbidden_phrase", safeFallback };
  }
  if (isOptOut(proposedText, settings)) return { allowed: false, reason: "opt_out", safeFallback };
  if (!isWithinBusinessHours(settings)) {
    return { allowed: false, reason: "outside_hours", safeFallback };
  }
  return { allowed: true, safeFallback };
}

/** Stage-based max per day. */
export const STAGE_LIMITS: Record<string, number> = {
  NEW: 2,
  CONTACTED: 2,
  ENGAGED: 4,
  QUALIFIED: 4,
  BOOKED: 6,
  SHOWED: 4,
  WON: 2,
  LOST: 1,
  RETAIN: 2,
  REACTIVATE: 1,
  CLOSED: 0,
};

/** Progressive cooldown ladder (seconds). */
export const COOLDOWN_LADDER = [300, 7200, 64800, 172800]; // 5min, 2h, 18h, 48h

export function getCooldownSeconds(attemptCount: number): number {
  if (attemptCount <= 1) return 0;
  const idx = Math.min(attemptCount - 2, COOLDOWN_LADDER.length - 1);
  return COOLDOWN_LADDER[Math.max(0, idx)];
}

export function passesCooldownLadder(
  lastOutboundAt: Date | null,
  attemptCount: number
): boolean {
  if (!lastOutboundAt) return true;
  const required = getCooldownSeconds(attemptCount);
  const elapsed = (Date.now() - lastOutboundAt.getTime()) / 1000;
  return elapsed >= required;
}

export function passesStageLimit(state: LeadState, countToday: number): boolean {
  const max = STAGE_LIMITS[state] ?? 2;
  return countToday < max;
}

/** Legacy: check cooldown (uses fixed interval). */
export function passesCooldown(lastOutboundAt: Date | null, settings: WorkspaceSettings): boolean {
  const interval = settings.min_message_interval_sec ?? 300;
  if (!lastOutboundAt) return true;
  return (Date.now() - lastOutboundAt.getTime()) / 1000 >= interval;
}

/** Legacy: max per day (deprecated in favor of passesStageLimit). */
export function passesMaxFrequency(countToday: number, settings: WorkspaceSettings): boolean {
  const max = settings.max_messages_per_day ?? 3;
  return countToday < max;
}
