/**
 * Call Objective Router
 *
 * Dynamically determines the primary objective for each call based on:
 * - Call direction (inbound vs outbound)
 * - Time of day (business hours vs after hours)
 * - Caller history (new vs returning)
 * - Lead state (cold vs warm vs hot)
 * - Campaign context (if outbound)
 * - Agent configuration
 *
 * The objective shapes the entire conversation: what tools to prioritize,
 * how assertive to be, what success looks like, and when to transfer.
 */

export type CallObjective =
  | "answer_and_route"
  | "book_appointment"
  | "qualify_lead"
  | "support_resolve"
  | "sales_close"
  | "follow_up_engage"
  | "reminder_confirm"
  | "no_show_recover"
  | "reactivation"
  | "after_hours_capture";

export interface CallContext {
  direction: "inbound" | "outbound";
  isBusinessHours: boolean;
  isReturningCaller: boolean;
  leadState?: "cold" | "warm" | "hot" | "customer" | "churned";
  campaignType?: "reminder" | "follow_up" | "reactivation" | "no_show" | "sales";
  agentPrimaryGoal?: string;
  hasCalledBefore?: boolean;
  lastCallDaysAgo?: number;
  leadScore?: number;
}

export interface ResolvedObjective {
  objective: CallObjective;
  /** Human-readable instruction for the prompt */
  instruction: string;
  /** How assertive the agent should be (0-100) */
  assertiveness: number;
  /** Priority tools for this objective */
  priorityTools: string[];
  /** When to transfer to human */
  transferTriggers: string[];
  /** What counts as "success" for this call */
  successCriteria: string;
  /** Max call duration target (minutes) */
  targetDurationMinutes: number;
}

/**
 * Resolve the optimal call objective based on all available context.
 */
export function resolveCallObjective(ctx: CallContext): ResolvedObjective {
  const objective = determineObjective(ctx);
  return buildObjectiveConfig(objective, ctx);
}

function determineObjective(ctx: CallContext): CallObjective {
  // ── Gate 1: After-hours inbound → always capture mode ──
  if (!ctx.isBusinessHours && ctx.direction === "inbound") {
    return "after_hours_capture";
  }

  // ── Gate 2: Outbound campaign type → direct mapping ──
  if (ctx.direction === "outbound" && ctx.campaignType) {
    const campaignMap: Record<string, CallObjective> = {
      reminder: "reminder_confirm",
      no_show: "no_show_recover",
      reactivation: "reactivation",
      follow_up: "follow_up_engage",
      sales: "sales_close",
    };
    if (campaignMap[ctx.campaignType]) return campaignMap[ctx.campaignType];
  }

  // ── Gate 3: Outbound without campaign → route by lead state + score ──
  if (ctx.direction === "outbound") {
    if (ctx.leadState === "churned") return "reactivation";
    if (ctx.leadState === "hot" || (ctx.leadScore && ctx.leadScore >= 80)) return "sales_close";
    if (ctx.leadState === "warm" || (ctx.leadScore && ctx.leadScore >= 50)) return "follow_up_engage";
    if (ctx.leadState === "customer") return "follow_up_engage";
    if (ctx.leadState === "cold") return "qualify_lead";
    // Fall through to agent goal
    return resolveFromAgentGoal(ctx.agentPrimaryGoal);
  }

  // ── Gate 4: Inbound from known contacts → route by relationship ──
  if (ctx.leadState === "customer") return "support_resolve";
  if (ctx.leadState === "churned" && ctx.isReturningCaller) return "reactivation";
  if (ctx.leadState === "hot" || (ctx.leadScore && ctx.leadScore >= 80)) return "book_appointment";
  if (ctx.leadState === "warm" && ctx.isReturningCaller) return "follow_up_engage";
  if (ctx.leadState === "warm") return "qualify_lead";

  // ── Gate 5: Agent-configured primary goal ──
  return resolveFromAgentGoal(ctx.agentPrimaryGoal);
}

/**
 * Map the static agent primary goal to an objective.
 */
function resolveFromAgentGoal(goal?: string): CallObjective {
  if (!goal) return "answer_and_route";
  const mapping: Record<string, CallObjective> = {
    answer_route: "answer_and_route",
    book_appointments: "book_appointment",
    qualify_leads: "qualify_lead",
    support: "support_resolve",
    sales: "sales_close",
    follow_up: "follow_up_engage",
    custom: "answer_and_route",
    inbound: "answer_and_route",
    outbound: "follow_up_engage",
    both: "answer_and_route",
  };
  return mapping[goal] ?? "answer_and_route";
}

