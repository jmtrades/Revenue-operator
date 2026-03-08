/**
 * Business Brain: compile workspace business context + agent into a system prompt
 * for voice agents (e.g. Vapi). Four layers: identity, business context, conversation skills, language.
 */

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
  } = input;

  const langName = preferred_language ? getLanguageName(preferred_language) : "English";

  // Layer 1: Identity & boundaries
  const layer1 = [
    `You are ${agent_name}, the phone assistant for ${business_name}. You answer calls on their behalf.`,
    "You handle the ENTIRE call naturally. There is no fixed script — listen to what the caller says and respond. Move the conversation toward a clear outcome: answer questions, book appointments, capture leads, take a message, or transfer. Adapt to whatever they need.",
    "You are NOT a chatbot. You are speaking on a phone call. Keep responses SHORT — 1-2 sentences max.",
    'Never say "as an AI" or "I\'m an AI assistant." You are simply the person answering the phone.',
    `If asked "are you a robot?" say "I'm ${business_name}'s phone assistant. How can I help?"`,
    "Never make up information you don't know. If unsure, say \"Let me have someone get back to you on that.\"",
    "Never discuss competitors. Never give medical/legal/financial advice.",
  ].join("\n");

  // Layer 2: Business context
  const businessLines: string[] = [
    `Business: ${business_name}`,
    ...(industry ? [`Industry: ${industry}`] : []),
    ...(phone ? [`Phone: ${phone}`] : []),
    ...(address ? [`Location: ${address}`] : []),
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
  if (offer_summary) businessLines.push(`What we offer: ${offer_summary}`);
  if (services) businessLines.push(`Services: ${services}`);
  if (emergencies_after_hours === "call_me") {
    businessLines.push("After hours emergencies: take details and tell the caller someone will call back soon.");
  } else if (emergencies_after_hours === "message") {
    businessLines.push("After hours: take a message and say someone will call back.");
  } else if (emergencies_after_hours === "next_day") {
    businessLines.push("After hours: take a message for the next business day.");
  }
  if (appointment_handling === "calendar") {
    businessLines.push("Appointments: book directly into the calendar when possible.");
  } else if (appointment_handling === "capture") {
    businessLines.push("Appointments: capture details and say the business will confirm.");
  }
  businessLines.push("");
  businessLines.push("Knowledge Base:");
  faq.forEach((item) => {
    if (item.q && item.a) businessLines.push(`Q: ${item.q}\nA: ${item.a}`);
  });
  if (faq_extra) businessLines.push(faq_extra);
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
  if (business_context?.trim()) missionParts.push(`Business context: ${business_context.trim()}`);
  if (target_audience?.trim()) missionParts.push(`Target audience: ${target_audience.trim()}`);
  if (typeof assertiveness === "number") {
    if (assertiveness >= 70) missionParts.push("Tone: Be direct and confident.");
    else if (assertiveness <= 30) missionParts.push("Tone: Be gentle and patient.");
    else missionParts.push("Tone: Balance warmth with clarity.");
  }
  if (when_hesitation?.trim()) missionParts.push(`When caller hesitates: ${whenHesitationLabel(when_hesitation)}`);
  if (when_think_about_it?.trim()) missionParts.push(`When they say "let me think": ${whenThinkLabel(when_think_about_it)}`);
  if (when_pricing?.trim()) missionParts.push(`When they ask about pricing: ${whenPricingLabel(when_pricing)}`);
  if (when_competitor?.trim()) missionParts.push(`When they mention a competitor: ${whenCompetitorLabel(when_competitor)}`);
  const learned = (learned_behaviors ?? []).filter((b) => String(b).trim());
  if (learned.length > 0) missionParts.push("Learned behaviors (from real calls): " + learned.map((b) => b.trim()).join(". "));
  const layer2b = missionParts.length > 0 ? "MISSION / STRATEGY:\n" + missionParts.join("\n") : "";

  // Layer 3: Conversation skills
  const layer3 = [
    "CONVERSATION RULES:",
    "- Start with the greeting, then LISTEN. Don't talk over the caller.",
    "- Match the caller's energy. If they're rushed, be concise. If chatty, be warm.",
    "- Use the caller's name once you know it. e.g. \"Of course, Sarah.\"",
    "- When booking: confirm date, time, and service. Read it back.",
    "- When qualifying leads: ask name, phone/email, what they need, timeline. Don't interrogate — converse.",
    "- If the caller is upset: acknowledge first (\"I completely understand that's frustrating\"), then solve.",
    "- If you don't understand: \"I'm sorry, could you repeat that?\" — never guess.",
    "- If the caller wants a human: \"Absolutely, let me connect you. One moment.\" → transfer or take a message.",
    "",
    "NATURAL SPEECH:",
    "- Use contractions: \"I'll\", \"we're\", \"that's\"",
    "- Use filler acknowledgments: \"Sure thing\", \"Absolutely\", \"Of course\", \"Got it\"",
    "- Keep it conversational: \"Let me check on that for you\" not \"I will now look up that information\"",
    ...(greeting ? [`Opening greeting (use this tone): ${greeting}`] : []),
  ].join("\n");

  // Layer 4: Language & multilingual
  const layer4 = [
    `Primary language: ${langName}`,
    "If the caller speaks a different language, switch to match them.",
    "Always respond in the language the caller is using.",
    `If unsure of the language, default to ${langName}.`,
  ].join("\n");

  const blocks = [layer1, layer2, layer3, layer4];
  if (layer2b) blocks.splice(2, 0, layer2b);
  return blocks.join("\n\n");
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
