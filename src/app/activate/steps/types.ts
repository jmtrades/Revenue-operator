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

export interface ElevenLabsVoice {
  id: string;
  name: string;
  labels: Record<string, string>;
  category: string;
}

export interface ActivationState {
  businessName: string;
  industry: string | null;
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
  elevenlabsVoiceId: string;
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
  { id: 1, label: "Business" },
  { id: 2, label: "Agent" },
  { id: 3, label: "Customize" },
  { id: 4, label: "Test" },
  { id: 5, label: "Activate" },
];

export const DAYS: DayId[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEFAULT_HOURS: HoursSlot[] = DAYS.map((day: DayId) => ({
  day,
  enabled: day !== "Sun",
  start: "09:00",
  end: "17:00",
}));
