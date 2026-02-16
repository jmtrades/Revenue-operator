/**
 * Outcome language: passive operational outcomes only.
 * The product is never the subject. Use: follow-through continued, attendance was confirmed, decision progressed, customer returned, conversation resumed.
 */

export function actionToImpact(action: string, payload?: Record<string, unknown>): string {
  const innerAction = (payload?.action as string) ?? action;
  if (action === "send_message") {
    if (innerAction === "booking" || innerAction === "call_invite") return "Booking set";
    if (innerAction === "reminder" || innerAction === "prep_info") return "Attendance was confirmed";
    if (innerAction === "recovery" || innerAction === "win_back" || innerAction === "offer") return "Customer returned";
    if (innerAction === "follow_up" || innerAction === "qualification_question" || innerAction === "next_step" || innerAction === "greeting" || innerAction === "question") return "Follow-through continued";
    return "Follow-through continued";
  }
  if (action === "restraint") return "Follow-through continued";
  if (action.includes("escalation")) return "Decision progressed";
  if (action === "post_call_analysis" || action === "post_call_unknown_checkin") return "Conversation resumed";
  if (action === "call_show_inference") return "Attendance was confirmed";
  if (action === "simulated_send_message") return "Previewed (not sent)";
  if (action === "first_day_win") return "Follow-through continued";
  if (action === "first_response_prepared") return "Decision progressed";
  if (action === "first_follow_up_scheduled") return "Follow-through continued";
  if (action === "inbound_detected") return "Conversation resumed";
  if (action === "response_prepared") return "Decision progressed";
  if (action === "follow_up_scheduled") return "Follow-through continued";
  if (action === "booking_projected") return "Decision progressed";
  if (action === "calendar_protection_active") return "Upcoming appointments remain scheduled";
  return action.replace(/_/g, " ");
}

export function eventToImpact(event: string): string {
  if (event === "booking_created") return "They're set";
  if (event === "call_completed") return "Attendance was confirmed";
  if (event === "no_reply_timeout") return "Follow-through continued";
  if (event === "no_show_reminder") return "Conversation resumed";
  if (event === "message_received") return "Conversation resumed";
  if (event === "manual_update") return "Decision progressed";
  return event.replace(/_/g, " ");
}
