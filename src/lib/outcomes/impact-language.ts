/**
 * Outcome protection language: protect booking, prevent loss, secure attendance, recover opportunity
 */

export function actionToImpact(action: string, payload?: Record<string, unknown>): string {
  const innerAction = (payload?.action as string) ?? action;
  if (action === "send_message") {
    if (innerAction === "booking" || innerAction === "call_invite") return "Protect booking";
    if (innerAction === "reminder" || innerAction === "prep_info") return "Secure attendance";
    if (innerAction === "recovery" || innerAction === "win_back" || innerAction === "offer") return "Recover opportunity";
    if (innerAction === "follow_up" || innerAction === "qualification_question" || innerAction === "next_step" || innerAction === "greeting" || innerAction === "question") return "Prevent loss";
    return "Prevent loss";
  }
  if (action === "restraint") return "Held back to protect";
  if (action.includes("escalation")) return "Flagged to prevent loss";
  if (action === "post_call_analysis" || action === "post_call_unknown_checkin") return "Secure follow-up";
  if (action === "call_show_inference") return "Detected show or no-show";
  if (action === "simulated_send_message") return "Previewed (not sent)";
  if (action === "first_day_win") return "First protective action";
  if (action === "first_response_prepared") return "Response prepared";
  if (action === "first_follow_up_scheduled") return "Follow-up scheduled";
  if (action === "inbound_detected") return "Conversation detected";
  if (action === "response_prepared") return "Response prepared";
  if (action === "follow_up_scheduled") return "Follow-up scheduled";
  if (action === "booking_projected") return "Booking projected";
  if (action === "calendar_protection_active") return "Calendar protection active";
  return action.replace(/_/g, " ");
}

export function eventToImpact(event: string): string {
  if (event === "booking_created") return "Secured booking";
  if (event === "call_completed") return "Secured attendance";
  if (event === "no_reply_timeout") return "Scheduled to prevent loss";
  if (event === "no_show_reminder") return "Recovering no-show";
  if (event === "message_received") return "New message";
  if (event === "manual_update") return "Manual update";
  return event.replace(/_/g, " ");
}