function buildObjectiveConfig(objective: CallObjective, ctx: CallContext): ResolvedObjective {
  const configs: Record<CallObjective, Omit<ResolvedObjective, "objective">> = {
    answer_and_route: {
      instruction: "Answer the caller's question or route them to the right person. Be helpful, concise, and efficient. Success = caller got their answer or was connected correctly.",
      assertiveness: 40,
      priorityTools: ["lookup_customer", "transfer_call", "take_message"],
      transferTriggers: ["complex technical question", "billing dispute", "complaint escalation"],
      successCriteria: "Caller's question answered or correctly routed",
      targetDurationMinutes: 3,
    },
    book_appointment: {
      instruction: "Guide this caller toward booking an appointment. Be warm and helpful first, but always steer toward confirming a date, time, and service. Offer specific times rather than open-ended questions.",
      assertiveness: 60,
      priorityTools: ["check_availability", "book_appointment", "capture_lead", "send_sms"],
      transferTriggers: ["complex service question beyond your knowledge", "pricing negotiation"],
      successCriteria: "Appointment booked with confirmed date, time, and service",
      targetDurationMinutes: 5,
    },
    qualify_lead: {
      instruction: "Determine if this caller is a good fit. Ask qualifying questions naturally: what they need, timeline, and any constraints. Capture their info for human follow-up. Don't sell — qualify and build rapport.",
      assertiveness: 45,
      priorityTools: ["capture_lead", "check_availability", "send_email"],
      transferTriggers: ["ready to buy now", "complex custom request", "enterprise inquiry"],
      successCriteria: "Lead captured with name, contact info, need, and timeline",
      targetDurationMinutes: 5,
    },
    support_resolve: {
      instruction: "Resolve the caller's issue. Listen fully, acknowledge frustration if present, and either solve the problem or create a clear escalation path. Never make the caller feel dismissed.",
      assertiveness: 30,
      priorityTools: ["lookup_customer", "check_order_status", "transfer_call", "send_sms"],
      transferTriggers: ["refund request over $100", "legal threat", "repeat complaint (3rd+ call)"],
      successCriteria: "Issue resolved or clear resolution path communicated with timeline",
      targetDurationMinutes: 7,
    },
    sales_close: {
      instruction: "Move this caller toward a purchase or commitment. Build rapport, understand their pain point, present your solution, handle objections confidently, and ask for the close. Be direct but never pushy.",
      assertiveness: 70,
      priorityTools: ["capture_lead", "book_appointment", "create_estimate", "send_email", "collect_payment"],
      transferTriggers: ["wants to speak with owner/manager", "needs custom pricing", "enterprise volume"],
      successCriteria: "Commitment secured: booking, deposit, or scheduled follow-up",
      targetDurationMinutes: 8,
    },
    follow_up_engage: {
      instruction: "Re-engage this contact warmly. Reference previous conversations if available. Check if they have questions, offer to help, and try to book next steps. You're continuing a relationship, not starting cold.",
      assertiveness: 50,
      priorityTools: ["lookup_customer", "book_appointment", "send_sms", "capture_lead"],
      transferTriggers: ["wants detailed pricing discussion", "complaint about previous experience"],
      successCriteria: "Re-engagement achieved: appointment booked, question answered, or callback scheduled",
      targetDurationMinutes: 4,
    },
    reminder_confirm: {
      instruction: "Confirm the upcoming appointment. Be brief and warm. State the date, time, and service. Ask if they need to reschedule. If confirmed, wish them well. If rescheduling, offer alternatives immediately.",
      assertiveness: 35,
      priorityTools: ["check_availability", "book_appointment", "send_sms"],
      transferTriggers: ["wants to cancel entirely and is upset"],
      successCriteria: "Appointment confirmed or successfully rescheduled",
      targetDurationMinutes: 2,
    },
    no_show_recover: {
      instruction: "Recover this missed appointment with empathy. Don't blame. Say something like 'We missed you earlier — everything okay?' Offer to reschedule easily. Make it frictionless to come back.",
      assertiveness: 40,
      priorityTools: ["check_availability", "book_appointment", "capture_lead", "send_sms"],
      transferTriggers: ["dissatisfied with service", "pricing complaint"],
      successCriteria: "Rescheduled appointment or callback scheduled",
      targetDurationMinutes: 3,
    },
    reactivation: {
      instruction: "Win back this inactive contact. Be warm, not desperate. Ask how things have been, mention what's new, and offer an easy way to re-engage (special offer, new availability, etc.). Respect their time.",
      assertiveness: 45,
      priorityTools: ["capture_lead", "book_appointment", "send_email", "send_sms"],
      transferTriggers: ["had negative experience", "competitor mention"],
      successCriteria: "Re-engagement: appointment, callback, or expressed interest",
      targetDurationMinutes: 4,
    },
    after_hours_capture: {
      instruction: "It's after business hours. Be warm but efficient. Take their name, phone, what they need, and urgency level. Promise a callback during business hours. If it's an emergency, handle per the business's emergency protocol.",
      assertiveness: 35,
      priorityTools: ["capture_lead", "take_message", "send_sms"],
      transferTriggers: ["medical/safety emergency", "says it's urgent and won't wait"],
      successCriteria: "Contact info captured with callback details",
      targetDurationMinutes: 2,
    },
  };

  return {
    objective,
    ...configs[objective],
  };
}

/**
 * Generate the objective instruction block for the system prompt.
 */
export function formatObjectiveForPrompt(resolved: ResolvedObjective): string {
  // Map assertiveness (0-100) to a human-readable tone directive
  const a = Math.max(0, Math.min(100, resolved.assertiveness ?? 50));
  const toneDirective =
    a <= 35
      ? "Tone: Be gentle and patient — let the caller lead."
      : a <= 50
        ? "Tone: Be warm but clear — balance helpfulness with direction."
        : a <= 65
          ? "Tone: Be moderately assertive — helpful but purposeful."
          : "Tone: Be confident and direct — guide the conversation proactively.";

  const lines = [
    `CALL OBJECTIVE: ${resolved.objective.replace(/_/g, " ").toUpperCase()}`,
    "",
    resolved.instruction,
    "",
    toneDirective,
    `Success criteria: ${resolved.successCriteria}`,
    `Target call length: ~${resolved.targetDurationMinutes} minutes`,
    `Priority tools: ${resolved.priorityTools.join(", ")}`,
    "",
    "Transfer to a human when:",
    ...resolved.transferTriggers.map((t) => `- ${t}`),
  ];
  return lines.join("\n");
}

/**
 * Get all available objectives (for admin UI / analytics).
 */
export function getAllObjectives(): CallObjective[] {
  return [
    "answer_and_route",
    "book_appointment",
    "qualify_lead",
    "support_resolve",
    "sales_close",
    "follow_up_engage",
    "reminder_confirm",
    "no_show_recover",
    "reactivation",
    "after_hours_capture",
  ];
}
