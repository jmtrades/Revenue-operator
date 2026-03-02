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
  const { lastUserMsg, state: _state, policyReason: _policyReason, reasoning } = context;
  const explanation = (reasoning?.explanation as string) ?? "";

  const actionNoticed: Record<string, string> = {
    greeting: "New conversation started.",
    question: lastUserMsg ? `They asked: "${lastUserMsg.slice(0, 80)}${lastUserMsg.length > 80 ? "…" : ""}"` : "Inbound message received.",
    follow_up: "Reply window closing.",
    qualification_question: "Interest shown; fit needs qualifying.",
    discovery_questions: "Engagement detected; gathering situation.",
    value_proposition: "Ready for value context.",
    booking: "Availability indicated.",
    call_invite: "Qualified; routing to call.",
    reminder: "Call scheduled; confirming attendance.",
    prep_info: "Call coming up; preparing.",
    next_step: "Call completed; proposing next step.",
    recovery: "Conversation cooling; recovering momentum.",
    win_back: "Previously lost; re-engaging.",
    clarifying_question: "Unclear intent; clarifying.",
  };

  const actionDecision: Record<string, string> = {
    greeting: "Maintaining continuity.",
    question: "Preparing response toward call.",
    follow_up: "Maintaining engagement.",
    qualification_question: "Preparing qualification.",
    discovery_questions: "Gathering context.",
    value_proposition: "Preparing relevance.",
    booking: "Preparing booking path.",
    call_invite: "Routing to call.",
    reminder: "Confirming attendance.",
    prep_info: "Preparing for call.",
    next_step: "Proposing next step.",
    recovery: "Recovering momentum.",
    win_back: "Re-engaging.",
    clarifying_question: "Clarifying before acting.",
  };

  const actionExpected: Record<string, string> = {
    greeting: "Conversation continues.",
    question: "Progress toward call.",
    follow_up: "Momentum maintained.",
    qualification_question: "Fit established.",
    discovery_questions: "Context gathered.",
    value_proposition: "Relevance established.",
    booking: "Call scheduled.",
    call_invite: "Call booked.",
    reminder: "Attendance secured.",
    prep_info: "Call prepared.",
    next_step: "Next step taken.",
    recovery: "Momentum restored.",
    win_back: "Re-engagement.",
    clarifying_question: "Clarity before acting.",
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
    cooldown_active: "Recent touch; cooldown active.",
    stage_limit: "Daily limit for this stage reached.",
    warmup_limit: "New account; limiting volume.",
    outside_business_hours: "Outside business hours.",
    workspace_paused: "Protection paused.",
    coverage_not_enabled: "This protection scope is not enabled.",
  };
  const restraintDecision: Record<string, string> = {
    cooldown_active: "Wait before next touch.",
    stage_limit: "Reschedule for tomorrow.",
    warmup_limit: "Gradually increase capacity.",
    workspace_paused: "Hold until resumed.",
    outside_business_hours: "Wait for business hours.",
    coverage_not_enabled: "Protection limited. Enable this scope in Settings to act.",
  };
  const restraintExpected: Record<string, string> = {
    cooldown_active: "Next check when cooldown ends.",
    stage_limit: "Fresh limit tomorrow.",
    warmup_limit: "Full capacity soon.",
    workspace_paused: "Resume when you unpause.",
    outside_business_hours: "Action in the morning.",
    coverage_not_enabled: "Enable coverage scope to maintain this conversation.",
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
