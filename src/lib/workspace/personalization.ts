/**
 * Phase 1 — Role-based personalization foundation.
 *
 * `Persona` is a user-facing label ("what kind of operator are you?") that's
 * orthogonal to the RBAC `role` (owner/admin/manager/viewer). Persona drives:
 *   - which agent templates are surfaced first during activation
 *   - default dashboard card ordering
 *   - which settings sections are emphasized in the Control Panel (Phase 5)
 *
 * Persona lives on `workspace_members.persona` (migration
 * 20260422_workspace_member_personalization.sql).
 */

export type Persona =
  | "owner"
  | "sales_manager"
  | "sdr"
  | "office_manager"
  | "agency_operator"
  | "solo_operator";

export interface PersonaOption {
  id: Persona;
  label: string;
  description: string;
  /** lucide-react icon name; resolved by the consumer to keep this file server-safe */
  icon:
    | "Building2"
    | "LineChart"
    | "PhoneOutgoing"
    | "Headphones"
    | "Users"
    | "User";
}

export const PERSONA_OPTIONS: readonly PersonaOption[] = [
  {
    id: "owner",
    label: "Owner / operator",
    description: "Run the whole business. Want revenue per hour, not configs.",
    icon: "Building2",
  },
  {
    id: "sales_manager",
    label: "Sales manager",
    description: "Manage a team or pipeline. Optimize conversion and speed-to-lead.",
    icon: "LineChart",
  },
  {
    id: "sdr",
    label: "SDR / outbound rep",
    description: "Run outbound campaigns, set meetings, work follow-up lists.",
    icon: "PhoneOutgoing",
  },
  {
    id: "office_manager",
    label: "Office / front desk",
    description: "Cover inbound calls, take messages, route, book appointments.",
    icon: "Headphones",
  },
  {
    id: "agency_operator",
    label: "Agency / reseller",
    description: "Run agents on behalf of clients. Multi-brand, multi-workspace.",
    icon: "Users",
  },
  {
    id: "solo_operator",
    label: "Solo professional",
    description: "It's just me. I need one AI that covers everything.",
    icon: "User",
  },
];

export const ALL_PERSONAS: readonly Persona[] = PERSONA_OPTIONS.map((p) => p.id);

export function isPersona(value: unknown): value is Persona {
  return typeof value === "string" && ALL_PERSONAS.includes(value as Persona);
}

/**
 * Narrow a list of templates to the ones relevant to a persona. If the
 * template has no `personas` metadata, it's shown to everyone.
 *
 * Order is preserved; non-matching templates are sorted to the bottom so
 * callers can render "Recommended for you" vs. "All templates" cleanly.
 */
export function filterTemplatesForPersona<
  T extends { personas?: readonly Persona[] },
>(templates: readonly T[], persona: Persona | null | undefined): T[] {
  if (!persona) return [...templates];
  const matches: T[] = [];
  const rest: T[] = [];
  for (const t of templates) {
    if (!t.personas || t.personas.length === 0 || t.personas.includes(persona)) {
      matches.push(t);
    } else {
      rest.push(t);
    }
  }
  return [...matches, ...rest];
}

/**
 * Dashboard card ordering per persona. Consumed by `UnifiedDashboard` via
 * `getDashboardCardOrder`. Member-level `dashboard_config.cards` overrides
 * this (see migration 20260422).
 *
 * Card ids intentionally match the existing component file names in
 * src/components/dashboard/ — this keeps the mapping explicit and greppable.
 */
export const PERSONA_DASHBOARD_DEFAULTS: Record<Persona, readonly string[]> = {
  owner: [
    "RevenueImpactCard",
    "RecoveryScoreCard",
    "NeedsAttentionList",
    "AppointmentManagementCard",
    "AutonomousBriefing",
    "CampaignPerformanceCard",
    "RecentCallsList",
    "OperatorPercentile",
  ],
  sales_manager: [
    "CampaignPerformanceCard",
    "OutboundCampaignCard",
    "RevenueImpactCard",
    "CoachingReportCard",
    "LiveCallFeed",
    "NeedsAttentionList",
    "OperatorPercentile",
    "RecentCallsList",
  ],
  sdr: [
    "OutboundCampaignCard",
    "LiveCallFeed",
    "RecentCallsList",
    "NeedsAttentionList",
    "CampaignPerformanceCard",
    "EscalationLogCard",
    "CoachingReportCard",
    "AutomationEngineCard",
  ],
  office_manager: [
    "RecentCallsList",
    "AppointmentManagementCard",
    "NeedsAttentionList",
    "CallRecordingsCard",
    "CallTransferCard",
    "DNCManagementCard",
    "LiveCallFeed",
    "NotificationCenter",
  ],
  agency_operator: [
    "RevenueImpactCard",
    "CampaignPerformanceCard",
    "OperatorPercentile",
    "AutonomousBrainCard",
    "AutomationEngineCard",
    "RecoveryScoreCard",
    "IntelligenceCard",
    "RecentCallsList",
  ],
  solo_operator: [
    "AutonomousBriefing",
    "RecentCallsList",
    "AppointmentManagementCard",
    "NeedsAttentionList",
    "RevenueImpactCard",
    "RecoveryScoreCard",
    "RecommendationsCard",
    "NotificationCenter",
  ],
};

export interface DashboardCardConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface MemberDashboardConfig {
  cards?: DashboardCardConfig[];
}

/**
 * Resolve the card order for a member. Member override wins; falls back to
 * persona default; falls back to a generic default if persona is null.
 */
export function getDashboardCardOrder(
  persona: Persona | null | undefined,
  memberConfig: MemberDashboardConfig | null | undefined,
): string[] {
  const fromMember = memberConfig?.cards;
  if (fromMember && fromMember.length > 0) {
    return fromMember
      .filter((c) => c.visible !== false)
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);
  }
  if (persona && PERSONA_DASHBOARD_DEFAULTS[persona]) {
    return [...PERSONA_DASHBOARD_DEFAULTS[persona]];
  }
  // Generic fallback — the current hand-coded order is roughly owner-ish.
  return [...PERSONA_DASHBOARD_DEFAULTS.owner];
}

/**
 * Map a legacy onboarding `orgType` to a sensible persona default.
 * Used so users who completed activation before this migration still get
 * a meaningful persona on first dashboard load.
 */
export function personaFromOrgType(orgType: string | null | undefined): Persona | null {
  switch (orgType) {
    case "solo":
    case "personal":
      return "solo_operator";
    case "agency":
      return "agency_operator";
    case "team":
      return "sales_manager";
    case "business":
      return "owner";
    default:
      return null;
  }
}
