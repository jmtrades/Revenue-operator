/**
 * Conversation progress: Cold → Interested → Scheduled → Attended
 * Maps lead states and system actions to progress stages.
 */

export const PROGRESS_STAGES = ["cold", "interested", "scheduled", "attended"] as const;
export type ProgressStage = (typeof PROGRESS_STAGES)[number];

const STAGE_LABELS: Record<ProgressStage, string> = {
  cold: "Cold",
  interested: "Interested",
  scheduled: "Scheduled",
  attended: "Attended",
};

/** Lead state → progress stage */
export function leadStateToProgress(state: string | undefined | null): ProgressStage {
  if (!state) return "cold";
  switch (state) {
    case "NEW":
    case "REACTIVATE":
    case "LOST":
    case "RETAIN":
    case "CLOSED":
      return "cold";
    case "CONTACTED":
    case "ENGAGED":
    case "QUALIFIED":
      return "interested";
    case "BOOKED":
      return "scheduled";
    case "SHOWED":
    case "WON":
      return "attended";
    default:
      return "cold";
  }
}

/** System action or event → progress stage this advances toward */
export function actionToProgress(action: string, payload?: Record<string, unknown>): ProgressStage | null {
  const innerAction = (payload?.action as string) ?? action;

  // Events
  if (action === "booking_created") return "scheduled";
  if (action === "call_completed") return "attended";
  if (action === "no_reply_timeout") return "cold";

  // First-time synthetic actions
  if (action === "first_response_prepared" || action === "first_follow_up_scheduled") return "interested";

  // Send-message inner actions
  if (innerAction === "booking" || innerAction === "call_invite") return "scheduled";
  if (innerAction === "reminder" || innerAction === "prep_info") return "scheduled";
  if (
    innerAction === "follow_up" ||
    innerAction === "greeting" ||
    innerAction === "question" ||
    innerAction === "qualification_question" ||
    innerAction === "recovery" ||
    innerAction === "win_back" ||
    innerAction === "offer"
  ) {
    return "interested";
  }

  return null;
}

export function getStageLabel(stage: ProgressStage): string {
  return STAGE_LABELS[stage];
}

export function getStageIndex(stage: ProgressStage): number {
  return PROGRESS_STAGES.indexOf(stage);
}
