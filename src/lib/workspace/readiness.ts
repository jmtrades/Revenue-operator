export type WorkspaceProgressStep =
  | "business"
  | "agent"
  | "services"
  | "phone"
  | "test_call"
  | "first_call"
  | "calendar"
  | "team";

export type WorkspaceProgressItem = {
  key: WorkspaceProgressStep;
  label: string;
  href: string;
  completed: boolean;
};

export type WorkspaceReadiness = {
  items: WorkspaceProgressItem[];
  completed: number;
  total: number;
  nextStep: WorkspaceProgressItem | null;
  showBanner: boolean;
  bannerText: string | null;
  bannerHref: string;
  bannerCta: string;
  systemEvents: Array<{ id: string; title: string; body: string; href: string }>;
};

type Input = {
  businessName?: string | null;
  agentName?: string | null;
  knowledgeCount: number;
  phoneConnected: boolean;
  callCount: number;
  calendarConnected: boolean;
  teamCount: number;
};

export function buildWorkspaceReadiness(input: Input): WorkspaceReadiness {
  const hasBusiness = Boolean(input.businessName?.trim());
  const hasAgent = Boolean(input.agentName?.trim());
  const hasServices = input.knowledgeCount > 0;
  const hasPhone = input.phoneConnected;
  const hasTestCall = input.callCount > 0;
  const hasFirstCall = input.callCount > 0;
  const hasCalendar = input.calendarConnected;
  const hasTeam = input.teamCount > 0;

  const items: WorkspaceProgressItem[] = [
    { key: "business", label: "Business info added", href: "/app/onboarding", completed: hasBusiness },
    { key: "agent", label: "AI agent created", href: "/app/settings/agent", completed: hasAgent },
    { key: "services", label: "Services configured", href: "/app/settings/agent", completed: hasServices },
    { key: "phone", label: "Phone number connected", href: "/app/settings/phone", completed: hasPhone },
    { key: "test_call", label: "First test call", href: "/app/onboarding", completed: hasTestCall },
    { key: "first_call", label: "First real call", href: "/app/activity", completed: hasFirstCall },
    { key: "calendar", label: "Calendar connected", href: "/app/settings/integrations", completed: hasCalendar },
    { key: "team", label: "Team member invited", href: "/app/team", completed: hasTeam },
  ];

  const completed = items.filter((item) => item.completed).length;
  const nextStep = items.find((item) => !item.completed) ?? null;

  let bannerText: string | null = null;
  let bannerHref = nextStep?.href ?? "/app/activity";
  let bannerCta = nextStep ? "Set up →" : "Dashboard →";

  if (!hasPhone) {
    bannerText = "Almost there! Connect your phone number to start receiving real calls.";
    bannerHref = "/app/settings/phone";
    bannerCta = "Connect number →";
  } else if (!hasTestCall) {
    bannerText = "Your AI is ready. Place a quick test call to hear it live.";
    bannerHref = "/app/onboarding";
    bannerCta = "Test your agent →";
  } else if (nextStep) {
    bannerText = "Your setup is nearly complete. Finish the next step to go fully live.";
  }

  const systemEvents = [
    hasAgent
      ? {
          id: "agent-created",
          title: "Agent created",
          body: `${input.agentName || "Your agent"} is ready to answer calls.`,
          href: "/app/settings/agent",
        }
      : null,
    hasBusiness
      ? {
          id: "business-saved",
          title: "Business info saved",
          body: `${input.businessName || "Your workspace"} is set up in the app.`,
          href: "/app/settings/business",
        }
      : null,
    hasServices
      ? {
          id: "knowledge-seeded",
          title: "Starter knowledge added",
          body: `${input.knowledgeCount} answers are ready for your agent.`,
          href: "/app/settings/agent",
        }
      : null,
  ].filter(Boolean) as WorkspaceReadiness["systemEvents"];

  return {
    items,
    completed,
    total: items.length,
    nextStep,
    showBanner: Boolean(bannerText),
    bannerText,
    bannerHref,
    bannerCta,
    systemEvents,
  };
}
