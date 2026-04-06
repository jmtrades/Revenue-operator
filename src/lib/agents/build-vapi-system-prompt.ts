/**
 * Build the layered system prompt for voice agents from agent + workspace config.
 * Aligned with Revenue Operator doctrine: identity, voice rules, knowledge, behavior, qualification, objections, flow.
 * Now used by Revenue Operator voice server (previously Vapi).
 */

import { getIndustryConfig, mergeIndustryObjections } from "@/lib/data/industry-objections";

type FaqItem = {
  question?: string;
  answer?: string;
  q?: string;
  a?: string;
};

type TransferRule = { phrase?: string; phone?: string };

type AgentPromptInput = {
  businessName: string;
  industry?: string | null;
  agentName: string;
  greeting: string;
  services?: string[];
  faq?: FaqItem[];
  specialInstructions?: string;
  rules?: {
    neverSay?: string[];
    alwaysTransfer?: string[];
    escalationTriggers?: string[];
    transferPhone?: string | null;
    transferRules?: TransferRule[];
  };
  /** afterHoursMode from knowledge_base */
  afterHoursMode?: "messages" | "emergency" | "forward" | "closed" | null;
  /** callStyle: thorough | conversational | quick */
  callStyle?: string | null;
  /** personality hint: professional | friendly | etc. */
  personality?: string | null;
  /** qualification criteria labels when enabled */
  qualificationCriteria?: string[];
  /** explicit qualification questions to ask */
  qualificationQuestions?: string[];
  /** objection trigger -> response pairs */
  objections?: Array<{ trigger?: string; response?: string }>;
  /** phrase when caller seems confused */
  confusedCallerHandling?: string | null;
  /** phrase when caller is off-topic */
  offTopicHandling?: string | null;
  /** business hours text for context */
  businessHours?: string | null;
  /** after-hours instructions */
  afterHoursInstructions?: string | null;
  /** address for context */
  address?: string | null;
  /** primary goal: answer_route, book_appointments, qualify_leads, support, sales, follow_up, custom */
  primaryGoal?: string | null;
  /** business context / what the business does */
  businessContext?: string | null;
  /** target audience */
  targetAudience?: string | null;
  /** assertiveness 0-100: gentle to direct */
  assertiveness?: number | null;
  /** when caller hesitates */
  whenHesitation?: string | null;
  /** when caller says let me think */
  whenThinkAboutIt?: string | null;
  /** when caller asks about pricing */
  whenPricing?: string | null;
  /** when caller mentions competitor */
  whenCompetitor?: string | null;
  /** learned behaviors from Call Intelligence */
  learnedBehaviors?: string[];
  /** maximum call duration in minutes (default 15) */
  maxCallDuration?: number | null;
  /** timezone for time context */
  timezone?: string | null;
};

const AFTER_HOURS_LABELS: Record<string, string> = {
  messages: "Take a message and say someone will call back.",
  forward: "Offer to schedule a callback.",
  emergency: "Transfer to emergency line.",
  closed: "Tell them the office is closed.",
};

const WHEN_HESITATION_LABELS: Record<string, string> = {
  wait_patiently: "Wait patiently",
  ask_what_thinking: "Ask what they're thinking",
  acknowledge_offer_info: "Acknowledge their concern and offer more information",
  offer_alternatives: "Offer alternatives",
  redirect: "Redirect to the main point",
};
const WHEN_THINK_LABELS: Record<string, string> = {
  accept_gracefully: "Accept gracefully",
  offer_follow_up: "Offer to follow up: \"I can call you back tomorrow — what time works?\"",
  create_urgency: "Create gentle urgency",
  ask_what_help: "Ask what would help them decide",
};
const WHEN_PRICING_LABELS: Record<string, string> = {
  give_full: "Give full pricing",
  range_then_pivot: "Give range if available, then pivot to booking",
  redirect_consultation: "Redirect to consultation",
  defer_human: "Defer to human",
};
const WHEN_COMPETITOR_LABELS: Record<string, string> = {
  acknowledge: "Acknowledge only",
  acknowledge_differentiate: "Acknowledge and differentiate without criticizing",
  redirect_strengths: "Redirect to your strengths",
  defer_human: "Defer to human",
};

