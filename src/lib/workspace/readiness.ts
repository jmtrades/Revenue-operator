export type WorkspaceProgressStep =
  | "business"
  | "agent"
  | "phone"
  | "test_call"
  | "contacts"
  | "calendar"
  | "campaign"
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
  businessAddress?: string | null;
  businessPhone?: boolean;
  agentName?: string | null;
  agentCount?: number;
  knowledgeCount?: number;
  phoneConnected: boolean;
  callCount: number;
  calendarConnected: boolean;
  teamCount: number;
  contactsCount?: number;
  campaignsCount?: number;
};

export function buildWorkspaceReadiness(input: Input): WorkspaceReadiness {
  const hasBusiness =
    Boolean(input.businessName?.trim()) &&
    Boolean(input.businessAddress?.trim()) &&
    input.businessPhone === true;
  const hasAgent = (input.agentCount ?? 0) >= 1 || Boolean(input.agentName?.trim());
  const hasPhone = input.phoneConnected;
  const hasTestCall = input.callCount > 0;
  const hasContacts = (input.contactsCount ?? 0) >= 10;
  const hasCalendar = input.calendarConnected;
  const hasCampaign = (input.campaignsCount ?? 0) >= 1;
  const hasTeam = input.teamCount >= 2;

  const items: WorkspaceProgressItem[] = [
    { key: "business", label: "Set up your business profile", href: "/app/settings/business", completed: hasBusiness },
    { key: "agent", label: "Configure your first AI operator", href: "/app/agents", completed: hasAgent },
    { key: "phone", label: "Get a phone number", href: "/app/settings/phone", completed: hasPhone },
    { key: "test_call", label: "Make a test call", href: "/activate", completed: hasTestCall },
    { key: "contacts", label: "Import your contacts", href: "/app/contacts", completed: hasContacts },
    { key: "calendar", label: "Set up your calendar", href: "/app/settings/integrations", completed: hasCalendar },
    { key: "campaign", label: "Launch your first campaign", href: "/app/campaigns", completed: hasCampaign },
    { key: "team", label: "Invite your team", href: "/app/team", completed: hasTeam },
  ];

  const completed = items.filter((item) => item.completed).length;
  const nextStep = items.find((item) => !item.completed) ?? null;

  let bannerText: string | null = null;
  const bannerHref = "/app/settings/phone";
  const bannerCta = "Connect phone →";

  if (!hasPhone) {
    bannerText = "Almost there — Connect your phone number to start receiving AI-answered calls.";
  }

  const systemEvents = [
    hasAgent
      ? {
          id: "agent-created",
          title: "Agent created",
          body: `${input.agentName || "Your agent"} is ready to answer calls.`,
          href: "/app/agents",
        }
      : null,
    hasBusiness
      ? {
          id: "business-saved",
          title: "Business profile set",
          body: `${input.businessName || "Your workspace"} is set up in the app.`,
          href: "/app/settings/business",
        }
      : null,
    hasPhone
      ? {
          id: "phone-connected",
          title: "Phone connected",
          body: "Your number is ready to receive AI-answered calls.",
          href: "/app/settings/phone",
        }
      : null,
    hasTestCall
      ? {
          id: "first-call",
          title: "Test call completed",
          body: "Your AI has handled a call. Check the call log for details.",
          href: "/app/calls",
        }
      : null,
  ].filter(Boolean) as WorkspaceReadiness["systemEvents"];

  return {
    items,
    completed,
    total: items.length,
    nextStep,
    showBanner: !hasPhone && Boolean(bannerText),
    bannerText,
    bannerHref,
    bannerCta,
    systemEvents,
  };
}
