/**
 * Revenue Lifecycle — 6 financial control layers
 * Recall-Touch is a Revenue Operator: every feature maps to one of these layers.
 * No technical language; used for dashboard, reporting, and product logic.
 */

import type { LeadState } from "@/lib/types";

/** Layer IDs match the Revenue Operating System model */
export const REVENUE_LAYERS = [
  "CAPTURE",   // 1 — Attention → Lead
  "CONVERT",   // 2 — Lead → Booking
  "SECURE",    // 3 — Booking → Show-up
  "RECOVER",   // 4 — Lost → Revived
  "RETAIN",    // 5 — Customer → Repeat
  "EXPAND",    // 6 — Customer → More value
] as const;

export type RevenueLayerId = (typeof REVENUE_LAYERS)[number];

export interface RevenueLayer {
  id: RevenueLayerId;
  /** 1–6 for ordering */
  order: number;
  /** User-facing short name (dashboard, reports) */
  label: string;
  /** One-line goal (no tech jargon) */
  goal: string;
  /** Primary outcome metric name */
  outcomeMetric: string;
}

/** Layer definitions — user-facing only */
export const REVENUE_LAYER_DEFINITIONS: Record<RevenueLayerId, RevenueLayer> = {
  CAPTURE: {
    id: "CAPTURE",
    order: 1,
    label: "Capture",
    goal: "Prevent paid interest from disappearing",
    outcomeMetric: "Leads captured",
  },
  CONVERT: {
    id: "CONVERT",
    order: 2,
    label: "Convert",
    goal: "Guide decision",
    outcomeMetric: "Bookings created",
  },
  SECURE: {
    id: "SECURE",
    order: 3,
    label: "Secure",
    goal: "Prevent no-shows",
    outcomeMetric: "Attendance rate",
  },
  RECOVER: {
    id: "RECOVER",
    order: 4,
    label: "Recover",
    goal: "Revive missed revenue",
    outcomeMetric: "Recovered revenue",
  },
  RETAIN: {
    id: "RETAIN",
    order: 5,
    label: "Retain",
    goal: "Increase lifetime value",
    outcomeMetric: "Repeat bookings",
  },
  EXPAND: {
    id: "EXPAND",
    order: 6,
    label: "Expand",
    goal: "Multiply revenue per customer",
    outcomeMetric: "Revenue per customer",
  },
};

/** Lead state → primary revenue layer (which layer this state serves) */
export function leadStateToLayer(state: LeadState | string | undefined | null): RevenueLayerId {
  if (!state) return "CAPTURE";
  switch (state) {
    case "NEW":
    case "CONTACTED":
      return "CAPTURE";
    case "ENGAGED":
    case "QUALIFIED":
      return "CONVERT";
    case "BOOKED":
      return "SECURE";
    case "SHOWED":
    case "WON":
      return "RETAIN";
    case "LOST":
    case "REACTIVATE":
      return "RECOVER";
    case "RETAIN":
      return "RETAIN";
    case "CLOSED":
      return "EXPAND";
    default:
      return "CAPTURE";
  }
}

/** Receptionist Performance — outcome metrics only (no agents, nodes, workflows) */
export const RECEPTIONIST_PERFORMANCE_METRICS = [
  { key: "leads_received", label: "Leads received", layer: "CAPTURE" as RevenueLayerId },
  { key: "conversations_handled", label: "Conversations handled", layer: "CAPTURE" as RevenueLayerId },
  { key: "bookings_created", label: "Bookings created", layer: "CONVERT" as RevenueLayerId },
  { key: "shows_protected", label: "Shows protected", layer: "SECURE" as RevenueLayerId },
  { key: "lost_leads_recovered", label: "Lost leads recovered", layer: "RECOVER" as RevenueLayerId },
] as const;

/** Lifecycle dashboard — Revenue Performance Infrastructure. No technical data. */
export const LIFECYCLE_DASHBOARD_METRICS = [
  { key: "new_opportunities", label: "New opportunities" },
  { key: "appointments_scheduled", label: "Appointments scheduled" },
  { key: "shows_protected", label: "Shows protected" },
  { key: "clients_recovered", label: "Clients recovered" },
  { key: "repeat_revenue_generated", label: "Repeat revenue generated" },
] as const;

export function getLayerDefinition(layerId: RevenueLayerId): RevenueLayer {
  return REVENUE_LAYER_DEFINITIONS[layerId];
}

export function getLayerOrder(layerId: RevenueLayerId): number {
  return REVENUE_LAYER_DEFINITIONS[layerId].order;
}
