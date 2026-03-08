import { getIndustryLabel, getServicesForIndustry } from "@/lib/constants/industries";

export type KnowledgeItem = { q?: string; a?: string };

type BuildStarterKnowledgeInput = {
  industry?: string | null;
  useCases?: string[] | null;
  address?: string | null;
  businessHours?: Record<string, unknown> | null;
  services?: string[] | null;
};

function normalizeQuestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCaseDay(value: string): string {
  if (!value) return value;
  return value[0]!.toUpperCase() + value.slice(1).toLowerCase();
}

export function formatBusinessHours(
  businessHours?: Record<string, unknown> | null,
): string {
  if (!businessHours || typeof businessHours !== "object") {
    return "We're open Monday through Friday from 9:00 AM to 5:00 PM.";
  }

  const dayOrder = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const lines = dayOrder
    .map((day) => {
      const raw = businessHours[day];
      if (!raw || typeof raw !== "object") return null;
      const slot = raw as {
        start?: string;
        end?: string;
        open?: string;
        close?: string;
        closed?: boolean;
      };
      if (slot.closed) return `${titleCaseDay(day)}: Closed`;
      const start = slot.start ?? slot.open;
      const end = slot.end ?? slot.close;
      if (!start || !end) return null;
      return `${titleCaseDay(day)}: ${start} - ${end}`;
    })
    .filter(Boolean);

  if (lines.length === 0) {
    return "We're open Monday through Friday from 9:00 AM to 5:00 PM.";
  }
  if (lines.length <= 2) {
    return lines.join(". ");
  }
  return lines.slice(0, 5).join(". ");
}

export function buildStarterKnowledge({
  industry,
  useCases,
  address,
  businessHours,
  services,
}: BuildStarterKnowledgeInput): KnowledgeItem[] {
  const useCaseSet = new Set(Array.isArray(useCases) ? useCases : []);
  const suggestedServices =
    Array.isArray(services) && services.length > 0
      ? services
      : getServicesForIndustry(industry ?? null);
  const serviceText =
    suggestedServices.length > 0
      ? `We help with ${suggestedServices.slice(0, 5).join(", ")}.`
      : `We help customers with ${getIndustryLabel(industry ?? null).toLowerCase()} requests.`;

  const items: KnowledgeItem[] = [];

  // Answer calls: hours, location, services, pricing, contact
  if (useCaseSet.has("answer_calls") || useCaseSet.size === 0) {
    items.push({ q: "What are your hours?", a: formatBusinessHours(businessHours) });
    items.push({ q: "What services do you offer?", a: serviceText });
    if (address?.trim()) {
      items.push({ q: "Where are you located?", a: `We're located at ${address.trim()}.` });
    }
    items.push({
      q: "What's your pricing?",
      a: "That depends on what you need. We can take your details and have someone follow up with exact pricing.",
    });
  }

  // Book appointments
  if (useCaseSet.has("book_appointments")) {
    items.push({
      q: "How do I book an appointment?",
      a: "I can help book that for you right now. What day works best?",
    });
    items.push({
      q: "What's your availability?",
      a: "I can check availability and book a time that works for you. What day do you prefer?",
    });
    items.push({
      q: "How long are appointments?",
      a: "Most appointments are 30–60 minutes. I can confirm the exact duration when we book.",
    });
    items.push({
      q: "How do I cancel or reschedule?",
      a: "Reply to your confirmation or call back and I can help you reschedule or cancel.",
    });
  }

  // Qualify leads
  if (useCaseSet.has("qualify_leads")) {
    items.push({
      q: "What information do you collect from new leads?",
      a: "I'll get your name, phone number, and what you're looking for so the right person can follow up quickly.",
    });
  }

  // Customer support
  if (useCaseSet.has("customer_support")) {
    items.push({
      q: "What if I have a problem with my order?",
      a: "I can take your details and have someone from the team follow up. What's the best number to reach you?",
    });
    items.push({
      q: "What's your return policy?",
      a: "I'll capture your question and have the team get back to you with our return policy details.",
    });
  }

  // Sales calls
  if (useCaseSet.has("sales_calls")) {
    items.push({
      q: "Tell me about your product.",
      a: "I can give you a quick overview and have a specialist follow up with details and pricing.",
    });
    items.push({
      q: "What are the main benefits?",
      a: "I'll take your info and have someone walk you through benefits and next steps.",
    });
  }

  // Follow-ups
  if (useCaseSet.has("follow_ups")) {
    items.push({
      q: "I was expecting a callback.",
      a: "I'll make sure the right person has your details and follows up as soon as possible.",
    });
  }

  // If no use cases selected, keep default set
  if (items.length === 0) {
    items.push(
      { q: "What are your hours?", a: formatBusinessHours(businessHours) },
      { q: "What services do you offer?", a: serviceText },
      { q: "How do I book an appointment?", a: "I can help book that for you right now. What day works best?" },
      { q: "What's your pricing?", a: "That depends on what you need. We can take your details and have someone follow up with exact pricing." }
    );
    if (address?.trim()) {
      items.splice(1, 0, { q: "Where are you located?", a: `We're located at ${address.trim()}.` });
    }
  }

  return items;
}

export function mergeKnowledgeItems(
  existing: KnowledgeItem[] | null | undefined,
  starter: KnowledgeItem[],
): KnowledgeItem[] {
  const seen = new Set<string>();
  const next: KnowledgeItem[] = [];

  for (const item of [...(existing ?? []), ...starter]) {
    const q = typeof item?.q === "string" ? item.q.trim() : "";
    const a = typeof item?.a === "string" ? item.a.trim() : "";
    if (!q || !a) continue;
    const key = normalizeQuestion(q);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ q, a });
  }

  return next;
}
