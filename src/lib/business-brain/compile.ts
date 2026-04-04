/**
 * Business Brain: compile workspace business context + agent into a system prompt
 * for voice agents (e.g. Recall).
 * 10 layers: identity, business context, mission/strategy, conversation skills,
 * language, caller context, call history, industry knowledge, objection handling,
 * compliance, never-fail guardrails.
 */

import { resolveIndustryPack } from "@/lib/industry-packs";
import { getCallScriptBlocksForDomain } from "@/lib/voice/call-script-blocks";
import { resolveCallObjective, formatObjectiveForPrompt, type CallContext } from "@/lib/voice/call-objective";

export interface BusinessBrainInput {
  business_name: string;
  offer_summary?: string;
  business_hours?: Record<string, { start: string; end: string } | null>;
  faq?: Array<{ q?: string; a?: string }>;
  agent_name?: string;
  greeting?: string;
  services?: string;
  emergencies_after_hours?: string;
  appointment_handling?: string;
  faq_extra?: string;
  industry?: string;
  address?: string;
  phone?: string;
  /** Preferred response language code (e.g. en, es, fr). Agent should switch when caller uses another language. */
  preferred_language?: string;
  /** primary goal: answer_route, book_appointments, qualify_leads, support, sales, follow_up, custom */
  primary_goal?: string;
  business_context?: string;
  target_audience?: string;
  assertiveness?: number;
  when_hesitation?: string;
  when_think_about_it?: string;
  when_pricing?: string;
  when_competitor?: string;
  learned_behaviors?: string[];
  /** Dynamic call context for objective routing */
  call_context?: {
    direction?: "inbound" | "outbound";
    isBusinessHours?: boolean;
    isReturningCaller?: boolean;
    leadState?: "cold" | "warm" | "hot" | "customer" | "churned";
    campaignType?: "reminder" | "follow_up" | "reactivation" | "no_show" | "sales";
    leadScore?: number;
  };
  /** Previous call context for returning callers */
  call_history?: Array<{
    date: string;
    summary?: string;
    outcome?: string;
    topics?: string[];
  }>;
  /** Lead info for personalization */
  lead_context?: {
    name?: string;
    phone?: string;
    email?: string;
    state?: string;
    score?: number;
    tags?: string[];
    last_contacted?: string;
    notes?: string;
  };
  /** Agent rules: never_say, always_transfer, qualification questions, objection handling */
  rules?: {
    neverSay?: string[];
    alwaysTransfer?: string[];
    escalationTriggers?: string[];
    transferPhone?: string | null;
    transferRules?: Array<{ phrase?: string; phone?: string }>;
  };
  /** Qualification questions to ask during conversation */
  qualification_questions?: string[];
  /** Objection trigger -> response pairs */
  objections?: Array<{ trigger?: string; response?: string }>;
  /** Business hours string for context */
  business_hours_text?: string;
  /** After-hours instructions */
  after_hours_instructions?: string;
  /** After-hours mode: messages, emergency, forward, closed */
  after_hours_mode?: "messages" | "emergency" | "forward" | "closed" | null;
  /** Call style: thorough, conversational, quick */
  call_style?: string;
  /** Personality hint: professional, friendly, etc. */
  personality?: string;
  /** Maximum call duration in minutes */
  max_call_duration?: number;
  /** Timezone for context */
  timezone?: string;
  /** Pause recording when caller shares sensitive information (credit cards, SSN, passwords, etc.) */
  recording_pause_on_sensitive?: boolean;
}

/**
 * Sanitize user-supplied strings before injecting into the system prompt.
 * Prevents prompt injection by stripping dangerous patterns and capping length.
 */
function sanitizeForPrompt(value: string | undefined | null, maxLen = 500): string {
  if (!value || typeof value !== "string") return "";
  let s = value.trim().slice(0, maxLen);
  // Strip sequences that could break out of prompt structure
  s = s
    .replace(/\x00/g, "")                 // Strip null bytes
    .replace(/\n{3,}/g, "\n\n")           // Collapse excessive newlines
    .replace(/={3,}/g, "==")               // Collapse separator chars
    .replace(/-{5,}/g, "----")             // Collapse dashes
    .replace(/#{3,}/g, "##")               // Collapse header markers
    .replace(/<\/?[a-z][^>]*>/gi, "")      // Strip HTML/XML tags
    .replace(/\$\{[^}]*\}/g, "")          // Strip template literal expressions
    .replace(/\b(SYSTEM|IGNORE|OVERRIDE|INSTRUCTION|PROMPT)\s*[:\-=]/gi, "$1 ") // Defuse injection keywords (colon, dash, equals)
    .replace(/\[(SYSTEM|IGNORE|OVERRIDE|INSTRUCTION|PROMPT)\]/gi, "$1")         // Defuse bracketed injection keywords
    .replace(/```[\s\S]*?```/g, "")        // Strip code blocks
    .trim();
  return s;
}

