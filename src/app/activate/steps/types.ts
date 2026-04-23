import type { Persona } from "@/lib/workspace/personalization";

/**
 * Phase 78 Task 10.1: expanded from 1-4 to 1-6 so the "Go Live" phase (which
 * used to render PackBusinessStep + CustomizeStep + ActivateStep stacked under
 * a single `step === 4` branch) is split into three distinct steps. The wizard
 * now renders exactly ONE step component at a time.
 */
export type StepId = 1 | 2 | 3 | 4 | 5 | 6;

export type AgentTemplateId = string;

export type DayId = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type TestFeedback = "up" | "down" | null;

export interface HoursSlot {
  day: DayId;
  enabled: boolean;
  start: string;
  end: string;
}

export type OrgTypeId = "business" | "solo" | "team" | "agency" | "personal" | "other";
export type UseCaseId = "answer" | "book" | "followup" | "afterhours" | "outbound" | "route";

export interface VoiceOption {
  id: string;
  name: string;
  labels: Record<string, string>;
  category: string;
}

export interface ActivationState {
  businessName: string;
  industry: string | null;
  /** Pack id: dental, hvac, legal, … */
  industryPackId: string | null;
  businessLocation: string;
  businessPhone: string;
  orgType: OrgTypeId | null;
  useCases: UseCaseId[];
  agentTemplate: AgentTemplateId | null;
  agentName: string;
  hours: HoursSlot[];
  greeting: string;
  services: string[];
  lastTestFeedback: TestFeedback;
  preferredLanguage: string;
  voiceId: string;
  goals: string[];
  /**
   * Phase 1 personalization — user-facing persona captured in GoalStep.
   * Drives template filtering and default dashboard layout.
   * Persisted to workspace_members.persona on workspace/create.
   */
  persona: Persona | null;
}

export const ORG_TYPES: { id: OrgTypeId; label: string }[] = [
  { id: "business", label: "Business" },
  { id: "solo", label: "Solo operator" },
  { id: "team", label: "Team" },
  { id: "agency", label: "Agency" },
  { id: "personal", label: "Personal" },
  { id: "other", label: "Other" },
];

export const USE_CASE_OPTIONS: { id: UseCaseId; label: string }[] = [
  { id: "answer", label: "Answer incoming calls" },
  { id: "book", label: "Book appointments" },
  { id: "followup", label: "Follow up with leads" },
  { id: "afterhours", label: "Handle after-hours calls" },
  { id: "outbound", label: "Run outbound campaigns" },
  { id: "route", label: "Route and triage calls" },
];

export const GOAL_OPTIONS = [
  { id: "recover_missed", label: "Handle inbound calls", desc: "AI answers when you can't — no call goes unanswered", icon: "PhoneIncoming" },
  { id: "outbound_followup", label: "Outbound follow-up", desc: "Automatically follow up with leads via call, SMS, or email", icon: "PhoneOutgoing" },
  { id: "book_appointments", label: "Book appointments", desc: "Qualify callers and book directly into your calendar", icon: "CalendarCheck" },
  { id: "reactivation", label: "Reactivate past clients", desc: "Win back dormant leads and past customers", icon: "UserPlus" },
  { id: "support_triage", label: "Support triage", desc: "Route calls to the right person or handle FAQs", icon: "Headphones" },
  { id: "speed_to_lead", label: "Speed-to-lead", desc: "Call new leads within 60 seconds of form submission", icon: "Zap" },
] as const;

export const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "Choose your plan" },
  { id: 2, label: "Your Goals" },
  { id: 3, label: "Connect Phone" },
  { id: 4, label: "Your Business" },
  { id: 5, label: "Customize Agent" },
  { id: 6, label: "Go Live" },
];

export const DAYS: DayId[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEFAULT_HOURS: HoursSlot[] = DAYS.map((day: DayId) => ({
  day,
  enabled: day !== "Sun",
  start: "09:00",
  end: "17:00",
}));
