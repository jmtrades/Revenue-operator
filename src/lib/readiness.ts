/**
 * Readiness scoring for dashboard and agent cards.
 * Weights sum to 100; percentage = sum of weights for completed items.
 */

export interface ReadinessItem {
  key: string;
  done: boolean;
  weight: number;
  href: string;
}

export interface ReadinessWorkspace {
  business_name?: string | null;
  name?: string | null;
  use_cases?: string[];
  phone_number?: string | null;
  phoneConnected?: boolean;
  onboarding_completed?: boolean;
}

export interface ReadinessAgent {
  voice_id?: string | null;
  greeting?: string | null;
  knowledge_base?: { faq?: Array<{ q?: string; a?: string }> } | null;
  rules?: { alwaysTransfer?: unknown[]; neverSay?: unknown[] } | null;
  recall_agent_id?: string | null;
  tested_at?: string | null;
}

export function calculateReadiness(
  workspace: ReadinessWorkspace | null | undefined,
  agent: ReadinessAgent | null | undefined
): { percentage: number; items: ReadinessItem[]; nextAction: ReadinessItem | null } {
  const ws = workspace ?? {};
  const ag = agent ?? {};
  const businessName = (ws.business_name ?? ws.name ?? "").trim();
  const useCasesOk = (ws.use_cases?.length ?? 0) >= 1;
  const phoneConnected = Boolean(ws.phone_number ?? ws.phoneConnected);
  const faq = ag.knowledge_base?.faq ?? [];
  const faqCount = Array.isArray(faq) ? faq.filter((e) => (e?.q ?? "").trim() && (e?.a ?? "").trim()).length : 0;
  const hasBehavior =
    (Array.isArray(ag.rules?.alwaysTransfer) && ag.rules.alwaysTransfer.length > 0) ||
    (Array.isArray(ag.rules?.neverSay) && ag.rules.neverSay.length > 0);

  const items: ReadinessItem[] = [
    { key: "business", done: !!businessName, weight: 10, href: "/app/settings/business" },
    { key: "use_cases", done: useCasesOk, weight: 5, href: "/activate" },
    { key: "agent", done: !!agent, weight: 10, href: "/app/agents" },
    { key: "voice", done: !!(ag.voice_id ?? "").toString().trim(), weight: 5, href: "/app/agents" },
    { key: "greeting", done: !!(ag.greeting && ag.greeting.length > 10), weight: 5, href: "/app/agents" },
    { key: "knowledge", done: faqCount >= 3, weight: 15, href: "/app/agents" },
    { key: "behavior", done: hasBehavior, weight: 10, href: "/app/agents" },
    { key: "phone", done: phoneConnected, weight: 15, href: "/app/settings/phone" },
    { key: "tested", done: !!(ag.tested_at ?? "").toString().trim(), weight: 10, href: "/app/agents" },
    { key: "launched", done: !!(ag.recall_agent_id ?? "").toString().trim(), weight: 15, href: "/app/agents" },
  ];

  const percentage = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  const nextAction = items.find((item) => !item.done) ?? null;

  return { percentage, items, nextAction };
}
