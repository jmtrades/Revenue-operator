/**
 * Built-in revenue receptionist presets.
 * One preset per vertical; applied automatically when business type is selected.
 */

import type { RevenuePreset } from "./types";

/** Default preset: applies when no vertical selected or generic business */
export const DEFAULT_PRESET: RevenuePreset = {
  id: "default",
  name: "Revenue receptionist",
  business_type: "general",
  pipeline_stages: ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED", "WON", "LOST", "REACTIVATE", "RETAIN", "CLOSED"],
  automations: [
    { key: "instant_response", enabled: true },
    { key: "qualification_conversation", enabled: true },
    { key: "booking_link_delivery", enabled: true },
    { key: "reminder_24h", enabled: true, delay_hours: 24, template_key: "reminder_1" },
    { key: "reminder_3h", enabled: true, delay_hours: 3, template_key: "reminder_2" },
    { key: "no_show_recovery", enabled: true, delay_hours: 2, template_key: "no_show_recovery" },
    { key: "review_request", enabled: true, delay_hours: 24, template_key: "review_request" },
    { key: "reactivation_60_90d", enabled: true },
  ],
  followup_delays_hours: [4, 24, 72],
  reminder_before_hours: [24, 3],
  reactivation_days_min: 60,
  reactivation_days_max: 90,
};

/** Vertical presets — same structure, vertical-specific defaults later */
export const VERTICAL_PRESETS: Record<string, RevenuePreset> = {
  general: DEFAULT_PRESET,
  salon: { ...DEFAULT_PRESET, id: "salon", name: "Salon & beauty", business_type: "salon" },
  consulting: { ...DEFAULT_PRESET, id: "consulting", name: "Consulting", business_type: "consulting" },
  fitness: { ...DEFAULT_PRESET, id: "fitness", name: "Fitness & wellness", business_type: "fitness" },
  healthcare: { ...DEFAULT_PRESET, id: "healthcare", name: "Healthcare", business_type: "healthcare" },
  legal: { ...DEFAULT_PRESET, id: "legal", name: "Legal", business_type: "legal" },
  real_estate: { ...DEFAULT_PRESET, id: "real_estate", name: "Real estate", business_type: "real_estate" },
  other: DEFAULT_PRESET,
};

export function getPresetForBusinessType(businessType: string | null | undefined): RevenuePreset {
  if (!businessType || !businessType.trim()) return DEFAULT_PRESET;
  const key = businessType.trim().toLowerCase().replace(/\s+/g, "_");
  return VERTICAL_PRESETS[key] ?? DEFAULT_PRESET;
}

export function listBusinessTypes(): { value: string; label: string }[] {
  return [
    { value: "general", label: "General" },
    { value: "salon", label: "Salon & beauty" },
    { value: "consulting", label: "Consulting" },
    { value: "fitness", label: "Fitness & wellness" },
    { value: "healthcare", label: "Healthcare" },
    { value: "legal", label: "Legal" },
    { value: "real_estate", label: "Real estate" },
    { value: "other", label: "Other" },
  ];
}
