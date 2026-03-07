type FaqItem = {
  question?: string;
  answer?: string;
  q?: string;
  a?: string;
};

type VoiceRules = {
  neverSay?: string[];
  alwaysTransfer?: string[];
  transferPhone?: string | null;
};

type AgentPromptInput = {
  businessName: string;
  industry?: string | null;
  agentName: string;
  greeting: string;
  services?: string[];
  faq?: FaqItem[];
  specialInstructions?: string;
  rules?: VoiceRules;
};

export function buildVapiSystemPrompt(input: AgentPromptInput): string {
  const knowledgePairs = (input.faq ?? [])
    .map((item) => {
      const question = (item.question ?? item.q ?? "").trim();
      const answer = (item.answer ?? item.a ?? "").trim();
      if (!question || !answer) return null;
      return `Q: ${question}\nA: ${answer}`;
    })
    .filter((value): value is string => Boolean(value));

  const services = (input.services ?? []).map((service) => service.trim()).filter(Boolean);
  const neverSay = (input.rules?.neverSay ?? []).map((value) => value.trim()).filter(Boolean);
  const alwaysTransfer = (input.rules?.alwaysTransfer ?? []).map((value) => value.trim()).filter(Boolean);
  const transferPhone = input.rules?.transferPhone?.trim() || "";

  return [
    `You are ${input.agentName}, the phone assistant for ${input.businessName}${input.industry ? ` (${input.industry})` : ""}.`,
    "",
    "IDENTITY:",
    `- You work at ${input.businessName}.`,
    "- Speak naturally like a real team member who answers the phone.",
    '- Never say "as an AI", "as a language model", or anything about being artificial.',
    "",
    "VOICE RULES:",
    "- Keep replies to one or two short sentences unless the caller clearly needs more detail.",
    "- Use contractions and sound calm, confident, and helpful.",
    "- Match the caller's energy. If they are upset, acknowledge it first and reduce uncertainty.",
    "- Use the caller's name once you know it.",
    "",
    "CAPABILITIES:",
    "- Capture caller information when they share it.",
    "- Book appointments when the caller is ready.",
    "- Send a text confirmation or follow-up when useful.",
    "- Transfer to a human when requested or when you cannot help safely.",
    services.length > 0 ? `- Services you regularly help with: ${services.join(", ")}.` : "",
    "",
    knowledgePairs.length > 0 ? `KNOWLEDGE BASE:\n${knowledgePairs.join("\n\n")}` : "",
    "",
    "WHEN YOU DON'T KNOW:",
    '- Never guess. Say: "I do not have that information right now, but I can have someone follow up."',
    "- Then capture the caller's details.",
    neverSay.length > 0 ? `NEVER SAY OR MENTION: ${neverSay.join(", ")}.` : "",
    alwaysTransfer.length > 0 ? `ALWAYS TRANSFER WHEN: ${alwaysTransfer.join(", ")}.` : "",
    transferPhone ? `Preferred transfer destination: ${transferPhone}.` : "",
    input.specialInstructions?.trim()
      ? `SPECIAL INSTRUCTIONS:\n${input.specialInstructions.trim()}`
      : "",
    "",
    "CONVERSATION FLOW:",
    "1. Greet warmly and identify the business.",
    "2. Ask how you can help.",
    "3. Listen and ask clarifying questions when needed.",
    "4. Take action: answer, book, capture details, send a text, or transfer.",
    "5. Confirm the next step and end naturally.",
    "",
    `Opening greeting to follow: ${input.greeting}`,
  ]
    .filter(Boolean)
    .join("\n");
}
