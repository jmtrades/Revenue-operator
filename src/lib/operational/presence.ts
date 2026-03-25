/**
 * Operational presence: responsibility phases, daily cycles, protection status.
 * System behaves like an active department, not a dashboard.
 */

import type { LeadState } from "@/lib/types";

export type ResponsibilityPhase =
  | "investigating interest"
  | "keeping engaged"
  | "preparing for call"
  | "protecting attendance"
  | "recovering opportunity";

const STATE_TO_PHASE: Record<LeadState, ResponsibilityPhase> = {
  NEW: "investigating interest",
  CONTACTED: "investigating interest",
  ENGAGED: "keeping engaged",
  QUALIFIED: "preparing for call",
  BOOKED: "protecting attendance",
  SHOWED: "keeping engaged",
  WON: "keeping engaged",
  LOST: "recovering opportunity",
  RETAIN: "keeping engaged",
  REACTIVATE: "recovering opportunity",
  CLOSED: "keeping engaged",
};

export function responsibilityPhaseFromState(state: string): ResponsibilityPhase {
  return (STATE_TO_PHASE as Record<string, ResponsibilityPhase>)[state] ?? "keeping engaged";
}

export type OperationalCycle = "morning_reengagement" | "midday_attendance" | "evening_recovery";

export interface DailyCycleStatus {
  cycle: OperationalCycle;
  label: string;
  completed: boolean;
  completed_at?: string;
  summary: string;
}

export function getDailyOperationalCycles(
  now: Date,
  hasReengagementActions: boolean,
  hasAttendanceActions: boolean,
  hasRecoveryActions: boolean
): DailyCycleStatus[] {
  const hour = now.getUTCHours();
  const cycles: DailyCycleStatus[] = [];

  const morningDone = hour >= 12 || hasReengagementActions;
  cycles.push({
    cycle: "morning_reengagement",
    label: "Morning re-engagement",
    completed: morningDone,
    completed_at: hasReengagementActions ? now.toISOString() : undefined,
    summary: morningDone ? "Re-engagement routine completed" : "Scheduled for morning window",
  });

  const middayDone = hour >= 18 || hasAttendanceActions;
  cycles.push({
    cycle: "midday_attendance",
    label: "Midday attendance protection",
    completed: middayDone,
    completed_at: hasAttendanceActions ? now.toISOString() : undefined,
    summary: middayDone ? "Attendance protection routine completed" : "Scheduled for midday window",
  });

  const eveningDone = hour >= 22 || hasRecoveryActions;
  cycles.push({
    cycle: "evening_recovery",
    label: "Evening recovery",
    completed: eveningDone,
    completed_at: hasRecoveryActions ? now.toISOString() : undefined,
    summary: eveningDone ? "Recovery routine completed" : "Scheduled for evening window",
  });

  return cycles;
}
