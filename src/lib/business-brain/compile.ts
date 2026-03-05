/**
 * Business Brain: compile workspace business context + agent into a system prompt
 * for voice agents (e.g. Vapi). Used after onboarding to drive agent behavior.
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
  /** Preferred response language code (e.g. en, es, fr). Agent should switch when caller uses another language. */
  preferred_language?: string;
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
    preferred_language,
  } = input;

  const langName = preferred_language ? getLanguageName(preferred_language) : "English";
  const lines: string[] = [
    `You are ${agent_name}, the phone receptionist for ${business_name}.`,
    "Answer briefly and professionally. Do not make up information.",
    `Respond in ${langName} by default. If the caller speaks another language, switch to that language immediately and continue the conversation in their language so they can be served in their preferred language.`,
  ];

  if (offer_summary) {
    lines.push(`What the business offers: ${offer_summary}`);
  }
  if (services) {
    lines.push(`Services: ${services}`);
  }
  if (business_hours && Object.keys(business_hours).length > 0) {
    const hoursStr = Object.entries(business_hours)
      .filter(([, v]) => v && typeof v === "object" && "start" in v && "end" in v)
      .map(([day, v]) => {
        const h = v as { start: string; end: string };
        return `${day}: ${h.start}-${h.end}`;
      })
      .join("; ");
    if (hoursStr) lines.push(`Business hours: ${hoursStr}`);
  }
  if (emergencies_after_hours === "call_me") {
    lines.push("After hours emergencies: take details and tell the caller someone will call back soon.");
  } else if (emergencies_after_hours === "message") {
    lines.push("After hours: take a message and say someone will call back.");
  } else if (emergencies_after_hours === "next_day") {
    lines.push("After hours: take a message for the next business day.");
  }
  if (appointment_handling === "calendar") {
    lines.push("Appointments: book directly into the calendar when possible.");
  } else if (appointment_handling === "capture") {
    lines.push("Appointments: capture details and say the business will confirm.");
  }
  if (faq_extra) {
    lines.push(`FAQ: ${faq_extra}`);
  }
  faq.forEach((item) => {
    if (item.q && item.a) lines.push(`Q: ${item.q} A: ${item.a}`);
  });
  if (greeting) {
    lines.push(`Opening greeting (use this tone): ${greeting}`);
  }
  lines.push("If you don't know something, say you'll have someone get back to them. Never guess.");

  return lines.join("\n");
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