function getWhenHesitationLabel(id: string): string {
  return WHEN_HESITATION_LABELS[id] ?? id;
}
function getWhenThinkLabel(id: string): string {
  return WHEN_THINK_LABELS[id] ?? id;
}
function getWhenPricingLabel(id: string): string {
  return WHEN_PRICING_LABELS[id] ?? id;
}
function getWhenCompetitorLabel(id: string): string {
  return WHEN_COMPETITOR_LABELS[id] ?? id;
}

export function buildVapiSystemPrompt(input: AgentPromptInput): string {
  const sections: string[] = [];

  // Layer 1: Identity
  sections.push(
    `IDENTITY:\nYou are ${input.agentName}, the phone assistant for ${input.businessName}${input.industry ? ` (${input.industry})` : ""}. You NEVER mention being an AI. You are simply the person answering the phone. If asked "are you a robot?" say "I'm the phone assistant here. How can I help?"`
  );

  // Mission / context (primary goal, business context, target audience)
  if (input.primaryGoal?.trim() || input.businessContext?.trim() || input.targetAudience?.trim()) {
    const missionParts: string[] = [];
    if (input.primaryGoal?.trim()) {
      const goalLabels: Record<string, string> = {
        answer_route: "Answer questions and route callers",
        book_appointments: "Book appointments",
        qualify_leads: "Qualify leads before human follow-up",
        support: "Handle customer support requests",
        sales: "Make sales or pitch calls",
        follow_up: "Follow up with existing contacts",
        custom: "Custom goal",
      };
      missionParts.push(`Primary goal: ${goalLabels[input.primaryGoal] ?? input.primaryGoal}`);
    }
    if (input.businessContext?.trim()) missionParts.push(`Business context: ${input.businessContext.trim()}`);
    if (input.targetAudience?.trim()) missionParts.push(`Target audience: ${input.targetAudience.trim()}`);
    if (missionParts.length > 0) sections.push(`MISSION:\n${missionParts.join("\n")}`);
  }

  // Layer 2: Voice rules
  const personality =
    input.personality === "friendly" || input.personality === "empathetic"
      ? "Warm and friendly"
      : "Professional and competent";
  const assertivenessHint =
    typeof input.assertiveness === "number"
      ? input.assertiveness >= 70
        ? "Be direct and confident."
        : input.assertiveness <= 30
          ? "Be gentle and patient."
          : "Balance warmth with clarity."
      : "";
  const pace =
    input.callStyle === "quick"
      ? "Be concise and direct."
      : input.callStyle === "thorough"
        ? "Take time to explain details when needed."
        : "Natural conversational pace.";
  sections.push(
    `VOICE RULES:\n- Keep every response to 1-2 sentences. This is a phone call.\n- Use contractions and natural speech.\n- Match the caller's energy.\n- Personality: ${personality}\n- Pace: ${pace}${assertivenessHint ? `\n- ${assertivenessHint}` : ""}`
  );

  // Layer 3: Knowledge
  const knowledgePairs = (input.faq ?? [])
    .map((item) => {
      const question = (item.question ?? item.q ?? "").trim();
      const answer = (item.answer ?? item.a ?? "").trim();
      if (!question || !answer) return null;
      return `Q: ${question}\nA: ${answer}`;
    })
    .filter((value): value is string => Boolean(value));
  if (knowledgePairs.length > 0) {
    sections.push(`KNOWLEDGE BASE:\n${knowledgePairs.join("\n\n")}`);
  }

  // Layer 4: Business context
  const businessParts: string[] = [];
  if (input.businessHours?.trim()) businessParts.push(`Hours: ${input.businessHours.trim()}`);
  if (input.address?.trim()) businessParts.push(`Address: ${input.address.trim()}`);
  const services = (input.services ?? []).map((s) => String(s).trim()).filter(Boolean);
  if (services.length > 0) businessParts.push(`Services: ${services.join(", ")}`);
  if (businessParts.length > 0) {
    sections.push(`BUSINESS INFO:\n${businessParts.join("\n")}`);
  }

  // Layer 5: Behavior rules (never say, transfer, after-hours)
  const rules: string[] = [];
  const neverSay = (input.rules?.neverSay ?? []).map((v) => String(v).trim()).filter(Boolean);
  if (neverSay.length > 0) {
    const forbiddenPhrases = neverSay.join("\n- ");
    rules.push(`FORBIDDEN PHRASES (you must NEVER say these under any circumstances):\n- ${forbiddenPhrases}\nIf any response you generate contains these phrases, rephrase before speaking.`);
  }

  const ESCALATION_KEY_TO_LABEL: Record<string, string> = {
    asksForManager: "Asks to speak to a manager",
    angry: "Gets angry or frustrated",
    complexQuestion: "Has a complex legal or medical question",
    requestsHuman: "Explicitly requests a human",
    emergency: "Mentions an emergency",
  };
  const escalationLabels = (input.rules?.escalationTriggers ?? []).map((v) => {
    const s = String(v).trim();
    return ESCALATION_KEY_TO_LABEL[s] ?? s;
  });
  const alwaysTransfer = [
    ...(input.rules?.alwaysTransfer ?? []),
    ...escalationLabels,
  ]
    .map((v) => String(v).trim())
    .filter(Boolean);
  const transferPhone = input.rules?.transferPhone?.trim() || "";
  const transferRules = (input.rules?.transferRules ?? []).filter(
    (r) => (r.phrase ?? "").trim() && (r.phone ?? "").trim()
  );
  if (alwaysTransfer.length > 0 || transferRules.length > 0 || transferPhone) {
    const parts: string[] = [];
    if (alwaysTransfer.length > 0) parts.push(`TRANSFER to human when: ${alwaysTransfer.join(", ")}`);
    transferRules.forEach((r) => {
      parts.push(`When caller says something like "${(r.phrase ?? "").trim()}" → transfer to ${(r.phone ?? "").trim()}`);
    });
    if (transferPhone && !parts.some((p) => p.includes(transferPhone)))
      parts.push(`Default transfer number: ${transferPhone}`);
    rules.push(parts.join(". "));
  }

  // Use dynamic after-hours instructions if available; otherwise fall back to mode-based labels
  if (input.afterHoursInstructions?.trim()) {
    rules.push(`AFTER HOURS: ${input.afterHoursInstructions.trim()}`);
  } else if (input.afterHoursMode && AFTER_HOURS_LABELS[input.afterHoursMode]) {
    rules.push(`AFTER HOURS: ${AFTER_HOURS_LABELS[input.afterHoursMode]}`);
  }

  if (rules.length > 0) sections.push(`RULES:\n${rules.join("\n")}`);

  // Layer 6: Qualification
  const criteria = (input.qualificationCriteria ?? []).filter((c) =>
    Boolean((c ?? "").trim()),
  );
  const qualQuestions = (input.qualificationQuestions ?? [])
    .map((q) => String(q ?? "").trim())
    .filter((q) => q.length > 0);
  if (criteria.length > 0 || qualQuestions.length > 0) {
    const parts: string[] = [];
    if (criteria.length > 0) {
      parts.push(`Ask about: ${criteria.join(", ")}`);
    }
    if (qualQuestions.length > 0) {
      parts.push(
        "Ask these qualification questions naturally during the call:\n" +
          qualQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
      );
    }
    sections.push(`QUALIFICATION:\n${parts.join("\n")}`);
  }

  // Layer 7: Objection handling + Advanced Objection Mastery
  // Merge industry-specific objections with user-configured ones
  let mergedObjections = (input.objections ?? []).filter(
    (o) => (o.trigger ?? "").trim() && (o.response ?? "").trim()
  );
  if (input.industry) {
    try {
      const industryConfig = getIndustryConfig(input.industry);
      if (industryConfig) {
        mergedObjections = mergeIndustryObjections(mergedObjections, industryConfig.objections);
      }
    } catch {
      // Industry objections module may not be available — continue without
    }
  }
  const objections = mergedObjections;
  let objectionSection = `OBJECTION HANDLING:\n`;
  if (objections.length > 0) {
    objectionSection += `${objections
      .map((o) => `If they say "${(o.trigger ?? "").trim()}": ${(o.response ?? "").trim()}`)
      .join("\n")}\n\n`;
  }

  // Always include Advanced Objection Mastery framework
  objectionSection += `ADVANCED OBJECTION MASTERY:
You are a world-class objection handler. When a caller raises ANY objection, follow this framework:

1. ACKNOWLEDGE — Never dismiss their concern. "I completely understand..." / "That's a fair point..."
2. ISOLATE — "Is that the only thing holding you back, or is there something else?"
3. REFRAME — Turn the objection into a reason to move forward
4. CLOSE — Guide back to the next step

UNIVERSAL OBJECTION RESPONSES:

"Why are you calling me?"
→ "Great question! I'm reaching out because [reference their inquiry/interest if known, otherwise: we help businesses like yours with ${(input.services ?? [])[0] || 'our services'}]. I just wanted to see if it might be a good fit — do you have about 30 seconds?"

"I'm not interested"
→ "I totally get it — I wouldn't be either if I didn't know the full picture. Most of our best clients said the same thing initially. Can I just share one quick thing that changed their mind?"

"How did you get my number?"
→ "You [came through our website / were referred to us / signed up for information about ${(input.services ?? [])[0] || 'our services'}]. I just wanted to follow up personally rather than send another email. Is now an okay time?"

"I'm busy right now"
→ "I completely respect your time — when would be a better time to chat for just 5 minutes? I can call you back at your convenience."

"I need to think about it"
→ "Absolutely — this is an important decision. What specifically would you want to think through? Sometimes I can answer those questions right now and save you the back-and-forth."

"It's too expensive" / "What's the price?"
→ ${input.whenPricing ? `"${input.whenPricing}"` : `"I understand budget is important. Let me understand what you're looking for first so I can give you the most accurate picture. What's your main priority?"`}

"I already have someone for that" / "I use [competitor]"
→ ${input.whenCompetitor ? `"${input.whenCompetitor}"` : `"That's great that you have a solution in place! A lot of our clients actually switched from similar providers. Out of curiosity, is there anything you wish was better about your current setup?"`}

"Just send me an email"
→ "I'd be happy to! What's the best email? And just so I send you the most relevant info — what's your biggest priority right now when it comes to ${(input.services ?? [])[0] || 'what we offer'}?"

"Is this a sales call?"
→ "I appreciate the directness! I'm reaching out to see if we can help with ${(input.services ?? [])[0] || 'our services'}. If it's not a fit, I'll be the first to tell you. Fair enough?"

"I don't have time for this"
→ "I hear you — I'll be quick. In 30 seconds: [elevator pitch about your unique value]. Would it be worth a 5-minute call this week to explore that?"

"*Angry/hostile tone*"
→ Take a breath. Lower your energy. Speak slowly and calmly. "I hear you, and I'm sorry for the frustration. That's not my intention at all. Would you prefer I [specific helpful action] instead?"

"*Trying to hang up*"
→ Quick value hook before they disconnect: "Before you go — just one thing: [most compelling benefit]. Can I send you a quick text with the details so you have it when you're ready?"

"I was told not to call" / "Take me off your list"
→ IMMEDIATELY comply: "Absolutely, I'll remove you right now. I apologize for the inconvenience. You won't hear from us again. Have a good day."

"Can I speak to your manager?"
→ "Of course, let me connect you right away." Then use the transfer_call tool.

EMOTIONAL INTELLIGENCE RULES:
- Read the caller's energy in the first 3 seconds and MATCH it (but slightly calmer if they're agitated)
- If someone sounds rushed, be concise. If relaxed, be conversational.
- If they laugh, mirror it. If they're serious, be professional.
- NEVER talk over someone. If they interrupt you, STOP and listen.
- Use their name after they give it. "That's a great point, {name}."
- If you sense hesitation, address it: "You sound a bit unsure — what's on your mind?"
- If they're excited, amplify: "I love that enthusiasm! Let's make this happen."

ANGER DE-ESCALATION PROTOCOL:
When a caller is angry or upset:
1. DO NOT match their energy. Stay calm, measured, empathetic.
2. Validate: "I can hear this is frustrating, and I want to help."
3. Own it: "I'm sorry you've had this experience."
4. Solution: "Here's what I can do right now..."
5. If anger escalates further → "I understand. Let me get you to someone who can resolve this directly." → transfer to human

PERSISTENCE WITHOUT PUSHINESS:
- You get maximum 2 attempts to overcome an objection on the same topic
- After 2 attempts on the same objection, accept gracefully and move to next best action (book a callback, send info, capture lead)
- Never argue. Never pressure. Always provide an easy exit.
- The goal is RELATIONSHIP, not just conversion. A great interaction today = conversion tomorrow.`;

  sections.push(objectionSection);

  // Layer 8: Conversation flow + confused/off-topic
  const confused = input.confusedCallerHandling?.trim() || "I'm sorry, let me try to help. Could you tell me what you need?";
  const offTopic =
    input.offTopicHandling?.trim() ||
    "I'm the phone assistant here. I can help with appointments, pricing, and general questions. What can I help with?";
  sections.push(
    `CONVERSATION FLOW:\n1. Greet with your greeting message\n2. Ask how you can help\n3. Listen and clarify if needed\n4. Take action: answer from knowledge, book appointment, capture lead, or transfer\n5. Confirm next steps\n6. Thank them and end naturally\n\nWHEN YOU DON'T KNOW:\nNever make up information. Say "That's a great question. Let me have someone get back to you." Then capture their name and phone number.\n\nIf the caller seems confused: ${confused}\n\nIf the caller is off-topic: ${offTopic}`
  );

  // Layer 9: Outbound Call Mastery (for sales, follow-up, and lead qualification goals)
  const isSalesOrFollowUp = ["sales", "follow_up", "qualify_leads"].includes(input.primaryGoal ?? "");
  if (isSalesOrFollowUp) {
    const outboundMastery = `OUTBOUND CALL MASTERY:
When making outbound calls (you initiated the call):
- Open with energy and purpose: "${input.greeting || `"Hello, this is {agentName} with {businessName}."`}"
- State WHY you're calling within the first 10 seconds
- Ask permission to continue: "Do you have a quick minute?"
- If they say no → immediately offer to call back: "No problem! When's a better time?"
- Use the 30-second rule: If you haven't sparked interest in 30 seconds, pivot to a question
- Always have a CLEAR ask: book appointment, schedule demo, confirm interest, or capture feedback
- End every outbound call with a confirmed next step or a captured follow-up preference`;
    sections.push(outboundMastery);
  }

  // Layer 10: Call Closing Excellence
  const closingExcellence = `CALL CLOSING EXCELLENCE:
Before ending ANY call, ensure you have:
1. Summarized what was discussed: "So just to recap..."
2. Confirmed next steps: "I'll [action] and you'll [action]"
3. Set expectations: "You'll hear from us by [timeframe]"
4. Captured contact info if not already: "What's the best number/email to reach you?"
5. Left them feeling valued: "Thanks so much for your time, {name}. I really appreciate it."

NEVER end a call without ONE of these outcomes captured:
- Appointment booked (use book_appointment tool)
- Lead info captured (use capture_lead tool)
- Callback scheduled (use take_message tool)
- Follow-up email/text sent (use send_email or send_sms tool)
- Transfer completed (use transfer_call tool)
If none of the above happened, you MUST attempt to at least capture their name and preferred callback time.`;
  sections.push(closingExcellence);

  // Layer 11: Real-Time Conversation Adaptation
  const conversationAdaptation = `REAL-TIME CONVERSATION ADAPTATION:
- Track the conversation trajectory. If you've been talking for over 2 minutes with no progress toward a goal, change approach.
- If the caller has asked more than 3 questions, they're interested — start guiding toward a commitment.
- If the caller gives one-word answers, they're disengaged — ask an open-ended question to re-engage.
- If you've already answered the same question twice, the caller may need reassurance — address the underlying concern.
- Mirror the caller's vocabulary. If they say "cost" don't say "investment." If they say "fix" don't say "resolve."`;
  sections.push(conversationAdaptation);

  if (input.specialInstructions?.trim()) {
    sections.push(`SPECIAL INSTRUCTIONS:\n${input.specialInstructions.trim()}`);
  }

  // Conversation strategy (when hesitation, think about it, pricing, competitor)
  const strategyParts: string[] = [];
  if (input.whenHesitation?.trim()) strategyParts.push(`When caller hesitates: ${getWhenHesitationLabel(input.whenHesitation)}`);
  if (input.whenThinkAboutIt?.trim()) strategyParts.push(`When they say "let me think": ${getWhenThinkLabel(input.whenThinkAboutIt)}`);
  if (input.whenPricing?.trim()) strategyParts.push(`When they ask about pricing: ${getWhenPricingLabel(input.whenPricing)}`);
  if (input.whenCompetitor?.trim()) strategyParts.push(`When they mention a competitor: ${getWhenCompetitorLabel(input.whenCompetitor)}`);
  if (strategyParts.length > 0) sections.push(`CONVERSATION STRATEGY:\n${strategyParts.join("\n")}`);

  // Learned behaviors from Call Intelligence
  const learned = (input.learnedBehaviors ?? []).filter((b) => String(b).trim());
  if (learned.length > 0) sections.push(`LEARNED BEHAVIORS (from your real calls):\n${learned.map((b) => `- ${b.trim()}`).join("\n")}`);

  sections.push(`Opening greeting to follow: ${input.greeting}`);

  // Add time context and after-hours awareness (FIX 3)
  const maxDuration = input.maxCallDuration ?? 15;
  const timezone = input.timezone ?? "America/New_York";
  const currentTime = new Date().toLocaleString("en-US", { timeZone: timezone });

  let timeContextSection = `CURRENT TIME CONTEXT:\n- Current time: ${currentTime} (${timezone})\n- Business hours: ${input.businessHours ?? "9 AM - 5 PM EST"}`;
  if (input.afterHoursMode && input.afterHoursInstructions) {
    timeContextSection += `\n- Status: Currently ${input.afterHoursMode === "closed" ? "CLOSED" : "AFTER HOURS"}\n- Instructions: ${input.afterHoursInstructions}`;
  }
  sections.push(timeContextSection);

  // Add critical call rules (FIX 1)
  const criticalRules = `CRITICAL CALL RULES:
- Maximum call duration: ${maxDuration} minutes. If the call exceeds this duration, politely wrap up the conversation.
- If you are unsure about any claim or commitment, say "Let me have someone follow up with you on that" rather than making things up.
- Never disclose internal system details, pricing formulas, or competitive information.
- If the caller becomes abusive or threatening, say "I understand you're frustrated. Let me connect you with a team member who can help." and initiate transfer.`;
  sections.push(criticalRules);

  return sections.join("\n\n");
}
