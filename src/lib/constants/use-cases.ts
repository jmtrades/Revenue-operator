/**
 * Use-case options for onboarding: "What will your AI handle?"
 * Multi-select; drives default agent config and knowledge starters (not industry).
 */

export const USE_CASE_OPTIONS: { id: string; label: string }[] = [
  { id: "answer_calls", label: "Answer calls" },
  { id: "book_appointments", label: "Book appointments" },
  { id: "qualify_leads", label: "Qualify leads" },
  { id: "customer_support", label: "Customer support" },
  { id: "sales_calls", label: "Sales calls" },
  { id: "follow_ups", label: "Follow-ups" },
];

export function getUseCaseLabels(ids: string[]): string[] {
  return ids.map((id) => USE_CASE_OPTIONS.find((u) => u.id === id)?.label ?? id).filter(Boolean);
}
