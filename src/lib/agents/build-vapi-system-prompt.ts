/**
 * Build the layered system prompt for Vapi from agent + workspace config.
 * Aligned with Recall Touch doctrine: identity, voice rules, knowledge, behavior, qualification, objections, flow.
 */

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
  /** objection trigger -> response pairs */
  objections?: Array<{ trigger?: string; response?: string }>;
  /** phrase when caller seems confused */
  confusedCallerHandling?: string | null;
  /** phrase when caller is off-topic */
  offTopicHandling?: string | null;
  /** business hours text for context */
  businessHours?: string | null;
  /** address for context */
  address?: string | null;
};

const AFTER_HOURS_LABELS: Record<string, string> = {
  messages: "Take a message and say someone will call back.",
  forward: "Offer to schedule a callback.",
  emergency: "Transfer to emergency line.",
  closed: "Tell them the office is closed.",
};

export function buildVapiSystemPrompt(input: AgentPromptInput): string {
  const sections: string[] = [];

  // Layer 1: Identity
  sections.push(
    `IDENTITY:\nYou are ${input.agentName}, the phone assistant for ${input.businessName}${input.industry ? ` (${input.industry})` : ""}. You NEVER mention being an AI. You are simply the person answering the phone. If asked "are you a robot?" say "I'm the phone assistant here. How can I help?"`
  );

  // Layer 2: Voice rules
  const personality =
    input.personality === "friendly" || input.personality === "empathetic"
      ? "Warm and friendly"
      : "Professional and competent";
  const pace =
    input.callStyle === "quick"
      ? "Be concise and direct."
      : input.callStyle === "thorough"
        ? "Take time to explain details when needed."
        : "Natural conversational pace.";
  sections.push(
    `VOICE RULES:\n- Keep every response to 1-2 sentences. This is a phone call.\n- Use contractions and natural speech.\n- Match the caller's energy.\n- Personality: ${personality}\n- Pace: ${pace}`
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
  if (neverSay.length > 0) rules.push(`NEVER mention: ${neverSay.join(", ")}`);

  const alwaysTransfer = (input.rules?.alwaysTransfer ?? []).map((v) => String(v).trim()).filter(Boolean);
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

  if (input.afterHoursMode && AFTER_HOURS_LABELS[input.afterHoursMode]) {
    rules.push(`AFTER HOURS: ${AFTER_HOURS_LABELS[input.afterHoursMode]}`);
  }

  if (rules.length > 0) sections.push(`RULES:\n${rules.join("\n")}`);

  // Layer 6: Qualification
  const criteria = (input.qualificationCriteria ?? []).filter(Boolean);
  if (criteria.length > 0) {
    sections.push(`QUALIFICATION:\nAsk about: ${criteria.join(", ")}`);
  }

  // Layer 7: Objection handling
  const objections = (input.objections ?? []).filter(
    (o) => (o.trigger ?? "").trim() && (o.response ?? "").trim()
  );
  if (objections.length > 0) {
    sections.push(
      `OBJECTION HANDLING:\n${objections
        .map((o) => `If they say "${(o.trigger ?? "").trim()}": ${(o.response ?? "").trim()}`)
        .join("\n")}`
    );
  }

  // Layer 8: Conversation flow + confused/off-topic
  const confused = input.confusedCallerHandling?.trim() || "I'm sorry, let me try to help. Could you tell me what you need?";
  const offTopic =
    input.offTopicHandling?.trim() ||
    "I'm the phone assistant here. I can help with appointments, pricing, and general questions. What can I help with?";
  sections.push(
    `CONVERSATION FLOW:\n1. Greet with your greeting message\n2. Ask how you can help\n3. Listen and clarify if needed\n4. Take action: answer from knowledge, book appointment, capture lead, or transfer\n5. Confirm next steps\n6. Thank them and end naturally\n\nWHEN YOU DON'T KNOW:\nNever make up information. Say "That's a great question. Let me have someone get back to you." Then capture their name and phone number.\n\nIf the caller seems confused: ${confused}\n\nIf the caller is off-topic: ${offTopic}`
  );

  if (input.specialInstructions?.trim()) {
    sections.push(`SPECIAL INSTRUCTIONS:\n${input.specialInstructions.trim()}`);
  }

  sections.push(`Opening greeting to follow: ${input.greeting}`);

  return sections.join("\n\n");
}