export function compileSystemPrompt(input: BusinessBrainInput): string {
  const {
    business_name,
    offer_summary = "",
    business_hours,
    faq = [],
    agent_name = "Sarah",
    greeting,
    services,
    emergencies_after_hours,
    appointment_handling,
    faq_extra,
    industry,
    address,
    phone,
    preferred_language,
    primary_goal,
    business_context,
    target_audience,
    assertiveness,
    when_hesitation,
    when_think_about_it,
    when_pricing,
    when_competitor,
    learned_behaviors,
    call_history,
    lead_context,
    rules,
    qualification_questions,
    objections,
    business_hours_text: _business_hours_text,
    after_hours_instructions,
    after_hours_mode,
    call_style: _call_style,
    personality: _personality,
    max_call_duration: _max_call_duration,
    timezone: _timezone,
    recording_pause_on_sensitive,
  } = input;

  const langName = preferred_language ? getLanguageName(preferred_language) : "English";

  // Sanitize all user-supplied fields before prompt injection
  const safeName = sanitizeForPrompt(agent_name, 50) || "Sarah";
  const safeBizName = sanitizeForPrompt(business_name, 100) || "the business";
  const safeOfferSummary = sanitizeForPrompt(offer_summary, 500);
  const safeServices = sanitizeForPrompt(services, 500);
  const safeBusinessContext = sanitizeForPrompt(business_context, 500);
  const safeTargetAudience = sanitizeForPrompt(target_audience, 300);
  const safeFaqExtra = sanitizeForPrompt(faq_extra, 1000);
  const safeGreeting = sanitizeForPrompt(greeting, 300);

  // Layer 1: Identity & boundaries
  const layer1 = [
    `You are ${safeName}, the phone assistant for ${safeBizName}. You answer calls on their behalf.`,
    "You handle the ENTIRE call naturally. There is no fixed script — listen to what the caller says and respond. Move the conversation toward a clear outcome: answer questions, book appointments, capture leads, take a message, or transfer. Adapt to whatever they need.",
    "You are NOT a chatbot. You are speaking on a phone call. Keep responses SHORT — 1-2 sentences max.",
    'Never say "as an AI" or "I\'m an AI assistant." You are simply the person answering the phone.',
    `If asked "are you a robot?" say "I'm ${safeBizName}'s phone assistant. How can I help?"`,
    "Never make up information you don't know. If unsure, say \"Let me have someone get back to you on that.\"",
    "Never discuss competitors. Never give medical/legal/financial advice.",
  ].join("\n");

  // Layer 2: Business context
  const businessLines: string[] = [
    `Business: ${safeBizName}`,
    ...(industry ? [`Industry: ${sanitizeForPrompt(industry, 100)}`] : []),
    ...(phone ? [`Phone: ${sanitizeForPrompt(phone, 30)}`] : []),
    ...(address ? [`Location: ${sanitizeForPrompt(address, 200)}`] : []),
  ];
  if (business_hours && Object.keys(business_hours).length > 0) {
    const hoursStr = Object.entries(business_hours)
      .filter(([, v]) => v && typeof v === "object" && "start" in v && "end" in v)
      .map(([day, v]) => {
        const h = v as { start: string; end: string };
        return `${day}: ${h.start}-${h.end}`;
      })
      .join("; ");
    if (hoursStr) businessLines.push(`Hours: ${hoursStr}`);
  }
  if (safeOfferSummary) businessLines.push(`What we offer: ${safeOfferSummary}`);
  if (safeServices) businessLines.push(`Services: ${safeServices}`);
  if (after_hours_mode === "messages") {
    businessLines.push("🔴 AFTER-HOURS MODE: Take message only");
    if (after_hours_instructions) businessLines.push(`Instructions: ${sanitizeForPrompt(after_hours_instructions, 300)}`);
  } else if (after_hours_mode === "emergency") {
    businessLines.push("🚨 AFTER-HOURS MODE: Emergency-only (check for keywords, transfer if emergency detected)");
    if (after_hours_instructions) businessLines.push(`Instructions: ${sanitizeForPrompt(after_hours_instructions, 300)}`);
  } else if (after_hours_mode === "forward") {
    businessLines.push("↗️ AFTER-HOURS MODE: Forward to emergency line (handled by routing)");
  } else if (after_hours_mode === "closed") {
    businessLines.push("🔒 AFTER-HOURS MODE: Closed (voicemail/message only)");
    if (after_hours_instructions) businessLines.push(`Instructions: ${sanitizeForPrompt(after_hours_instructions, 300)}`);
  }

  // Legacy support for old after-hours field
  if (!after_hours_mode && emergencies_after_hours === "call_me") {
    businessLines.push("After hours emergencies: take details and tell the caller someone will call back soon.");
  } else if (!after_hours_mode && emergencies_after_hours === "message") {
    businessLines.push("After hours: take a message and say someone will call back.");
  } else if (!after_hours_mode && emergencies_after_hours === "next_day") {
    businessLines.push("After hours: take a message for the next business day.");
  }
  if (appointment_handling === "calendar") {
    businessLines.push("Appointments: book directly into the calendar when possible.");
  } else if (appointment_handling === "capture") {
    businessLines.push("Appointments: capture details and say the business will confirm.");
  }
  businessLines.push("");
  businessLines.push("Knowledge Base:");
  const validFaq = faq.slice(0, 50).filter((item) => item.q && item.a);
  validFaq.forEach((item) => {
    businessLines.push(`Q: ${sanitizeForPrompt(item.q!, 200)}\nA: ${sanitizeForPrompt(item.a!, 500)}`);
  });
  if (safeFaqExtra) businessLines.push(safeFaqExtra);

  // Sparse knowledge enhancement: when FAQ < 5, add professional conversational filler
  // so the agent never sounds empty or unprepared
  if (validFaq.length < 5) {
    businessLines.push("");
    businessLines.push("SPARSE KNOWLEDGE PROTOCOL (your knowledge base is still being built):");
    businessLines.push("- You are a professional business assistant. Even if specific details are not yet in your knowledge base, you can STILL have a confident, helpful conversation.");
    businessLines.push("- For common questions (hours, pricing, services, location): if you have the answer, give it. If not, say: \"I want to make sure I give you the most accurate information. Let me have our team follow up with those details right away.\"");
    businessLines.push("- NEVER say \"I don't have that information\" or \"My knowledge base doesn't cover that\" — these sound robotic and undermine trust.");
    businessLines.push("- INSTEAD, pivot naturally: gather the caller's needs, offer to book a callback, or connect them with someone who can help.");
    businessLines.push("- Your tone should be warm, competent, and proactive — like a great executive assistant who always finds a way to help.");
    businessLines.push("- Default handling for any unknown question: \"Great question — let me get you connected with someone who can give you the full details. Can I get your name and the best number to reach you?\"");
  }
  const layer2 = businessLines.join("\n");

  // Mission / strategy (optional)
  const missionParts: string[] = [];
  if (primary_goal?.trim()) {
    const goalLabels: Record<string, string> = {
      answer_route: "Answer questions and route callers",
      book_appointments: "Book appointments",
      qualify_leads: "Qualify leads before human follow-up",
      support: "Handle customer support requests",
      sales: "Make sales or pitch calls",
      follow_up: "Follow up with existing contacts",
      custom: "Custom goal",
    };
    missionParts.push(`Primary goal: ${goalLabels[primary_goal] ?? primary_goal}`);
  }
  if (safeBusinessContext) missionParts.push(`Business context: ${safeBusinessContext}`);
  if (safeTargetAudience) missionParts.push(`Target audience: ${safeTargetAudience}`);
  if (typeof assertiveness === "number") {
    if (assertiveness >= 70) missionParts.push("Tone: Be direct and confident.");
    else if (assertiveness <= 30) missionParts.push("Tone: Be gentle and patient.");
    else missionParts.push("Tone: Balance warmth with clarity.");
  }
  if (when_hesitation?.trim()) missionParts.push(`When caller hesitates: ${whenHesitationLabel(when_hesitation)}`);
  if (when_think_about_it?.trim()) missionParts.push(`When they say "let me think": ${whenThinkLabel(when_think_about_it)}`);
  if (when_pricing?.trim()) missionParts.push(`When they ask about pricing: ${whenPricingLabel(when_pricing)}`);
  if (when_competitor?.trim()) missionParts.push(`When they mention a competitor: ${whenCompetitorLabel(when_competitor)}`);
  const learned = (learned_behaviors ?? [])
    .filter((b) => String(b).trim())
    .slice(0, 20) // Cap at 20 behaviors to prevent prompt bloat
    .map((b) => sanitizeForPrompt(b, 200));
  if (learned.length > 0) missionParts.push("Learned behaviors (from real calls): " + learned.join(". "));
  const layer2b = missionParts.length > 0 ? "MISSION / STRATEGY:\n" + missionParts.join("\n") : "";

  // Layer 2c: Call objective — dynamically resolved per-call using the objective router.
  // When full call_context is provided (direction, hours, lead state, campaign type),
  // the router picks the optimal objective. Falls back to primary_goal as a static default.
  let layer2c = "";
  if (input.call_context) {
    const callCtx: CallContext = {
      direction: input.call_context.direction ?? "inbound",
      isBusinessHours: input.call_context.isBusinessHours ?? true,
      isReturningCaller: input.call_context.isReturningCaller ?? !!call_history?.length,
      leadState: input.call_context.leadState,
      campaignType: input.call_context.campaignType,
      agentPrimaryGoal: primary_goal,
      leadScore: input.call_context.leadScore ?? lead_context?.score,
    };
    const resolved = resolveCallObjective(callCtx);
    layer2c = formatObjectiveForPrompt(resolved);
  } else if (primary_goal) {
    // Static fallback when no call_context is provided
    const objectiveInstructions: Record<string, string> = {
      answer_route: "Your objective this call: Answer the caller's question completely, or route them to the right person. Success = caller got their answer or was connected. Do NOT push for a booking unless they ask.",
      book_appointments: "Your objective this call: Get this caller booked. Guide the conversation toward confirming a date, time, and service. Be helpful first, but always steer toward the booking.",
      qualify_leads: "Your objective this call: Determine if this caller is a good fit. Ask qualifying questions naturally (name, need, timeline, budget range). Capture their info for human follow-up. Don't sell — qualify.",
      support: "Your objective this call: Resolve the caller's issue. Listen fully, acknowledge their frustration if any, and either solve it or escalate to a human. Success = caller feels heard and has a resolution path.",
      sales: "Your objective this call: Move this caller closer to a purchase. Build rapport, understand their need, present the offer, handle objections, and close or book a follow-up. Be confident but never pushy.",
      follow_up: "Your objective this call: Re-engage this contact. Reference previous conversations if available. Check if they have questions, offer to help, and try to book next steps. Be warm — they already know us.",
    };
    const instruction = objectiveInstructions[primary_goal];
    if (instruction) layer2c = "CALL OBJECTIVE:\n" + instruction;
  }

  // Layer 3: Conversation skills
  const layer3 = [
    "CONVERSATION RULES:",
    "- Start with the greeting, then LISTEN. Don't talk over the caller.",
    "- Match the caller's energy. If they're rushed, be concise. If chatty, be warm.",
    "- Use the caller's name once you know it. e.g. \"Of course, Sarah.\"",
    "- When booking: confirm date, time, and service. Read it back clearly.",
    "- When qualifying leads: ask name, phone/email, what they need, timeline. Don't interrogate — converse.",
    "- If the caller is upset: acknowledge first (\"I completely understand that's frustrating\"), then solve.",
    "- If you don't understand: \"I'm sorry, could you repeat that?\" — never guess.",
    "- If the caller wants a human: \"Absolutely, let me connect you. One moment.\" → transfer or take a message.",
    "- Always end every call with a clear next step. Never hang up without confirming what happens next.",
    "- NEVER respond to every question with the same timing. Simple questions = fast answer. Hard questions = pause and think.",
    "- After the caller finishes a long explanation, pause for 500ms before replying. This shows you listened.",
    "- NEVER start 3 consecutive responses with the same word. Rotate your openers.",
    "- If the caller says something emotional, respond to the EMOTION first, then the content.",
    "- Mirror the caller's vocabulary. If they say 'appointment', don't say 'booking'. If they say 'AC unit', don't say 'HVAC system'.",
    "- On longer calls (3+ minutes), vary your energy. Don't sound the same at minute 1 and minute 5.",
    "",
    "NATURAL SPEECH:",
    "- Use contractions: \"I'll\", \"we're\", \"that's\", \"don't\", \"can't\"",
    "- Use filler acknowledgments: \"Sure thing\", \"Absolutely\", \"Of course\", \"Got it\", \"Perfect\"",
    "- Use transition phrases: \"So here's what I can do\", \"Let me see\", \"Great question\"",
    "- Keep it conversational: \"Let me check on that for you\" not \"I will now look up that information\"",
    "- Vary your sentence length. Mix short affirmations (\"Got it.\") with longer explanations.",
    "- Pause briefly before important information. \"So your appointment is... Wednesday at 2 PM.\"",
    "- NEVER use the same filler word twice in a row. If you just said 'Absolutely', use 'Of course' or 'You got it' next.",
    "- On phone numbers and dates, slow down and pause between groups: 'That's... 5-5-5... 1-2-3... 4-5-6-7.'",
    "- When the caller interrupts you, stop immediately and say 'Oh—' or 'Sure—' before listening. Never just go silent.",
    "- If you need to look something up, say 'Let me check on that for you' — never go silent for more than 1 second.",
    "",
    "PHONE-SPECIFIC:",
    "- Keep responses to 1-2 sentences. Phone callers can't read — they need to process by ear.",
    "- Spell out or repeat important details: emails, phone numbers, dates, names.",
    "- When reading numbers, group them: \"That's 5-5-5, 1-2-3, 4-5-6-7\" not \"5551234567\".",
    "- If there's silence for 3+ seconds, gently check in: \"Are you still there?\" or \"Take your time.\"",
    "- Never use bullet points, markdown, or formatting — you're SPEAKING, not writing.",
    "",
    "CLOSING TECHNIQUE:",
    "- If the caller is interested but not committing: offer a specific time. \"Would Thursday at 10 work?\"",
    "- If booking: confirm everything. \"Perfect, I have you down for [service] on [date] at [time]. You'll get a confirmation shortly.\"",
    "- If not booking: capture info for follow-up. \"Can I get the best number to reach you at?\"",
    "- Always end warmly: \"Thanks so much for calling, [name]. We look forward to seeing you.\"",
    ...(safeGreeting ? [`Opening greeting (use this tone): ${safeGreeting}`] : []),
  ].join("\n");

  // Layer 4: Language & multilingual
  const layer4 = [
    `Primary language: ${langName}`,
    "If the caller speaks a different language, switch to match them.",
    "Always respond in the language the caller is using.",
    `If unsure of the language, default to ${langName}.`,
  ].join("\n");

  // Layer 5: Lead context (if this is an outbound call or known caller)
  let layer5 = "";
  if (lead_context) {
    const parts: string[] = ["CALLER CONTEXT (use naturally, don't recite):"];
    if (lead_context.name) parts.push(`Name: ${sanitizeForPrompt(lead_context.name, 50)}`);
    if (lead_context.state) parts.push(`Status: ${sanitizeForPrompt(lead_context.state, 30)}`);
    if (lead_context.score != null) parts.push(`Lead score: ${Math.min(100, Math.max(0, Number(lead_context.score) || 0))}/100`);
    if (lead_context.tags?.length) parts.push(`Tags: ${lead_context.tags.slice(0, 10).map((t) => sanitizeForPrompt(t, 30)).join(", ")}`);
    if (lead_context.last_contacted) parts.push(`Last contacted: ${sanitizeForPrompt(lead_context.last_contacted, 30)}`);
    if (lead_context.notes) parts.push(`Notes: ${sanitizeForPrompt(lead_context.notes, 300)}`);
    layer5 = parts.join("\n");
  }

  // Layer 6: Conversation history (for returning callers)
  let layer6 = "";
  if (call_history && call_history.length > 0) {
    const historyLines = ["PREVIOUS CALL HISTORY (reference naturally if relevant — don't read it back verbatim):"];
    for (const call of call_history.slice(-5)) { // last 5 calls max
      const parts = [`- ${sanitizeForPrompt(call.date, 30)}`];
      if (call.outcome) parts.push(`outcome: ${sanitizeForPrompt(call.outcome, 100)}`);
      if (call.summary) parts.push(`summary: ${sanitizeForPrompt(call.summary, 200)}`);
      if (call.topics?.length) parts.push(`topics: ${call.topics.slice(0, 10).map((t) => sanitizeForPrompt(t, 50)).join(", ")}`);
      historyLines.push(parts.join(" | "));
    }
    historyLines.push("Use this context to personalize the call. Example: \"I see we spoke last week about your appointment — did everything go well?\"");
    layer6 = historyLines.join("\n");
  }

  // Layer 7: Industry knowledge (auto-loaded from industry packs)
  let layer7 = "";
  if (industry) {
    const pack = resolveIndustryPack(industry);
    if (pack) {
      const industryLines: string[] = [`INDUSTRY KNOWLEDGE (${pack.name}):`];

      // Auto-inject industry FAQ into the agent's knowledge
      if (pack.knowledgeBase.commonQuestions.length > 0) {
        industryLines.push("Common caller questions for your industry:");
        for (const qa of pack.knowledgeBase.commonQuestions) {
          industryLines.push(`Q: ${qa.q}\nA: ${qa.a}`);
        }
      }

      // Services the business typically offers
      if (pack.knowledgeBase.services.length > 0) {
        industryLines.push(`Typical services: ${pack.knowledgeBase.services.join(", ")}`);
      }

      // Appointment types and durations
      if (pack.appointmentTypes.length > 0) {
        industryLines.push("Appointment types: " + pack.appointmentTypes.map(a => `${a.name} (~${a.duration} min)`).join(", "));
      }

      layer7 = industryLines.join("\n");
    }
  }

  // Layer 7b: Agent rules — critical behavior constraints
  let layer7b = "";
  const agentRules: string[] = [];

  // Never Say rules
  const neverSay = (rules?.neverSay ?? []).map((v) => String(v).trim()).filter(Boolean);
  if (neverSay.length > 0) {
    const forbiddenPhrases = neverSay.join("\n- ");
    agentRules.push(
      `FORBIDDEN PHRASES (CRITICAL — you must NEVER say these under any circumstances):\n- ${forbiddenPhrases}\n` +
      `If any response you would generate contains these phrases, rephrase immediately before speaking. ` +
      `If asked directly about these topics, redirect the conversation politely.`
    );
  }

  // Always Transfer rules
  const alwaysTransfer = (rules?.alwaysTransfer ?? [])
    .map((v) => String(v).trim())
    .filter(Boolean);
  const escalationLabels = (rules?.escalationTriggers ?? [])
    .map((v) => String(v).trim())
    .filter(Boolean);
  const allTransferTriggers = [...alwaysTransfer, ...escalationLabels];
  const transferPhone = rules?.transferPhone?.trim() || "";
  const transferRules = (rules?.transferRules ?? []).filter(
    (r) => (r.phrase ?? "").trim() && (r.phone ?? "").trim()
  );

  if (allTransferTriggers.length > 0 || transferRules.length > 0 || transferPhone) {
    const transferParts: string[] = [];
    if (allTransferTriggers.length > 0) {
      transferParts.push(`TRANSFER TRIGGERS (immediate escalation required):\n- ${allTransferTriggers.join("\n- ")}`);
    }
    transferRules.forEach((r) => {
      transferParts.push(`When caller says "${(r.phrase ?? "").trim()}" → transfer to ${(r.phone ?? "").trim()}`);
    });
    if (transferPhone && !transferParts.join("").includes(transferPhone)) {
      transferParts.push(`Default transfer number: ${transferPhone}`);
    }
    agentRules.push("TRANSFER RULES:\n" + transferParts.join("\n"));
  }

  // Qualification questions
  const qualQuestions = (qualification_questions ?? [])
    .map((q) => String(q ?? "").trim())
    .filter((q) => q.length > 0);
  if (qualQuestions.length > 0) {
    agentRules.push(
      "QUALIFICATION QUESTIONS (ask naturally during the conversation, not interrogation-style):\n" +
      qualQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")
    );
  }

  // Custom objection handling
  const customObjections = (objections ?? []).filter(
    (o) => (o.trigger ?? "").trim() && (o.response ?? "").trim()
  );
  if (customObjections.length > 0) {
    agentRules.push(
      "CUSTOM OBJECTION HANDLING:\n" +
      customObjections
        .map((o) => `If they say "${(o.trigger ?? "").trim()}": ${(o.response ?? "").trim()}`)
        .join("\n")
    );
  }

  if (agentRules.length > 0) {
    layer7b = "AGENT RULES & BEHAVIOR CONSTRAINTS:\n" + agentRules.join("\n\n");
  }

  // Layer 8: Objection handling (universal — every agent needs this)
  const layer8 = [
    "OBJECTION HANDLING (use these strategies naturally — never read them verbatim):",
    "",
    "When caller says it's too expensive / asks about cost / mentions budget:",
    "→ Acknowledge: \"I understand pricing is important.\"",
    "→ If you know pricing: share the range, then pivot to value.",
    "→ If you don't: ask \"What budget range are you considering?\" then offer to discuss options.",
    "→ Never discount unless the business allows it. Focus on value.",
    "",
    "When caller says \"not now\" / \"I'm busy\" / \"bad timing\":",
    "→ \"No problem at all. When would be a better time to chat?\"",
    "→ Offer to schedule a callback. Don't push.",
    "",
    "When caller says \"let me think about it\" / \"need to talk to my spouse/partner\":",
    "→ \"Absolutely, take your time. Can I send you some info to help with the decision?\"",
    "→ Capture their email/number for follow-up. Don't create pressure.",
    "",
    "When caller mentions a competitor / says they're comparing:",
    "→ Acknowledge: \"It's smart to compare options.\"",
    "→ Ask: \"What's most important to you in making this decision?\"",
    "→ Highlight your strengths without criticizing the competitor.",
    "",
    "When caller seems skeptical / asks \"is this legit\" / \"are you real\":",
    "→ \"I completely understand. We're {business_name}, and I'm here to help.\"",
    "→ Offer to share reviews, references, or the business website.",
    "",
    "When caller says \"not interested\" / \"stop calling\" / \"remove me\":",
    "→ \"Understood. I've noted that. Have a great day.\"",
    "→ ALWAYS respect opt-outs immediately. End the call warmly.",
    "",
    "When caller is upset / angry / frustrated:",
    "→ FIRST: acknowledge their feelings. \"I completely understand that's frustrating.\"",
    "→ THEN: solve. \"Let me see what I can do to help.\"",
    "→ If they escalate: \"I want to make sure you're taken care of. Let me connect you with someone who can help further.\"",
    "→ Never argue. Never get defensive.",
    "",
    "When caller goes silent (3+ seconds):",
    "→ \"Are you still there?\" or \"Take your time — I'm here whenever you're ready.\"",
    "",
    "When caller asks something you don't know:",
    "→ FIRST try to answer from your knowledge base and industry knowledge.",
    "→ If you truly don't know: \"That's a great question — let me have someone from our team get back to you with the exact details.\"",
    "→ Capture their callback info. Never guess or make up information.",
    "→ If the question is common (pricing, hours, location, services), you should KNOW the answer. Check your context first.",
  ].join("\n");

  // Layer 9: Compliance disclosures (auto-loaded from industry)
  let layer9 = "";
  if (industry) {
    const domainType = industry.toLowerCase().replace(/[\s-]+/g, "_");
    const blocks = getCallScriptBlocksForDomain(domainType);
    const disclosures = blocks.filter(b => b.type === "disclosure" || b.type === "consent");
    if (disclosures.length > 0) {
      const complianceLines = ["COMPLIANCE (say these naturally during the call):"];
      for (const block of disclosures) {
        complianceLines.push(`- ${block.text}${block.required_ack ? " (wait for acknowledgment)" : ""}`);
      }
      complianceLines.push("If the caller does not acknowledge a required disclosure, repeat it once, then offer to connect them with a human.");
      layer9 = complianceLines.join("\n");
    }
  }

  // Layer 9b: Recording pause on sensitive information (if enabled)
  let layer9b = "";
  if (recording_pause_on_sensitive) {
    layer9b = [
      "RECORDING SAFETY: This call is being recorded.",
      "",
      "When the caller begins sharing sensitive information (credit card numbers, SSN, bank account details, passwords, PINs, security codes, mother's maiden name, etc.), you MUST:",
      "1. Say: \"For your security, I'll pause the recording while you share that information.\"",
      "2. Include [PAUSE_RECORDING] in your response (this signals the voice engine to pause recording).",
      "3. When they finish sharing, say: \"Recording has resumed\" and include [RESUME_RECORDING].",
      "",
      "This protects the caller's sensitive data from being retained in the recording.",
    ].join("\n");
  }

  // Layer 10: Never-fail guardrails — critical error recovery and edge-case handling
  const layer10 = [
    "CRITICAL GUARDRAILS (never break these rules):",
    "",
    "TOOL FAILURE RECOVERY:",
    "- If a tool call fails (booking, payment, SMS, etc.), DO NOT tell the caller it failed or mention technical errors.",
    "- Instead say: \"Let me take your details and have someone confirm that for you right away.\"",
    "- Fall back to capture_lead or take_message to ensure nothing is lost.",
    "- If booking fails: \"I want to make sure we get the perfect time for you. Let me have our team confirm and call you back within the hour.\"",
    "- If payment link fails: \"Let me have our billing team send that directly to you. What's the best number or email?\"",
    "- NEVER say \"error\", \"system\", \"technical difficulty\", \"server\", or \"something went wrong\" to a caller.",
    "",
    "AUDIO & CONNECTION ISSUES:",
    "- If you hear garbled audio or can't understand: \"I'm sorry, I didn't quite catch that. Could you say that one more time?\"",
    "- If silence for 5+ seconds: \"Are you still there? I'm here whenever you're ready.\"",
    "- If silence persists (10+ seconds): \"It seems like we may have a connection issue. I'll have someone call you back shortly. Thank you!\"",
    "- If the caller's audio cuts in and out: \"Your call is breaking up a little. Let me make sure I have your number so we can reach you back.\"",
    "",
    "CONFUSION RECOVERY:",
    "- If you lose track of the conversation: \"Just to make sure I have this right — you're looking to [restate last known intent]?\"",
    "- If the caller asks something completely off-topic: \"That's a great question, but it's a little outside what I can help with on this call. Let me have someone from our team get back to you on that.\"",
    "- If the caller contradicts themselves: go with the MOST RECENT statement. \"Got it — so to confirm, you'd prefer [latest version]?\"",
    "- If the caller gives partial info: ask for what's missing ONE piece at a time. Never ask for 3+ things at once.",
    "",
    "EDGE CASES:",
    "- If a child answers the phone: \"Hi there! Is a parent or guardian available?\" Wait patiently.",
    "- If caller is hard of hearing: speak slowly, use short sentences, repeat key details.",
    "- If voicemail / answering machine: leave a brief, professional message with callback info.",
    "- If caller asks to be put on hold: \"Of course, take your time. I'll be right here.\"",
    "- If multiple people are on the line: address the primary speaker. \"I want to make sure I'm helping the right person — who am I speaking with?\"",
    "- If the caller is clearly wrong about something (wrong business, wrong number): politely correct. \"I think there might be a mix-up — this is {business_name}. Can I still help you with something?\"",
    "",
    "CALL DURATION MANAGEMENT:",
    "- If the call has been going for more than 8 minutes, naturally begin wrapping up: \"I want to make sure I've covered everything — is there anything else I can help with before we wrap up?\"",
    "- If the call has been going for more than 9 minutes, close gracefully: \"I've really enjoyed helping you. Let me make sure we're all set — [summarize key actions]. We'll follow up with a confirmation. Thanks so much for calling!\"",
    "- Never let a call end abruptly without a goodbye.",
    "",
    "ABSOLUTE RULES:",
    "- NEVER hang up on a caller. Always let them end the call or transfer to a human.",
    "- NEVER leave a caller without a next step. Every call ends with: what happens next + when.",
    "- NEVER repeat the same response twice in a row. If they didn't understand, rephrase.",
    "- NEVER ask the caller to \"call back later\" — take ownership and ensure follow-up.",
    "- NEVER make promises the business hasn't authorized (discounts, guarantees, timelines).",
    "- NEVER store or repeat back full credit card numbers, SSNs, or passwords.",
    "- If you're unsure about ANYTHING, capture info and hand off to a human. Better safe than sorry.",
  ].join("\n");

  // Assemble in priority order: identity → business → mission → conversation → language →
  // caller context → call history → industry → agent rules → objections → compliance → recording safety → guardrails
  const blocks = [layer1, layer2];
  if (layer2b) blocks.push(layer2b);
  if (layer2c) blocks.push(layer2c);
  blocks.push(layer3, layer4);
  if (layer5) blocks.push(layer5); // Lead context early so agent can personalize
  if (layer6) blocks.push(layer6); // Call history for returning callers
  if (layer7) blocks.push(layer7); // Industry knowledge
  if (layer7b) blocks.push(layer7b); // Agent rules (never say, transfer, qualification, objections)
  blocks.push(layer8);              // Objection handling
  if (layer9) blocks.push(layer9); // Compliance
  if (layer9b) blocks.push(layer9b); // Recording pause on sensitive
  blocks.push(layer10);             // Guardrails last (always enforced)

  // Replace {business_name} placeholder in objection handling and guardrails
  // Use the sanitized business name for safety
  return blocks.join("\n\n").replace(/\{business_name\}/g, safeBizName);
}

