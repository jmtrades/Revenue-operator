import { getIndustryLabel, getServicesForIndustry } from "@/lib/constants/industries";

export type KnowledgeItem = { q?: string; a?: string };

type BuildStarterKnowledgeInput = {
  industry?: string | null;
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
  address,
  businessHours,
  services,
}: BuildStarterKnowledgeInput): KnowledgeItem[] {
  const suggestedServices =
    Array.isArray(services) && services.length > 0
      ? services
      : getServicesForIndustry(industry ?? null);
  const serviceText =
    suggestedServices.length > 0
      ? `We help with ${suggestedServices.slice(0, 5).join(", ")}.`
      : `We help customers with ${getIndustryLabel(industry ?? null).toLowerCase()} requests.`;

  const items: KnowledgeItem[] = [
    {
      q: "What are your hours?",
      a: formatBusinessHours(businessHours),
    },
    {
      q: "What services do you offer?",
      a: serviceText,
    },
    {
      q: "How do I book an appointment?",
      a: "I can help book that for you right now. What day works best?",
    },
    {
      q: "What's your pricing?",
      a: "That depends on what you need. We can take your details and have someone follow up with exact pricing.",
    },
  ];

  if (address?.trim()) {
    items.splice(1, 0, {
      q: "Where are you located?",
      a: `We're located at ${address.trim()}.`,
    });
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
