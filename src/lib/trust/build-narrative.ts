/**
 * Decision narratives for trust: what was noticed, what was decided, what is expected.
 */

export interface DecisionNarrative {
  noticed: string;
  decision: string;
  expected: string;
}

export function narrativeForAction(
  action: string,
  context: {
    lastUserMsg?: string;
    state?: string;
    policyReason?: string;
    reasoning?: Record<string, unknown>;
  }
): DecisionNarrative {
  const { lastUserMsg, state, policyReason, reasoning } = context;
  const explanation = (reasoning?.explanation as string) ?? "";

  const actionNoticed: Record<string, string> = {
    greeting: "New lead reached out.",
    question: lastUserMsg ? `Lead asked: "${lastUserMsg.slice(0, 80)}${lastUserMsg.length > 80 ? "…" : ""}"` : "Lead sent a message.",
    follow_up: "Lead stopped replying.",
    qualification_question: "Lead showed interest; needed to qualify fit.",
    discovery_questions: "Lead engaged; gathering situation.",
    value_proposition: "Lead ready for value context.",
    booking: "Lead responded to availability.",
    call_invite: "Lead qualified; routing to call.",
    reminder: "Call scheduled; sending reminder.",
    prep_info: "Call coming up; sharing prep.",
    next_step: "Call completed; proposing next step.",
    recovery: "Lead went quiet; reaching back out.",
    win_back: "Lead was lost; trying to re-engage.",
    clarifying_question: "Unclear intent; asking for more.",
  };

  const actionDecision: Record<string, string> = {
    greeting: "Send welcoming reply.",
    question: "Answer and move toward call.",
    follow_up: "Send follow-up to re-engage.",
    qualification_question: "Ask qualifying question.",
    discovery_questions: "Ask discovery question.",
    value_proposition: "Share relevant value.",
    booking: "Send booking link.",
    call_invite: "Offer call slot.",
    reminder: "Send reminder.",
    prep_info: "Send prep information.",
    next_step: "Suggest next step.",
    recovery: "Send recovery message.",
    win_back: "Send win-back offer.",
    clarifying_question: "Ask clarifying question.",
  };

  const actionExpected: Record<string, string> = {
    greeting: "Lead replies; conversation continues.",
    question: "Lead responds; we qualify.",
    follow_up: "Lead re-engages.",
    qualification_question: "We learn fit and readiness.",
    discovery_questions: "We understand their situation.",
    value_proposition: "Lead sees relevance.",
    booking: "Call gets scheduled.",
    call_invite: "Lead books or declines.",
    reminder: "Lead shows up.",
    prep_info: "Better conversation.",
    next_step: "Lead takes next step.",
    recovery: "Lead comes back.",
    win_back: "Lead reconsiders.",
    clarifying_question: "We get clarity before acting.",
  };

  return {
    noticed: (actionNoticed[action] ?? explanation) || "Reviewing conversation.",
    decision: actionDecision[action] ?? `Take action: ${action}.`,
    expected: actionExpected[action] ?? "Progress toward booking.",
  };
}

export function narrativeForRestraint(
  reason: string,
  details?: Record<string, unknown>
): DecisionNarrative {
  const restraintNoticed: Record<string, string> = {
    cooldown_active: "Lead was contacted recently.",
    stage_limit: "Daily limit for this stage reached.",
    warmup_limit: "New account; limiting volume.",
    outside_business_hours: "Outside business hours.",
    workspace_paused: "Department is paused.",
  };
  const restraintDecision: Record<string, string> = {
    cooldown_active: "Wait before next message.",
    stage_limit: "Reschedule for tomorrow.",
    warmup_limit: "Gradually increase sends.",
    workspace_paused: "Hold until resumed.",
    outside_business_hours: "Wait for business hours.",
  };
  const restraintExpected: Record<string, string> = {
    cooldown_active: "Next check when cooldown ends.",
    stage_limit: "Fresh limit tomorrow.",
    warmup_limit: "Full capacity soon.",
    workspace_paused: "Resume when you unpause.",
    outside_business_hours: "Action in the morning.",
  };

  const attempt = details?.attemptCount as number | undefined;
  const nextCheck = reason === "cooldown_active" && attempt
    ? `Next attempt in ~${attempt <= 2 ? "2 hours" : attempt <= 3 ? "18 hours" : "48 hours"}`
    : undefined;

  return {
    noticed: restraintNoticed[reason] ?? "Condition detected.",
    decision: restraintDecision[reason] ?? "Delay action.",
    expected: (nextCheck ? `${nextCheck}. ` : "") + (restraintExpected[reason] ?? "Re-evaluate later."),
  };
}