function whenHesitationLabel(id: string): string {
  const m: Record<string, string> = {
    wait_patiently: "Wait patiently",
    ask_what_thinking: "Ask what they're thinking",
    acknowledge_offer_info: "Acknowledge their concern and offer more information",
    offer_alternatives: "Offer alternatives",
    redirect: "Redirect to the main point",
  };
  return m[id] ?? id;
}
function whenThinkLabel(id: string): string {
  const m: Record<string, string> = {
    accept_gracefully: "Accept gracefully",
    offer_follow_up: "Offer to follow up",
    create_urgency: "Create gentle urgency",
    ask_what_help: "Ask what would help them decide",
  };
  return m[id] ?? id;
}
function whenPricingLabel(id: string): string {
  const m: Record<string, string> = {
    give_full: "Give full pricing",
    range_then_pivot: "Give range if available, then pivot to booking",
    redirect_consultation: "Redirect to consultation",
    defer_human: "Defer to human",
  };
  return m[id] ?? id;
}
function whenCompetitorLabel(id: string): string {
  const m: Record<string, string> = {
    acknowledge: "Acknowledge only",
    acknowledge_differentiate: "Acknowledge and differentiate without criticizing",
    redirect_strengths: "Redirect to your strengths",
    defer_human: "Defer to human",
  };
  return m[id] ?? id;
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
    pt: "Portuguese", nl: "Dutch", pl: "Polish", ru: "Russian", ja: "Japanese",
    zh: "Chinese", ko: "Korean", ar: "Arabic", hi: "Hindi", tr: "Turkish",
    vi: "Vietnamese", th: "Thai", id: "Indonesian", ms: "Malay", fil: "Filipino",
    sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish", cs: "Czech",
    uk: "Ukrainian", hu: "Hungarian", ro: "Romanian", bg: "Bulgarian", el: "Greek",
    he: "Hebrew",
  };
  return names[code.toLowerCase().slice(0, 2)] ?? "English";
}
