export type StepId = 1 | 2 | 3 | 4 | 5;

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

export const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "You" },
  { id: 2, label: "Business" },
  { id: 3, label: "Phone" },
  { id: 4, label: "AI setup" },
  { id: 5, label: "Go live" },
];

export const DAYS: DayId[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEFAULT_HOURS: HoursSlot[] = DAYS.map((day: DayId) => ({
  day,
  enabled: day !== "Sun",
  start: "09:00",
  end: "17:00",
}));
