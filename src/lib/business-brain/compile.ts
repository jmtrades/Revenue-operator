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
  } = input;

  const lines: string[] = [
    `You are ${agent_name}, the phone receptionist for ${business_name}.`,
    "Answer briefly and professionally. Do not make up information.",
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
