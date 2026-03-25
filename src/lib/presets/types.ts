/**
 * Preset system — vertical-based revenue receptionist config.
 * User never configures; preset is applied when business type is selected.
 */

import type { LeadState } from "@/lib/types";

/** Display names for pipeline stages (receptionist language, no tech) */
export const PIPELINE_STAGE_DISPLAY: Record<LeadState, string> = {
  NEW: "New Lead",
  CONTACTED: "Contacted",
  ENGAGED: "Engaged",
  QUALIFIED: "Qualified",
  BOOKED: "Booked",
  SHOWED: "Showed",
  WON: "Won",
  LOST: "No Show",
  RETAIN: "Retain",
  REACTIVATE: "Reactivation",
  CLOSED: "Closed",
};

/** Standard pipeline stage order for UI (booking-first) */
export const PIPELINE_STAGE_ORDER: LeadState[] = [
  "NEW",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "BOOKED",
  "SHOWED",
  "WON",
  "LOST",
  "REACTIVATE",
  "RETAIN",
  "CLOSED",
];

/** Automation keys — what the preset enables (user never configures) */
export type AutomationKey =
  | "instant_response"
  | "qualification_conversation"
  | "booking_link_delivery"
  | "reminder_24h"
  | "reminder_3h"
  | "no_show_recovery"
  | "review_request"
  | "reactivation_60_90d";

export interface PresetAutomation {
  key: AutomationKey;
  enabled: boolean;
  /** Delay in hours (e.g. 24 for reminder_24h) */
  delay_hours?: number;
  template_key?: string;
}

export interface RevenuePreset {
  id: string;
  name: string;
  /** Business type / vertical slug */
  business_type: string;
  pipeline_stages: LeadState[];
  automations: PresetAutomation[];
  /** Default sequence steps for followup (hours) */
  followup_delays_hours: number[];
  /** Default reminder steps before appointment (hours) */
  reminder_before_hours: number[];
  /** Reactivation window (days) */
  reactivation_days_min: number;
  reactivation_days_max: number;
}
