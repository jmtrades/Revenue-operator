"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  BellRing,
  Calendar,
  ChevronDown,
  ClipboardList,
  Moon,
  PhoneCall,
  PhoneForwarded,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AgentList } from "./components/AgentList";
import { AgentDetail } from "./components/AgentDetail";
import { VoiceSelector } from "./components/VoiceSelector";
import { IdentityStepContent } from "./components/IdentityStepContent";
import { BehaviorStepContent } from "./components/BehaviorStepContent";
import { GoLiveStepContent } from "./components/GoLiveStepContent";
import { KnowledgeStepContent } from "./components/KnowledgeStepContent";
import { TestStepContent } from "./components/TestStepContent";
import {
  AGENT_TEMPLATES,
  AGENT_TEMPLATE_CATEGORIES,
  type AgentTemplateCategory,
} from "@/lib/data/agent-templates";
import {
  RECALL_VOICES,
  DEFAULT_RECALL_VOICE_ID,
  type RecallVoice,
} from "@/lib/constants/recall-voices";
import { getTemplateVoiceId } from "@/lib/data/agent-templates";
import { HUMAN_VOICE_DEFAULTS } from "@/lib/voice/human-voice-defaults";
import { VOICEMAIL_DROP_TEMPLATES } from "@/lib/voice/voicemail-detection";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { calculateReadiness, type ReadinessAgent } from "@/lib/readiness";

type CallStyle = "thorough" | "conversational" | "quick";

export type AgentTemplateId =
  | "receptionist"
  | "after_hours"
  | "emergency"
  | "lead_qualifier"
  | "follow_up"
  | "review_request"
  | "appointment_setter"
  | "support"
  | "scratch";

export type AgentPurpose = "inbound" | "outbound" | "both";

export type PrimaryGoalId =
  | "answer_route"
  | "book_appointments"
  | "qualify_leads"
  | "support"
  | "sales"
  | "follow_up"
  | "custom";

export type Agent = {
  id: string;
  name: string;
  template: AgentTemplateId;
  purpose?: AgentPurpose;
  primaryGoal: PrimaryGoalId;
  businessContext: string;
  targetAudience: string;
  voice: string;
  greeting: string;
  personality: number;
  callStyle: CallStyle;
  active: boolean;
  services: string[];
  faq: Array<{ id: string; question: string; answer: string }>;
  specialInstructions: string;
  websiteUrl?: string;
  test_call_completed?: boolean;
  stats: {
    avgRating: number;
    totalCalls: number;
    appointmentsBooked: number;
  };
  neverSay: string[];
  alwaysTransfer: string[];
  escalationChain: string[];
  transferPhone: string;
  transferRules: Array<{ id: string; phrase: string; phone: string }>;
  learnedBehaviors: string[];
  afterHoursMode: "messages" | "emergency" | "forward" | "closed";
  bookingEnabled: boolean;
  bookingDefaultDurationMinutes: number;
  pricingEnabled: boolean;
  priceList?: string;
  maxCallDuration: number;
  followUpSMS: boolean;
  notifyOwnerOnLead: boolean;
  sendSummaryEmail: boolean;
  persistence: "low" | "medium" | "high";
  qualificationQuestions: string[];
  objectionHandling: {
    price?: string;
    timing?: string;
    competitor?: string;
    notInterested?: string;
  };
  escalationTriggers: string[];
  qualification: { criteria: Array<{ id: string; label: string; enabled: boolean }>; customCriterion: string };
  objections: Array<{ id: string; trigger: string; response: string }>;
  outboundOpening: string;
  outboundGoal: "book" | "qualify" | "deliver" | "custom";
  outboundGoalCustom: string;
  outboundNotInterested: "thank_end" | "callback" | "ask_help";
  voicemailBehavior: "leave" | "hangup" | "sms";
  voicemailMessage: string;
  confusedCallerHandling: string;
  offTopicHandling: string;
  assertiveness: number;
  whenHesitation: string;
  whenThinkAboutIt: string;
  whenPricing: string;
  whenCompetitor: string;
  voiceSettings: {
    stability: number;
    speed: number;
    responseDelay: number;
    backchannel: boolean;
    denoising: boolean;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };
};

export type WorkspacePhoneNumber = {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  number_type: string;
  status: string;
  monthly_cost_cents: number;
  capabilities: { voice?: boolean; sms?: boolean; mms?: boolean };
  assigned_agent_id: string | null;
};

export type StepId = "identity" | "voice" | "knowledge" | "behavior" | "test" | "golive";

const SETUP_STEPS: { id: StepId; label: string; description: string }[] = [
  { id: "identity", label: "steps.identity", description: "steps.identityDescription" },
  { id: "voice", label: "steps.voice", description: "steps.voiceDescription" },
  { id: "knowledge", label: "steps.knowledge", description: "steps.knowledgeDescription" },
  { id: "behavior", label: "steps.behavior", description: "steps.behaviorDescription" },
  { id: "test", label: "steps.test", description: "steps.testDescription" },
  { id: "golive", label: "steps.golive", description: "steps.goliveDescription" },
];

function isStepComplete(stepId: StepId, agent: Agent): boolean {
  switch (stepId) {
    case "identity":
      return !!(agent.name?.trim() && agent.greeting?.trim());
    case "voice":
      return !!agent.voice?.trim();
    case "knowledge":
      // At least 1 FAQ entry OR business context/services filled — AI auto-generates the rest
      return agent.faq.filter((e) => (e.question ?? "").trim() && (e.answer ?? "").trim()).length >= 1 ||
        !!(agent.services?.filter(s => s.trim()).length) || !!(agent.businessContext?.trim());
    case "behavior":
      // Considered complete if any behavior is configured, OR if agent has a greeting
      // (the AI has smart defaults for all behavior — this step is optional)
      return true; // Always pass — AI handles defaults intelligently
    case "test":
      return (agent.stats?.totalCalls ?? 0) > 0;
    case "golive":
      return (agent.stats?.totalCalls ?? 0) > 0;
    default:
      return false;
  }
}

function getFirstIncompleteStep(agent: Agent): StepId {
  for (const step of SETUP_STEPS) {
    if (!isStepComplete(step.id, agent)) return step.id;
  }
  return "golive";
}

type ReadinessTaskCategory = "required" | "recommended" | "advanced";

type ReadinessTask = {
  key: string;
  label: string;
  complete: boolean;
  weight: number;
  category: ReadinessTaskCategory;
};

export type AgentReadiness = {
  score: number;
  total: number;
  percent: number;
  status: "not_ready" | "basic" | "good" | "excellent";
  tasks: ReadinessTask[];
  recommendations: string[];
};

/** Map client Agent to ReadinessAgent for shared readiness calculation. */
function agentToReadinessAgent(agent: Agent): ReadinessAgent {
  const faq = agent.faq?.filter((e) => (e?.question ?? "").trim() && (e?.answer ?? "").trim()).map((e) => ({ q: e.question, a: e.answer })) ?? [];
  return {
    voice_id: agent.voice?.trim() || null,
    greeting: agent.greeting?.trim() || null,
    knowledge_base: { faq },
    rules: { alwaysTransfer: agent.alwaysTransfer, neverSay: agent.neverSay },
    tested_at: (agent.stats?.totalCalls ?? 0) > 0 ? "1" : null,
  };
}

function getAgentReadiness(agent: Agent, getLabel: (key: string) => string): AgentReadiness {
  const snapshot = getWorkspaceMeSnapshotSync() as { name?: string; progress?: { items?: Array<{ key: string; completed?: boolean }> } } | null;
  const phoneConnected = snapshot?.progress?.items?.find((i) => i.key === "phone")?.completed ?? false;
  const workspace = { name: snapshot?.name ?? null, phoneConnected };
  const { percentage, items } = calculateReadiness(workspace, agentToReadinessAgent(agent));
  const percent = percentage;
  const tasks: ReadinessTask[] = items.map((item) => ({
    key: item.key,
    label: getLabel(item.key),
    complete: item.done,
    weight: item.weight,
    category: "required" as const,
  }));
  const status =
    percent >= 90 ? "excellent" : percent >= 70 ? "good" : percent >= 40 ? "basic" : "not_ready";
  const recommendations = items.filter((i) => !i.done).map((i) => getLabel(i.key));

  return {
    score: percent,
    total: 100,
    percent,
    status,
    tasks,
    recommendations,
  };
}

type InitialFallbackAgent = {
  businessName?: string;
  greeting?: string;
  agentName?: string;
  voiceId?: string;
  knowledgeItems?: Array<{ q?: string; a?: string }>;
} | null;

function generateAgentId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function getAlwaysTransferOptions(t: (key: string) => string): string[] {
  return [
    t("defaultTransfer.explicitlyAsksHuman"),
    t("defaultTransfer.angryFrustrated"),
    t("defaultTransfer.billingPayments"),
    t("defaultTransfer.cannotAnswerAttempts"),
  ];
}

function getTransferOptionToKey(t: (key: string) => string): Record<string, string> {
  return {
    [t("defaultTransfer.explicitlyAsksHuman")]: "askHuman",
    [t("defaultTransfer.angryFrustrated")]: "angry",
    [t("defaultTransfer.billingPayments")]: "billing",
    [t("defaultTransfer.cannotAnswerAttempts")]: "noAnswer",
  };
}

function templateGreeting(id: AgentTemplateId, t?: (key: string) => string): string {
  const translate = t || ((key: string) => key);
  switch (id) {
    case "after_hours":
      return translate("templateGreeting.afterHours");
    case "emergency":
      return translate("templateGreeting.emergency");
    case "lead_qualifier":
      return translate("templateGreeting.leadQualifier");
    case "follow_up":
      return translate("templateGreeting.followUp");
    case "review_request":
      return translate("templateGreeting.reviewRequest");
    case "appointment_setter":
      return translate("templateGreeting.appointmentSetter");
    case "support":
      return translate("templateGreeting.support");
    case "receptionist":
    default:
      return translate("templateGreeting.receptionist");
  }
}

function defaultAgent(t?: (key: string) => string): Agent {
  const translate = t || ((key: string) => key);
  return {
    id: "a-default",
    name: translate("defaultAgent.receptionist"),
    template: "receptionist",
    purpose: "both",
    primaryGoal: "answer_route",
    businessContext: "",
    targetAudience: "",
    voice: DEFAULT_RECALL_VOICE_ID,
    greeting: templateGreeting("receptionist", t),
    personality: 60,
    callStyle: "thorough",
    active: true,
    services: [],
    faq: [],
    specialInstructions: "",
    websiteUrl: "",
    test_call_completed: false,
    stats: {
      avgRating: 0,
      totalCalls: 0,
      appointmentsBooked: 0,
    },
    qualificationQuestions: [],
  objectionHandling: {},
  escalationTriggers: [],
    neverSay: [],
    alwaysTransfer: [],
    escalationChain: [],
    transferPhone: "",
    transferRules: [],
    learnedBehaviors: [],
    afterHoursMode: "messages",
    bookingEnabled: true,
    bookingDefaultDurationMinutes: 30,
    pricingEnabled: false,
    priceList: "",
    maxCallDuration: 12,
    followUpSMS: false,
    notifyOwnerOnLead: true,
    sendSummaryEmail: false,
    persistence: "medium",
    qualification: {
      criteria: [
        { id: "budget", label: translate("defaultAgent.hasBudget"), enabled: false },
        { id: "timeline", label: translate("defaultAgent.hasTimeline"), enabled: false },
        { id: "decision_maker", label: translate("defaultAgent.isDecisionMaker"), enabled: false },
      ],
      customCriterion: "",
    },
    objections: [],
    outboundOpening: "",
    outboundGoal: "book",
    outboundGoalCustom: "",
    outboundNotInterested: "thank_end",
    voicemailBehavior: "leave",
    voicemailMessage: "",
    confusedCallerHandling: translate("defaultAgent.confusedCallerHandling"),
    offTopicHandling: translate("defaultAgent.offTopicHandling"),
    assertiveness: 50,
    whenHesitation: "acknowledge_offer_info",
    whenThinkAboutIt: "offer_follow_up",
    whenPricing: "range_then_pivot",
    whenCompetitor: "acknowledge_differentiate",
    voiceSettings: { ...HUMAN_VOICE_DEFAULTS },
  };
}

function mapPersonalityToSlider(value: unknown): number {
  if (value === "friendly") return 80;
  if (value === "empathetic") return 70;
  if (value === "casual") return 50;
  return 60;
}

function mapSliderToPersonality(
  value: number,
): "friendly" | "professional" | "casual" | "empathetic" {
  if (value >= 75) return "friendly";
  if (value >= 65) return "empathetic";
  if (value <= 45) return "casual";
  return "professional";
}

function mapAgentRow(row: Record<string, unknown>, tAgents: (key: string) => string): Agent {
  const knowledgeBase = (row.knowledge_base ?? {}) as {
    services?: string[];
    faq?: Array<{ q?: string; a?: string }>;
    specialInstructions?: string;
    websiteUrl?: string;
    primaryGoal?: PrimaryGoalId;
    businessContext?: string;
    targetAudience?: string;
    afterHoursMode?: "messages" | "emergency" | "forward" | "closed";
    bookingEnabled?: boolean;
    bookingDefaultDurationMinutes?: number;
    pricingEnabled?: boolean;
    priceList?: string;
    maxCallDuration?: number;
    callStyle?: CallStyle;
    voiceSettings?: Partial<Agent["voiceSettings"]>;
    followUpSMS?: boolean;
    notifyOwnerOnLead?: boolean;
    sendSummaryEmail?: boolean;
    persistence?: "low" | "medium" | "high";
    qualification?: { criteria?: Array<{ id?: string; label?: string; enabled?: boolean }>; customCriterion?: string };
    objections?: Array<{ id?: string; trigger?: string; response?: string }>;
    outboundOpening?: string;
    outboundGoal?: "book" | "qualify" | "deliver" | "custom";
    outboundGoalCustom?: string;
    outboundNotInterested?: "thank_end" | "callback" | "ask_help";
    voicemailBehavior?: "leave" | "hangup" | "sms";
    voicemailMessage?: string;
    confusedCallerHandling?: string;
    offTopicHandling?: string;
    assertiveness?: number;
    whenHesitation?: string;
    whenThinkAboutIt?: string;
    whenPricing?: string;
    whenCompetitor?: string;
  };
  const rules = (row.rules ?? {}) as {
    neverSay?: string[];
    alwaysTransfer?: string[];
    escalationChain?: string[];
    transferPhone?: string;
    transferRules?: Array<{ phrase?: string; phone?: string }>;
    learnedBehaviors?: string[];
    qualificationQuestions?: string[];
    objectionHandling?: {
      price?: string;
      timing?: string;
      competitor?: string;
      notInterested?: string;
    };
    escalationTriggers?: string[];
  };
  const stats = (row.stats ?? {}) as {
    avgRating?: number;
    totalCalls?: number;
    appointmentsBooked?: number;
  };

  const rawPurpose = row.purpose ?? (row.template === "follow_up" || row.template === "review_request" ? "outbound" : "both");
  const purpose: AgentPurpose = rawPurpose === "inbound" || rawPurpose === "outbound" || rawPurpose === "both" ? rawPurpose : "both";
  const validGoal: PrimaryGoalId =
    knowledgeBase.primaryGoal && ["answer_route", "book_appointments", "qualify_leads", "support", "sales", "follow_up", "custom"].includes(knowledgeBase.primaryGoal)
      ? (knowledgeBase.primaryGoal as PrimaryGoalId)
      : "answer_route";
  return {
    ...defaultAgent(undefined),
    id: String(row.id ?? generateAgentId("a")),
    name: String(row.name ?? tAgents("defaultAgent.name")),
    purpose,
    primaryGoal: validGoal,
    businessContext: typeof knowledgeBase.businessContext === "string" ? knowledgeBase.businessContext : "",
    targetAudience: typeof knowledgeBase.targetAudience === "string" ? knowledgeBase.targetAudience : "",
    greeting: String(row.greeting ?? ""),
    voice: String(row.voice_id ?? DEFAULT_RECALL_VOICE_ID),
    personality: mapPersonalityToSlider(row.personality),
    services: Array.isArray(knowledgeBase.services) ? knowledgeBase.services : [],
    faq: Array.isArray(knowledgeBase.faq)
      ? knowledgeBase.faq.map((item, index) => ({
          id: `${row.id ?? "faq"}-${index}`,
          question: item.q ?? "",
          answer: item.a ?? "",
        }))
      : [],
    specialInstructions:
      typeof knowledgeBase.specialInstructions === "string"
        ? knowledgeBase.specialInstructions
        : "",
    websiteUrl:
      typeof knowledgeBase.websiteUrl === "string" ? knowledgeBase.websiteUrl : "",
    test_call_completed:
      typeof row.test_call_completed === "boolean" ? row.test_call_completed : false,
    stats: {
      avgRating: typeof stats.avgRating === "number" ? stats.avgRating : 0,
      totalCalls: typeof stats.totalCalls === "number" ? stats.totalCalls : 0,
      appointmentsBooked:
        typeof stats.appointmentsBooked === "number"
          ? stats.appointmentsBooked
          : 0,
    },
    qualificationQuestions: Array.isArray(rules.qualificationQuestions)
      ? rules.qualificationQuestions
          .map((q) => String(q ?? "").trim())
          .filter((q) => q.length > 0)
      : [],
    objectionHandling: {
      price:
        typeof rules.objectionHandling?.price === "string"
          ? rules.objectionHandling.price
          : "",
      timing:
        typeof rules.objectionHandling?.timing === "string"
          ? rules.objectionHandling.timing
          : "",
      competitor:
        typeof rules.objectionHandling?.competitor === "string"
          ? rules.objectionHandling.competitor
          : "",
      notInterested:
        typeof rules.objectionHandling?.notInterested === "string"
          ? rules.objectionHandling.notInterested
          : "",
    },
    escalationTriggers: Array.isArray(rules.escalationTriggers)
      ? rules.escalationTriggers
          .map((t) => String(t ?? "").trim())
          .filter((t) => t.length > 0)
      : [],
    neverSay: Array.isArray(rules.neverSay) ? rules.neverSay.filter(Boolean) : [],
    alwaysTransfer: Array.isArray(rules.alwaysTransfer)
      ? rules.alwaysTransfer.filter(Boolean)
      : [],
    escalationChain: Array.isArray(rules.escalationChain)
      ? rules.escalationChain.filter(Boolean)
      : [],
    transferPhone:
      typeof rules.transferPhone === "string" ? rules.transferPhone : "",
    transferRules: Array.isArray(rules.transferRules)
      ? rules.transferRules.map((item, index) => ({
          id: `${row.id ?? "rule"}-${index}`,
          phrase: item.phrase ?? "",
          phone: item.phone ?? "",
        }))
      : [],
    learnedBehaviors: Array.isArray(rules.learnedBehaviors) ? rules.learnedBehaviors.filter(Boolean) : [],
    afterHoursMode: (knowledgeBase.afterHoursMode === "closed" || knowledgeBase.afterHoursMode === "messages" || knowledgeBase.afterHoursMode === "emergency" || knowledgeBase.afterHoursMode === "forward") ? knowledgeBase.afterHoursMode : "messages",
    bookingEnabled: knowledgeBase.bookingEnabled ?? true,
    bookingDefaultDurationMinutes: typeof knowledgeBase.bookingDefaultDurationMinutes === "number" ? knowledgeBase.bookingDefaultDurationMinutes : 30,
    pricingEnabled: knowledgeBase.pricingEnabled ?? false,
    priceList:
      typeof knowledgeBase.priceList === "string" ? knowledgeBase.priceList : "",
    maxCallDuration:
      typeof knowledgeBase.maxCallDuration === "number"
        ? knowledgeBase.maxCallDuration
        : 12,
    callStyle:
      knowledgeBase.callStyle === "quick" ||
      knowledgeBase.callStyle === "conversational"
        ? knowledgeBase.callStyle
        : "thorough",
    followUpSMS: Boolean(knowledgeBase.followUpSMS ?? false),
    notifyOwnerOnLead: Boolean(knowledgeBase.notifyOwnerOnLead ?? true),
    sendSummaryEmail: Boolean(knowledgeBase.sendSummaryEmail ?? false),
    persistence: (knowledgeBase.persistence === "low" || knowledgeBase.persistence === "high") ? knowledgeBase.persistence : "medium",
    qualification: (() => {
      const q = knowledgeBase.qualification;
      const defaultCriteria = defaultAgent(undefined).qualification.criteria;
      const criteria = Array.isArray(q?.criteria) && q.criteria.length > 0
        ? q.criteria.map((c, i) => ({ id: c.id ?? `q-${i}`, label: c.label ?? "", enabled: Boolean(c.enabled) }))
        : defaultCriteria;
      return { criteria, customCriterion: typeof q?.customCriterion === "string" ? q.customCriterion : "" };
    })(),
    objections: Array.isArray(knowledgeBase.objections)
      ? knowledgeBase.objections.map((o, i) => ({ id: (o as { id?: string }).id ?? `obj-${i}`, trigger: (o as { trigger?: string }).trigger ?? "", response: (o as { response?: string }).response ?? "" }))
      : [],
    outboundOpening: typeof knowledgeBase.outboundOpening === "string" ? knowledgeBase.outboundOpening : "",
    outboundGoal: (knowledgeBase.outboundGoal === "qualify" || knowledgeBase.outboundGoal === "deliver" || knowledgeBase.outboundGoal === "custom") ? knowledgeBase.outboundGoal : "book",
    outboundGoalCustom: typeof knowledgeBase.outboundGoalCustom === "string" ? knowledgeBase.outboundGoalCustom : "",
    outboundNotInterested: (knowledgeBase.outboundNotInterested === "callback" || knowledgeBase.outboundNotInterested === "ask_help") ? knowledgeBase.outboundNotInterested : "thank_end",
    voicemailBehavior: (knowledgeBase.voicemailBehavior === "hangup" || knowledgeBase.voicemailBehavior === "sms") ? knowledgeBase.voicemailBehavior : "leave",
    voicemailMessage: typeof knowledgeBase.voicemailMessage === "string" ? knowledgeBase.voicemailMessage : "",
    confusedCallerHandling: typeof knowledgeBase.confusedCallerHandling === "string" ? knowledgeBase.confusedCallerHandling : defaultAgent(undefined).confusedCallerHandling,
    offTopicHandling: typeof knowledgeBase.offTopicHandling === "string" ? knowledgeBase.offTopicHandling : defaultAgent(undefined).offTopicHandling,
    assertiveness: typeof knowledgeBase.assertiveness === "number" ? Math.max(0, Math.min(100, knowledgeBase.assertiveness)) : 50,
    whenHesitation: typeof knowledgeBase.whenHesitation === "string" ? knowledgeBase.whenHesitation : "acknowledge_offer_info",
    whenThinkAboutIt: typeof knowledgeBase.whenThinkAboutIt === "string" ? knowledgeBase.whenThinkAboutIt : "offer_follow_up",
    whenPricing: typeof knowledgeBase.whenPricing === "string" ? knowledgeBase.whenPricing : "range_then_pivot",
    whenCompetitor: typeof knowledgeBase.whenCompetitor === "string" ? knowledgeBase.whenCompetitor : "acknowledge_differentiate",
    active: Boolean(row.is_active ?? true),
    voiceSettings: {
      ...defaultAgent(undefined).voiceSettings,
      ...(knowledgeBase.voiceSettings ?? {}),
    },
  };
}

function buildFallbackAgent(fallback: InitialFallbackAgent, t?: (key: string, values?: Record<string, string>) => string): Agent | null {
  if (!fallback) return null;
  const translate = t ?? ((key: string, _values?: Record<string, string>) => key);
  const business = fallback.businessName?.trim() || translate("defaultAgent.yourBusiness");
  return {
    ...defaultAgent(t),
    id: "primary-agent",
    name: fallback.agentName?.trim() || translate("defaultAgent.name"),
    greeting:
      fallback.greeting?.trim() ||
      translate("defaultAgent.greeting", { business }),
    voice: fallback.voiceId?.trim() || DEFAULT_RECALL_VOICE_ID,
    faq: Array.isArray(fallback.knowledgeItems)
      ? fallback.knowledgeItems.map((item, index) => ({
          id: `fallback-faq-${index}`,
          question: item.q ?? "",
          answer: item.a ?? "",
        }))
      : [],
  };
}

function toAgentPatchPayload(agent: Agent) {
  return {
    name: agent.name,
    voice_id: agent.voice,
    personality: mapSliderToPersonality(agent.personality),
    purpose: agent.purpose ?? (agent.template === "follow_up" || agent.template === "review_request" ? "outbound" : "both"),
    greeting: agent.greeting,
    knowledge_base: {
      services: agent.services,
      faq: agent.faq.map((item) => ({ q: item.question, a: item.answer })),
      specialInstructions: agent.specialInstructions,
      websiteUrl: agent.websiteUrl,
      primaryGoal: agent.primaryGoal,
      businessContext: agent.businessContext,
      targetAudience: agent.targetAudience,
      afterHoursMode: agent.afterHoursMode,
      bookingEnabled: agent.bookingEnabled,
      bookingDefaultDurationMinutes: agent.bookingDefaultDurationMinutes,
      pricingEnabled: agent.pricingEnabled,
      priceList: agent.priceList,
      maxCallDuration: agent.maxCallDuration,
      callStyle: agent.callStyle,
      voiceSettings: agent.voiceSettings,
      followUpSMS: agent.followUpSMS,
      notifyOwnerOnLead: agent.notifyOwnerOnLead,
      sendSummaryEmail: agent.sendSummaryEmail,
      persistence: agent.persistence,
      qualification: agent.qualification,
      objections: agent.objections,
      outboundOpening: agent.outboundOpening,
      outboundGoal: agent.outboundGoal,
      outboundGoalCustom: agent.outboundGoalCustom,
      outboundNotInterested: agent.outboundNotInterested,
      voicemailBehavior: agent.voicemailBehavior,
      voicemailMessage: agent.voicemailMessage,
      confusedCallerHandling: agent.confusedCallerHandling,
      offTopicHandling: agent.offTopicHandling,
      assertiveness: agent.assertiveness,
      whenHesitation: agent.whenHesitation,
      whenThinkAboutIt: agent.whenThinkAboutIt,
      whenPricing: agent.whenPricing,
      whenCompetitor: agent.whenCompetitor,
    },
    rules: {
      neverSay: agent.neverSay,
      alwaysTransfer: agent.alwaysTransfer,
      escalationChain: agent.escalationChain,
      transferPhone: agent.transferPhone,
      transferRules: agent.transferRules.map((rule) => ({
        phrase: rule.phrase,
        phone: rule.phone,
      })),
      learnedBehaviors: agent.learnedBehaviors,
      qualificationQuestions: agent.qualificationQuestions,
      objectionHandling: agent.objectionHandling,
      escalationTriggers: agent.escalationTriggers,
    },
    is_active: agent.active,
  };
}

export default function AppAgentsPageClient({
  initialWorkspaceId = "",
  initialWorkspaceName = "",
  initialAgentsRows = [],
  initialFallbackAgent = null,
}: {
  initialWorkspaceId?: string;
  initialWorkspaceName?: string;
  initialAgentsRows?: Array<Record<string, unknown>>;
  initialFallbackAgent?: InitialFallbackAgent;
}) {
  const _t = useTranslations("agents");
  const _tCommon = useTranslations("common");
  const _tForms = useTranslations("forms.state");
  const { workspaceId: contextWorkspaceId } = useWorkspace();
  const workspaceId = contextWorkspaceId || initialWorkspaceId;
  const initialAgents = useMemo(() => {
    if (Array.isArray(initialAgentsRows) && initialAgentsRows.length > 0) {
      return initialAgentsRows.map((row) => mapAgentRow(row, _t));
    }
    const fallbackAgent = buildFallbackAgent(initialFallbackAgent, _t);
    return fallbackAgent ? [fallbackAgent] : [];
  }, [initialAgentsRows, initialFallbackAgent, _t]);
  const hasInitialPayload = initialAgents.length > 0;

  const [agents, setAgents] = useState<Agent[]>(() => initialAgents);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialAgents[0]?.id ?? null,
  );
  const [activeStep, setActiveStep] = useState<StepId>("identity");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<
    AgentTemplateCategory | "all"
  >("all");
  const templateModalCloseRef = useRef<HTMLButtonElement | null>(null);
  const templateModalContentRef = useRef<HTMLDivElement | null>(null);
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<Agent | null>(null);
  const tAgents = useTranslations("agents");
  const tDashboard = useTranslations("dashboard");
  const getAgentReadinessBound = useCallback(
    (agent: Agent) => getAgentReadiness(agent, (key) => tDashboard(`checklist.${key}`)),
    [tDashboard],
  );

  useEffect(() => {
    document.title = tAgents("pageTitle");
    return () => {
      document.title = "";
    };
  }, [tAgents]);

  useEffect(() => {
    const handler = () => {
      setToast(tAgents("toast.testLinkCopied"));
    };
    window.addEventListener("agents:test-link-copied", handler as EventListener);
    return () => {
      window.removeEventListener("agents:test-link-copied", handler as EventListener);
    };
  }, [tAgents]);
  const defaultAgentId = useMemo(() => {
    if (agents.length === 0) return null;
    const primary = agents.find(
      (a) => (a.purpose === "inbound" || a.purpose === "both") && a.active,
    );
    return primary?.id ?? agents[0]?.id ?? null;
  }, [agents]);
  useEffect(() => {
    if (!showTemplateModal) return;
    templateModalCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTemplateModal(false);
        return;
      }
      if (e.key !== "Tab" || !templateModalContentRef.current) return;
      const root = templateModalContentRef.current;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const target = document.activeElement;
      if (e.shiftKey) {
        if (target === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (target === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showTemplateModal]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowTemplateModal(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(!hasInitialPayload);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!workspaceId) return;
    const preserveExisting = hasInitialPayload && workspaceId === initialWorkspaceId;
    if (!preserveExisting) {
      setLoading(true);
    }

    fetch(`/api/agents?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data: { agents?: Array<Record<string, unknown>> } | null) => {
        const mapped = Array.isArray(data?.agents)
          ? data.agents.map((row) => mapAgentRow(row, tAgents))
          : [];
        if (mapped.length > 0) {
          setAgents(mapped);
          setSelectedId((current) =>
            current && mapped.some((item) => item.id === current)
              ? current
              : (mapped[0]?.id ?? null),
          );
          return;
        }

        const fallbackRes = await fetch("/api/workspace/agent", {
          credentials: "include",
          cache: "no-store",
        });
        if (!fallbackRes.ok) {
          if (!preserveExisting) {
            setAgents([]);
            setSelectedId(null);
          }
          return;
        }
        const fallback = (await fallbackRes.json()) as InitialFallbackAgent;
        const agent = buildFallbackAgent(fallback, tAgents);
        if (!agent) {
          if (!preserveExisting) {
            setAgents([]);
            setSelectedId(null);
          }
          return;
        }
        setAgents([agent]);
        setSelectedId(agent.id);
      })
      .catch(() => {
        if (!preserveExisting) {
          setAgents([]);
          setSelectedId(null);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId, initialWorkspaceId, hasInitialPayload, tAgents]);

  const selected = useMemo(
    () => (selectedId ? agents.find((a) => a.id === selectedId) ?? null : null),
    [agents, selectedId],
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hearPlaying, setHearPlaying] = useState(false);
  const [playingAgentId, setPlayingAgentId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const _isHearPlaying = hearPlaying && playingAgentId === selectedId;

  const [recallVoices, _setRecallVoices] =
    useState<RecallVoice[]>(RECALL_VOICES);
  const [workspaceNumbers, setWorkspaceNumbers] = useState<WorkspacePhoneNumber[]>([]);

  const fetchWorkspaceNumbers = useCallback(() => {
    if (!workspaceId) return;
    fetch("/api/phone/numbers", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { numbers?: WorkspacePhoneNumber[] } | null) => {
        setWorkspaceNumbers(data?.numbers ?? []);
      })
      .catch(() => setWorkspaceNumbers([]));
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspaceNumbers();
  }, [fetchWorkspaceNumbers]);

  const _pathname = usePathname();
  const prevSelectedIdRef = useRef<string | null>(null);
  const STORAGE_KEY = "rt_agents_step";

  useEffect(() => {
    const prev = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedId;
    if (prev !== selectedId && selected) {
      const stored = typeof window !== "undefined" && selectedId ? window.sessionStorage.getItem(`${STORAGE_KEY}_${selectedId}`) : null;
      const step = stored && SETUP_STEPS.some((s) => s.id === stored) ? (stored as StepId) : getFirstIncompleteStep(selected);
      setActiveStep(step);
    }
  }, [selectedId, selected]);

  useEffect(() => {
    if (selectedId && activeStep) {
      try {
        window.sessionStorage.setItem(`${STORAGE_KEY}_${selectedId}`, activeStep);
      } catch {
        // ignore
      }
    }
  }, [activeStep, selectedId]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  const updateSelected = (partial: Partial<Agent>) => {
    if (!selected) return;
    const next = agents.map((a) =>
      a.id === selected.id ? { ...a, ...partial } : a,
    );
    setAgents(next);
  };

  const playAudioPreview = async (input: {
    key: string;
    voiceId: string;
    text: string;
    settings: Agent["voiceSettings"];
    agentId?: string | null;
  }) => {
    if (playingVoiceId === input.key && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setHearPlaying(false);
      setPlayingVoiceId(null);
      setPlayingAgentId(null);
      return;
    }

    const voiceId = (input.voiceId ?? "").trim();
    if (!voiceId) {
      setToast(tAgents("toast.selectVoiceFirst"));
      return;
    }

    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingVoiceId(input.key);
    setPlayingAgentId(input.agentId ?? null);
    setHearPlaying(Boolean(input.agentId));

    try {
      const res = await fetch("/api/agent/preview-voice", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_id: voiceId,
          text: input.text,
          settings: {
            stability: input.settings.stability,
            similarityBoost: input.settings.similarityBoost,
            style: input.settings.style,
            useSpeakerBoost: input.settings.useSpeakerBoost,
          },
        }),
      });
      if (!res.ok) throw new Error("preview_failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = input.settings.speed;
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setHearPlaying(false);
        setPlayingVoiceId(null);
        setPlayingAgentId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setHearPlaying(false);
        setPlayingVoiceId(null);
        setPlayingAgentId(null);
        audioRef.current = null;
        setToast(tAgents("toast.previewFailed"));
      };
      await audio.play();
    } catch {
      setHearPlaying(false);
      setPlayingVoiceId(null);
      setPlayingAgentId(null);
      setToast(tAgents("toast.previewFailed"));
    }
  };

  const persistAgent = async (
    agentToSave: Agent,
    options?: { showToast?: boolean; successToast?: string }
  ): Promise<{ patchOk: boolean; vapiId?: string | null }> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentToSave.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toAgentPatchPayload(agentToSave)),
      });
      if (!res.ok) {
        if (options?.showToast !== false) setToast(tAgents("toast.saveFailed"));
        return { patchOk: false };
      }

      const successMsg = options?.successToast ?? tAgents("toast.changesSaved");
      if (options?.showToast !== false) setToast(successMsg);
      return { patchOk: true };
    } catch {
      if (options?.showToast !== false) setToast(tAgents("toast.saveFailed"));
      return { patchOk: false };
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    await persistAgent(selected, { showToast: true, successToast: tAgents("toast.changesSaved") });
  };

  const handleStepChange = async (newStepId: StepId) => {
    if (!selected || newStepId === activeStep) return;
    const result = await persistAgent(selected, { showToast: false });
    if (result.patchOk) {
      setActiveStep(newStepId);
    } else {
      setToast(tAgents("toast.saveRetry"));
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    setDeleteConfirmAgent(selected);
  };

  const doDeleteAgent = async (agent: Agent) => {
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete_failed");
      const next = agents.filter((a) => a.id !== agent.id);
      setAgents(next);
      setSelectedId(next[0]?.id ?? null);
      setToast(tAgents("toast.deleted"));
    } catch {
      setToast(tAgents("toast.deleteFailed"));
    } finally {
      setDeleteConfirmAgent(null);
    }
  };

  const createAgentFromTemplate = async (template: AgentTemplateId) => {
    if (!workspaceId) return;
    const base = defaultAgent(tAgents);
    const nameByTemplate: Record<AgentTemplateId, string> = {
      receptionist: tAgents("templateName.receptionist"),
      after_hours: tAgents("templateName.after_hours"),
      emergency: tAgents("templateName.emergency"),
      lead_qualifier: tAgents("templateName.lead_qualifier"),
      follow_up: tAgents("templateName.follow_up"),
      review_request: tAgents("templateName.review_request"),
      appointment_setter: tAgents("templateName.appointment_setter"),
      support: tAgents("templateName.support"),
      scratch: tAgents("templateName.scratch"),
    };
    const agent: Agent = {
      ...base,
      id: generateAgentId("temp"),
      template,
      name: nameByTemplate[template],
      voice: getTemplateVoiceId(template) || base.voice,
      greeting: tAgents(`greetings.${template}`),
      services: [],
      faq: [],
      transferRules: [],
      specialInstructions: "",
      websiteUrl: "",
      pricingEnabled: template === "review_request" ? false : base.pricingEnabled,
      afterHoursMode: template === "after_hours" ? "forward" : base.afterHoursMode,
    };

    try {
      const createdRes = await fetch("/api/agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, name: agent.name }),
      });
      if (!createdRes.ok) throw new Error("create_failed");
      const created = (await createdRes.json()) as { id: string };
      const persisted = { ...agent, id: created.id };
      const _result = await persistAgent(persisted, { showToast: false });
      const next = [...agents, persisted];
      setAgents(next);
      setSelectedId(persisted.id);
      setActiveStep(getFirstIncompleteStep(persisted));
      setShowTemplateModal(false);
      setToast(tAgents("toast.created"));
    } catch {
      setToast(tAgents("toast.createFailed"));
    }
  };

  const createAgentFromSharedTemplate = async (templateId: string) => {
    const t = AGENT_TEMPLATES.find((x) => x.id === templateId);
    if (!t || !workspaceId) return;
    const base = defaultAgent(tAgents);
    const name = t.name.replace(/^The\s+/, "") ?? t.name;
    const agent: Agent = {
      ...base,
      id: generateAgentId("temp"),
      template: "receptionist",
      name,
      greeting: t.defaultGreeting,
      voice: getTemplateVoiceId(t.id) || base.voice,
      services: [],
      faq: [],
      transferRules: [],
      specialInstructions: "",
      websiteUrl: "",
    };
    try {
      const createdRes = await fetch("/api/agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, name: agent.name }),
      });
      if (!createdRes.ok) throw new Error("create_failed");
      const created = (await createdRes.json()) as { id: string };
      const persisted = { ...agent, id: created.id };
      const _result = await persistAgent(persisted, { showToast: false });
      const next = [...agents, persisted];
      setAgents(next);
      setSelectedId(persisted.id);
      setActiveStep(getFirstIncompleteStep(persisted));
      setShowTemplateModal(false);
      setToast(tAgents("toast.created"));
    } catch {
      setToast(tAgents("toast.createFailed"));
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6 overflow-x-hidden min-w-0">
      {showConfetti && <Confetti key="agent-activate-confetti" />}
      <Breadcrumbs items={[{ label: tAgents("breadcrumbHome"), href: "/app" }, { label: tAgents("breadcrumbOperators") }]} />
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{tAgents("pageHeading")}</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            {tAgents("pageSubtitle")}
          </p>
        </div>
        <Link
          href="/app/agents/new"
          className="hidden sm:inline-flex items-center gap-1.5 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90"
        >
          {tAgents("createAgent")}
        </Link>
      </div>

      <Link
        href="/app/agents/new"
        className="sm:hidden mb-4 w-full inline-flex justify-center items-center bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90"
      >
        {tAgents("createAgent")}
      </Link>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] gap-4 lg:gap-6 items-stretch lg:min-h-[480px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]" aria-hidden>
                <div className="h-4 w-3/4 rounded skeleton-shimmer mb-3" />
                <div className="h-3 w-1/2 rounded skeleton-shimmer mb-2" />
                <div className="h-3 w-full rounded skeleton-shimmer mb-2" />
                <div className="h-3 w-2/3 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]" aria-hidden>
            <div className="h-4 w-1/3 rounded skeleton-shimmer mb-4" />
            <div className="h-20 rounded skeleton-shimmer mb-4" />
            <div className="h-32 rounded skeleton-shimmer" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row h-full min-h-0 gap-4 lg:gap-0 lg:min-h-[480px]">
          <AgentList
            agents={agents}
            selectedId={selected?.id ?? null}
            defaultAgentId={defaultAgentId}
            workspaceNumbers={workspaceNumbers}
            setSelectedId={setSelectedId}
            setActiveStep={setActiveStep}
            setAgents={(updater) => setAgents((current) => updater(current))}
            persistAgent={persistAgent}
            setDeleteConfirmAgent={setDeleteConfirmAgent}
            getFirstIncompleteStep={getFirstIncompleteStep}
          />

          <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] lg:overflow-hidden">
            {selected ? (
              <AgentDetail
                agent={selected}
                activeStep={activeStep}
                saving={saving}
                elevenLabsVoices={recallVoices}
                workspaceName={initialWorkspaceName}
                workspaceId={workspaceId}
                workspaceNumbers={workspaceNumbers}
                getAgentReadiness={getAgentReadinessBound}
                handleStepChange={handleStepChange}
                handleSave={handleSave}
                handleDelete={handleDelete}
                playAudioPreview={playAudioPreview}
                playingVoiceId={playingVoiceId}
                fetchWorkspaceNumbers={fetchWorkspaceNumbers}
                setAgents={setAgents}
                setToast={setToast}
                setShowConfetti={setShowConfetti}
              >
                {activeStep === "identity" && (
                  <IdentityStepContent
                    agent={selected}
                    onChange={updateSelected}
                    onNext={async () => {
                      await handleStepChange("voice");
                    }}
                  />
                )}
                {activeStep === "voice" && (
                  <>
                    <VoiceStepContent
                      agent={selected}
                      workspaceName={initialWorkspaceName}
                      voices={recallVoices}
                      onChange={updateSelected}
                      onVoicePreview={(voiceId) =>
                        void playAudioPreview({
                          key: voiceId,
                          voiceId,
                          text:
                            selected.greeting.trim() ||
                            tAgents("greetings.scratch"),
                          settings: selected.voiceSettings,
                        })
                      }
                      previewingVoiceId={playingVoiceId}
                      onBack={() => void handleStepChange("identity")}
                      onNext={async () => {
                        await handleStepChange("knowledge");
                      }}
                    />
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">
                      <Link
                        href={`/app/agents/${selected.id}/voice-test`}
                        className="text-[var(--accent-primary)] hover:underline"
                      >
                        {tAgents("voicePreviewLink")} →
                      </Link>
                    </p>
                  </>
                )}
                {activeStep === "knowledge" && (
                  <KnowledgeStepContent
                    agent={selected}
                    onChange={updateSelected}
                    onBack={() => void handleStepChange("voice")}
                    onNext={async () => {
                      await handleStepChange("behavior");
                    }}
                  />
                )}
                {activeStep === "behavior" && (
                  <BehaviorStepContent
                    agent={selected}
                    onChange={updateSelected}
                    onBack={() => void handleStepChange("knowledge")}
                    onNext={async () => {
                      await handleStepChange("test");
                    }}
                  />
                )}
                {activeStep === "test" && (
                  <TestStepContent
                    agent={selected}
                    workspaceName={initialWorkspaceName}
                    getAgentReadiness={getAgentReadinessBound}
                    onBack={() => void handleStepChange("behavior")}
                    onNext={async () => {
                      await handleStepChange("golive");
                    }}
                  />
                )}
                {activeStep === "golive" && (
                  <GoLiveStepContent
                    agent={selected}
                    voices={recallVoices}
                    workspaceNumbers={workspaceNumbers}
                    onAssignNumber={async (numberId, agentIdOrNull) => {
                      const res = await fetch(
                        `/api/phone/numbers/${numberId}/assign`,
                        {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            assigned_agent_id: agentIdOrNull,
                          }),
                        },
                      );
                      if (res.ok) fetchWorkspaceNumbers();
                    }}
                    refetchNumbers={fetchWorkspaceNumbers}
                    getReadiness={getAgentReadinessBound}
                    onBack={() => void handleStepChange("test")}
                    onActivate={async () => {
                      // First persist any pending agent changes
                      const result = await persistAgent(selected, {
                        showToast: false,
                      });
                      if (!result.patchOk) {
                        setToast(tAgents("toast.saveFailed"));
                        return;
                      }

                      // Then trigger the auto-activation pipeline:
                      // creates campaign, enrolls leads, sets everything live
                      try {
                        const activateRes = await fetch("/api/agents/activate", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ agent_id: selected.id }),
                        });
                        const activateData = await activateRes.json() as {
                          ok?: boolean;
                          message?: string;
                          leads_enrolled?: number;
                        };
                        if (activateRes.ok && activateData.ok) {
                          const msg = activateData.leads_enrolled && activateData.leads_enrolled > 0
                            ? `Agent is live! ${activateData.leads_enrolled} leads queued for AI calling.`
                            : "Agent is live! Add leads and they'll be called automatically.";
                          setToast(msg);
                          setShowConfetti(true);
                          setTimeout(() => setShowConfetti(false), 4000);
                        } else {
                          // Activation partially succeeded (agent is active but campaign may have failed)
                          setToast(activateData.message ?? tAgents("toast.agentLive"));
                          setShowConfetti(true);
                          setTimeout(() => setShowConfetti(false), 4000);
                        }
                      } catch {
                        // Fallback: agent was saved, just show generic success
                        setToast(tAgents("toast.agentLive"));
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 4000);
                      }
                    }}
                    activating={saving}
                  />
                )}
              </AgentDetail>
            ) : agents.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                  {tAgents("empty.createFirst")}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                  {tAgents("empty.createFirstBody")}
                </p>
                <button
                  type="button"
                  onClick={() => void createAgentFromTemplate("scratch")}
                  className="rounded-xl bg-[var(--bg-surface)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label={tAgents("createAgent")}
                >
                  {tAgents("createAgent", { defaultValue: "Create Agent" })}
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                {tAgents("selectOrCreate")}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-6">
        <Link
          href="/app/dashboard"
          className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {tAgents("backToActivity")}
        </Link>
      </p>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm text-[var(--text-primary)] shadow-lg">
          {toast}
        </div>
      )}

      {showTemplateModal && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-agent-dialog-title"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            ref={templateModalContentRef}
            className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="create-agent-dialog-title" className="text-sm font-semibold text-[var(--text-primary)]">{tAgents("templateModal.title")}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {tAgents("templateModal.subtitle")}
                </p>
              </div>
              <button
                ref={templateModalCloseRef}
                type="button"
                onClick={() => setShowTemplateModal(false)}
                aria-label={tAgents("templateModal.closeAria")}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
              >
                {_tCommon("close")}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
              <TemplateCard
                title={tAgents("templateName.receptionist")}
                icon={PhoneCall}
                description={tAgents("templateModal.receptionistDesc")}
                onClick={() => createAgentFromTemplate("receptionist")}
              />
              <TemplateCard
                title={tAgents("templateName.lead_qualifier")}
                icon={ClipboardList}
                description={tAgents("templateModal.salesCallerDesc")}
                onClick={() => createAgentFromTemplate("lead_qualifier")}
              />
              <TemplateCard
                title={tAgents("templateName.appointment_setter")}
                icon={Calendar}
                description={tAgents("templateModal.appointmentSetterDesc")}
                onClick={() => createAgentFromTemplate("appointment_setter")}
              />
              <TemplateCard
                title={tAgents("templateName.support")}
                icon={PhoneForwarded}
                description={tAgents("templateModal.supportDesc")}
                onClick={() => createAgentFromTemplate("support")}
              />
              <TemplateCard
                title={tAgents("templateName.follow_up")}
                icon={BellRing}
                description={tAgents("templateModal.followUpDesc")}
                onClick={() => createAgentFromTemplate("follow_up")}
              />
              <TemplateCard
                title={tAgents("templateName.after_hours")}
                icon={Moon}
                description={tAgents("templateModal.afterHoursDesc")}
                onClick={() => createAgentFromTemplate("after_hours")}
              />
              <TemplateCard
                title={tAgents("templateName.scratch")}
                icon={Star}
                description={tAgents("templateModal.customDesc")}
                onClick={() => createAgentFromTemplate("scratch")}
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {tAgents("templateModal.moreOptions")} <button type="button" onClick={() => setTemplateCategory("all")} className="underline hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] rounded px-0.5">{tAgents("templateName.after_hours")}</button>, <button type="button" onClick={() => createAgentFromTemplate("emergency")} className="underline hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] rounded px-0.5">{tAgents("templateName.emergency")}</button>, <button type="button" onClick={() => createAgentFromTemplate("review_request")} className="underline hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] rounded px-0.5">{tAgents("templateName.review_request")}</button>
            </p>
            <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
                {tAgents("templateModal.orPickByStyle")}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setTemplateCategory("all")}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    templateCategory === "all"
                      ? "border-[var(--border-medium)] bg-[var(--bg-inset)] text-[var(--text-primary)]"
                      : "border-[var(--border-medium)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tAgents("templateModal.all")}
                </button>
                {AGENT_TEMPLATE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTemplateCategory(c.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      templateCategory === c.id
                        ? "border-[var(--border-medium)] bg-[var(--bg-inset)] text-[var(--text-primary)]"
                        : "border-[var(--border-medium)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(templateCategory === "all"
                  ? AGENT_TEMPLATES
                  : AGENT_TEMPLATES.filter((t) => t.category === templateCategory)
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => createAgentFromSharedTemplate(t.id)}
                    className="w-full text-left px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)]/50 hover:bg-[var(--bg-input)] hover:border-[var(--border-default)] text-xs transition-colors"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{t.name}</span>
                    <span className="text-[var(--text-secondary)] ml-1">· {t.styleLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmAgent && (
        <ConfirmDialog
          open
          title={tAgents("deleteAgentTitle")}
          message={tAgents("deleteConfirmMessage", { name: deleteConfirmAgent.name })}
          confirmLabel={_tCommon("delete")}
          variant="danger"
          onConfirm={() => void doDeleteAgent(deleteConfirmAgent)}
          onClose={() => setDeleteConfirmAgent(null)}
        />
      )}
    </div>
  );
}

function TemplateCard(props: {
  title: string;
  description: string;
  onClick: () => void;
  icon: LucideIcon;
}) {
  const { title, description, onClick, icon: Icon } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-input)] hover:border-[var(--border-default)] transition-colors"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{title}</p>
      <p className="text-xs text-[var(--text-secondary)]">{description}</p>
    </button>
  );
}

function ConversationPreview({ agent, workspaceName }: { agent: Agent; workspaceName: string }) {
  const t = useTranslations("agents");
  const previews = useMemo(() => {
    const items: Array<{ question: string; answer: string }> = [];
    const faq = agent.faq?.filter((e) => (e.question ?? "").trim() && (e.answer ?? "").trim()) ?? [];
    faq.slice(0, 3).forEach((e) => {
      items.push({ question: e.question, answer: e.answer });
    });
    const hasTransfer = (agent.alwaysTransfer?.length ?? 0) > 0 || (agent.transferRules?.length ?? 0) > 0;
    if (hasTransfer) {
      items.push({
        question: t("rulesTab.previewTransferQuestion"),
        answer: t("rulesTab.previewTransferAnswer"),
      });
    }
    items.push({
      question: t("rulesTab.previewOffTopicQuestion"),
      answer: t("rulesTab.previewOffTopicAnswer"),
    });
    const businessName = workspaceName.trim() || "this business";
    items.push({
      question: t("rulesTab.previewRobotQuestion"),
      answer: t("rulesTab.previewRobotAnswer", { business: businessName }),
    });
    return items;
  }, [agent.faq, agent.alwaysTransfer, agent.transferRules, workspaceName, t]);

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("rulesTab.howYourAiHandlesCalls")}</h3>
      <p className="text-xs text-[var(--text-tertiary)] mb-4">
        {t("rulesTab.conversationPreviewSubtitle")}
      </p>
      <div className="space-y-0 border border-[var(--border-default)] rounded-xl overflow-hidden">
        {previews.map((p, i) => (
          <div key={i} className={`p-3 ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
            <p className="text-xs text-[var(--text-tertiary)] mb-1.5">&ldquo;{p.question}&rdquo;</p>
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="text-[var(--text-tertiary)] text-xs mr-1.5">{t("rulesTab.previewAiLabel")}</span>
              {p.answer}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/20 mt-3">
        {t("rulesTab.generatedFromKnowledge")}
      </p>
    </div>
  );
}

function ProfileTab({
  agent,
  voices,
  workspaceName,
  onChange,
  onVoicePreview,
  previewingVoiceId,
}: {
  agent: Agent;
  voices: RecallVoice[];
  workspaceName: string;
  onChange: (partial: Partial<Agent>) => void;
  onVoicePreview: (voiceId: string) => void;
  previewingVoiceId: string | null;
}) {
  const t = useTranslations("agents");
  const callStyleOptions = useMemo(
    () => [
      { id: "thorough" as CallStyle, labelKey: "profile.callStyleThorough", descKey: "profile.callStyleThoroughDesc" },
      { id: "conversational" as CallStyle, labelKey: "profile.callStyleConversational", descKey: "profile.callStyleConversationalDesc" },
      { id: "quick" as CallStyle, labelKey: "profile.callStyleQuick", descKey: "profile.callStyleQuickDesc" },
    ],
    []
  );
  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div className="space-y-1">
        <label className="block text-[11px] text-[var(--text-secondary)]">{t("profile.agentNameLabel")}</label>
        <input
          type="text"
          value={agent.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          placeholder={t("profile.agentNamePlaceholder")}
        />
      </div>

      <VoiceSelector
        agent={agent}
        voices={voices}
        previewingVoiceId={previewingVoiceId}
        onChange={onChange}
        onVoicePreview={onVoicePreview}
      />

      <div className="space-y-1">
        <label className="block text-[11px] text-[var(--text-secondary)]">{t("profile.openingGreetingLabel")}</label>
        <p className="text-[11px] text-[var(--text-tertiary)] mb-2">{t("profile.openingGreetingHint")}</p>
        <textarea
          rows={3}
          value={agent.greeting}
          onChange={(e) => onChange({ greeting: e.target.value })}
          placeholder={t("profile.greetingPlaceholder")}
          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none resize-none"
        />
      </div>

      <ConversationPreview agent={agent} workspaceName={workspaceName} />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <span>{t("profile.personalityLabel")}</span>
          <span>{t("profile.personalityRange")}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={agent.personality}
          onChange={(e) => onChange({ personality: Number(e.target.value) })}
          className="w-full accent-[var(--accent-primary)]"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-[var(--text-secondary)]">{t("profile.callStyleLabel")}</p>
        <div className="grid grid-cols-3 gap-2">
          {callStyleOptions.map(({ id, labelKey, descKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ callStyle: id })}
              className={`text-left p-2 rounded-xl border text-[11px] ${
                agent.callStyle === id
                  ? "border-[var(--accent-primary)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] bg-[var(--bg-input)]/50 text-[var(--text-secondary)]"
              }`}
            >
              <p className="font-medium mb-0.5">{t(labelKey)}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{t(descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={agent.active}
            onClick={() => onChange({ active: !agent.active })}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              agent.active ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"
            }`}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-black transition-[left,opacity]"
              style={{ left: agent.active ? "22px" : "2px" }}
            />
          </button>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {agent.active ? t("profile.activeOnNumber") : t("profile.inactive")}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)]">{t("profile.callsSoFar", { count: agent.stats.totalCalls })}</p>
      </div>
    </div>
  );
}

function _faqMatchesCategory(q: string, category: string): boolean {
  if (category === "all") return true;
  const lower = q.toLowerCase();
  if (category === "hours") return lower.includes("hour") || lower.includes("open") || lower.includes("close") || lower.includes("when");
  if (category === "services") return lower.includes("service") || lower.includes("offer") || lower.includes("do you");
  if (category === "pricing") return lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("fee");
  if (category === "policies") return lower.includes("policy") || lower.includes("cancel") || lower.includes("refund") || lower.includes("accept");
  return true;
}

// KnowledgeTab now lives in components/AgentKnowledgePanel.

function getDefaultObjections(t: (key: string) => string) {
  return [
    { trigger: t("defaultObjections.tooExpensive"), response: t("defaultObjections.tooExpensiveResponse") },
    { trigger: t("defaultObjections.thinkAboutIt"), response: t("defaultObjections.thinkAboutItResponse") },
    { trigger: t("defaultObjections.alreadyWorking"), response: t("defaultObjections.alreadyWorkingResponse") },
  ];
}

export function RulesTab({
  agent,
  onChange,
}: {
  agent: Agent;
  onChange: (partial: Partial<Agent>) => void;
}) {
  const t = useTranslations("agents");
  const tCommon = useTranslations("common");
  const [openAdvanced, setOpenAdvanced] = useState({
    qualification: false,
    objection: false,
    outbound: false,
    inbound: false,
  });

  const addTransferRule = () => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange({
      transferRules: [...agent.transferRules, { id, phrase: "", phone: "" }],
    });
  };

  const whenHesitationOptions = useMemo(
    () =>
      (["wait_patiently", "ask_what_thinking", "acknowledge_offer_info", "offer_alternatives", "redirect"] as const).map((id) => ({
        id,
        label: t(`rulesTab.hesitation.${id}`),
      })),
    [t]
  );
  const whenThinkOptions = useMemo(
    () =>
      (["accept_gracefully", "offer_follow_up", "create_urgency", "ask_what_help"] as const).map((id) => ({
        id,
        label: t(`rulesTab.thinkAboutIt.${id}`),
      })),
    [t]
  );
  const whenPricingOptions = useMemo(
    () =>
      (["give_full", "range_then_pivot", "redirect_consultation", "defer_human"] as const).map((id) => ({
        id,
        label: t(`rulesTab.pricing.${id}`),
      })),
    [t]
  );
  const whenCompetitorOptions = useMemo(
    () =>
      (["acknowledge", "acknowledge_differentiate", "redirect_strengths", "defer_human"] as const).map((id) => ({
        id,
        label: t(`rulesTab.competitor.${id}`),
      })),
    [t]
  );

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h3 className="mb-3 text-sm font-medium text-[var(--text-primary)]">{t("rulesTab.conversationStyle")}</h3>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{t("rulesTab.assertiveness")}</span>
            <span>{t("rulesTab.gentleDirect")}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={agent.assertiveness}
            onChange={(e) => onChange({ assertiveness: Number(e.target.value) })}
            className="w-full accent-[var(--accent-primary)]"
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("rulesTab.whenCallerHesitates")}</label>
            <select
              value={agent.whenHesitation}
              onChange={(e) => onChange({ whenHesitation: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            >
              {whenHesitationOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("rulesTab.whenCallerThinkAboutIt")}</label>
            <select
              value={agent.whenThinkAboutIt}
              onChange={(e) => onChange({ whenThinkAboutIt: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            >
              {whenThinkOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("rulesTab.whenCallerPricing")}</label>
            <select
              value={agent.whenPricing}
              onChange={(e) => onChange({ whenPricing: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            >
              {whenPricingOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("rulesTab.whenCallerCompetitor")}</label>
            <select
              value={agent.whenCompetitor}
              onChange={(e) => onChange({ whenCompetitor: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            >
              {whenCompetitorOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h3 className="mb-2 text-sm font-medium text-[var(--text-primary)]">{t("rulesTab.transferToHumanWhen")}</h3>
        <div className="space-y-2">
          {getAlwaysTransferOptions(t).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                className="accent-[var(--accent-primary)]"
                checked={agent.alwaysTransfer.includes(option)}
                onChange={(e) =>
                  onChange({
                    alwaysTransfer: e.target.checked
                      ? [...agent.alwaysTransfer, option]
                      : agent.alwaysTransfer.filter((item) => item !== option),
                  })
                }
              />
              {getTransferOptionToKey(t)[option] ? t(`escalationTriggers.${getTransferOptionToKey(t)[option]}`) : option}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-xs text-[var(--text-secondary)]">{t("transferToPhoneLabel")}</label>
          <input
            type="tel"
            value={agent.transferPhone}
            onChange={(e) => onChange({ transferPhone: e.target.value })}
            placeholder={t("behavior.transferPhonePlaceholder")}
            aria-label={t("transferToPhoneAria")}
            className="mt-1 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-[var(--text-secondary)]">{t("rulesTab.neverSayLabel")}</label>
        <textarea
          rows={3}
          value={agent.neverSay.join("\n")}
          onChange={(e) =>
            onChange({
              neverSay: e.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          aria-label={t("neverSayAria")}
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black resize-none"
          placeholder={t("neverSayPlaceholder")}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] text-[var(--text-secondary)]">{t("transferRulesLabel")}</label>
          <button
            type="button"
            onClick={addTransferRule}
            aria-label={t("addTransferRuleAria")}
            className="text-[11px] text-[var(--text-secondary)] underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
          >
            {t("addTransferRule")}
          </button>
        </div>
        {agent.transferRules.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {t("transferRulesExample")}
          </p>
        ) : (
          <div className="space-y-3">
            {agent.transferRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[var(--text-secondary)]">{t("whenCallerSays")}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        transferRules: agent.transferRules.filter((r) => r.id !== rule.id),
                      })
                    }
                    className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {tCommon("remove")}
                  </button>
                </div>
                <input
                  type="text"
                  value={rule.phrase}
                  onChange={(e) =>
                    onChange({
                      transferRules: agent.transferRules.map((r) =>
                        r.id === rule.id ? { ...r, phrase: e.target.value } : r,
                      ),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder={t("transferRulePhrasePlaceholder")}
                />
                <p className="text-[11px] text-[var(--text-secondary)]">{t("callThisNumber")}</p>
                <input
                  type="tel"
                  value={rule.phone}
                  onChange={(e) =>
                    onChange({
                      transferRules: agent.transferRules.map((r) =>
                        r.id === rule.id ? { ...r, phone: e.target.value } : r,
                      ),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder={t("transferRulePhonePlaceholder")}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {agent.learnedBehaviors.length > 0 && (
        <div>
          <label className="mb-2 block text-[11px] text-[var(--text-secondary)]">{t("learnedBehaviorsLabel")}</label>
          <div className="space-y-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
            {agent.learnedBehaviors.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="flex-1">{line}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      learnedBehaviors: agent.learnedBehaviors.filter((_, i) => i !== idx),
                    })
                  }
                  className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
                  aria-label={tCommon("remove")}
                >
                  {tCommon("remove")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-[11px] text-[var(--text-secondary)]">{t("afterHoursBehaviorLabel")}</label>
        <select
          value={agent.afterHoursMode}
          onChange={(e) => onChange({ afterHoursMode: e.target.value as Agent["afterHoursMode"] })}
          aria-label={t("afterHoursBehaviorAria")}
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
        >
          <option value="messages">{t("afterHoursOptionMessages")}</option>
          <option value="forward">{t("afterHoursOptionForward")}</option>
          <option value="emergency">{t("afterHoursOptionEmergency")}</option>
          <option value="closed">{t("afterHoursOptionClosed")}</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-[var(--text-secondary)]">{t("rulesTab.maxCallDurationLabel")}</label>
        <select
          value={[0, 5, 10, 12, 15, 30].includes(agent.maxCallDuration) ? String(agent.maxCallDuration) : "15"}
          onChange={(e) => onChange({ maxCallDuration: Number(e.target.value) })}
          aria-label={t("rulesTab.maxCallDurationAria")}
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
        >
          <option value="0">No limit</option>
          <option value="5">5 minutes</option>
          <option value="10">10 minutes</option>
          <option value="12">12 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
        </select>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{t("rulesTab.appointmentBooking")}</h3>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="accent-[var(--accent-primary)]"
            checked={agent.bookingEnabled}
            onChange={(e) => onChange({ bookingEnabled: e.target.checked })}
          />
          {t("rulesTab.agentCanBook")}
        </label>
        {agent.bookingEnabled && (
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("rulesTab.defaultDurationLabel")}</label>
            <select
              value={[15, 30, 45, 60].includes(agent.bookingDefaultDurationMinutes) ? String(agent.bookingDefaultDurationMinutes) : "30"}
              onChange={(e) => onChange({ bookingDefaultDurationMinutes: Number(e.target.value) })}
              aria-label={t("rulesTab.defaultDurationAria")}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{t("rulesTab.availableSlotsHint")}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{t("rulesTab.followUpBehavior")}</h3>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="accent-[var(--accent-primary)]"
            checked={agent.followUpSMS}
            onChange={(e) => onChange({ followUpSMS: e.target.checked })}
          />
          {t("rulesTab.sendFollowUpSMS")}
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="accent-[var(--accent-primary)]"
            checked={agent.notifyOwnerOnLead}
            onChange={(e) => onChange({ notifyOwnerOnLead: e.target.checked })}
          />
          {t("rulesTab.notifyOwnerOnLead")}
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="accent-[var(--accent-primary)]"
            checked={agent.sendSummaryEmail}
            onChange={(e) => onChange({ sendSummaryEmail: e.target.checked })}
          />
          {t("rulesTab.sendSummaryEmail")}
        </label>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{t("rulesTab.conversationStyle")}</h3>
        <div>
          <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("rulesTab.paceLabel")}</label>
          <select
            value={agent.callStyle}
            onChange={(e) => onChange({ callStyle: e.target.value as CallStyle })}
            aria-label={t("rulesTab.conversationPaceAria")}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
          >
            <option value="thorough">{t("rulesTab.thorough")}</option>
            <option value="conversational">{t("rulesTab.conversational")}</option>
            <option value="quick">{t("rulesTab.quick")}</option>
          </select>
        </div>
        {(agent.purpose === "outbound" || agent.purpose === "both") && (
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("rulesTab.persistenceOutbound")}</label>
            <select
              value={agent.persistence}
              onChange={(e) => onChange({ persistence: e.target.value as Agent["persistence"] })}
              aria-label={t("rulesTab.outboundPersistenceAria")}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
            >
              <option value="low">{t("rulesTab.low")}</option>
              <option value="medium">{t("rulesTab.medium")}</option>
              <option value="high">{t("rulesTab.high")}</option>
            </select>
          </div>
        )}
      </div>

      {/* Qualification framework — collapsed by default */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenAdvanced((s) => ({ ...s, qualification: !s.qualification }))}
          className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset"
          aria-expanded={openAdvanced.qualification}
        >
          {t("rulesTab.qualificationFramework")}
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.qualification ? "rotate-180" : ""}`} />
        </button>
        {openAdvanced.qualification && (
          <div className="border-t border-[var(--border-default)] p-4 space-y-3">
            <p className="text-[11px] text-[var(--text-secondary)]">{t("rulesTab.whatMakesQualified")}</p>
            {(agent.qualification?.criteria ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  className="accent-[var(--accent-primary)]"
                  checked={c.enabled}
                  onChange={(e) =>
                    onChange({
                      qualification: {
                        ...agent.qualification,
                        criteria: agent.qualification.criteria.map((x) =>
                          x.id === c.id ? { ...x, enabled: e.target.checked } : x,
                        ),
                      },
                    })
                  }
                />
                {c.label}
              </label>
            ))}
            <div>
              <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("labels.customCriterion")}</label>
              <input
                type="text"
                value={agent.qualification?.customCriterion ?? ""}
                onChange={(e) =>
                  onChange({
                    qualification: { ...agent.qualification, customCriterion: e.target.value },
                  })
                }
                placeholder={t("placeholders.customCriterion")}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Objection handling — collapsed by default */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenAdvanced((s) => ({ ...s, objection: !s.objection }))}
          className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset"
          aria-expanded={openAdvanced.objection}
        >
          {t("sections.objectionHandling")}
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.objection ? "rotate-180" : ""}`} />
        </button>
        {openAdvanced.objection && (
          <div className="border-t border-[var(--border-default)] p-4 space-y-4">
            <p className="text-[11px] text-[var(--text-secondary)]">{t("sections.objectionDesc")}</p>
            {(agent.objections ?? []).map((o) => (
              <div key={o.id} className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)]">{t("labels.ifTheySay")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        objections: agent.objections.filter((x) => x.id !== o.id),
                      })
                    }
                    className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {t("actions.remove")}
                  </button>
                </div>
                <input
                  type="text"
                  value={o.trigger}
                  onChange={(e) =>
                    onChange({
                      objections: agent.objections.map((x) =>
                        x.id === o.id ? { ...x, trigger: e.target.value } : x,
                      ),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder={t("placeholders.objectionTrigger")}
                />
                <span className="text-[11px] text-[var(--text-secondary)]">{t("labels.response")}</span>
                <input
                  type="text"
                  value={o.response}
                  onChange={(e) =>
                    onChange({
                      objections: agent.objections.map((x) =>
                        x.id === o.id ? { ...x, response: e.target.value } : x,
                      ),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder={t("placeholders.objectionResponse")}
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const id = `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                  onChange({ objections: [...(agent.objections ?? []), { id, trigger: "", response: "" }] });
                }}
                className="text-[11px] text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
              >
                {t("actions.addObjection")}
              </button>
              {(agent.objections?.length ?? 0) === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = getDefaultObjections(t).map((o, i) => ({
                      id: `obj-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                      trigger: o.trigger,
                      response: o.response,
                    }));
                    onChange({ objections: next });
                  }}
                  className="text-[11px] text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
                >
                  {t("actions.addFromSuggestions")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Outbound call settings — when purpose = outbound or both */}
      {(agent.purpose === "outbound" || agent.purpose === "both") && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenAdvanced((s) => ({ ...s, outbound: !s.outbound }))}
            className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset"
            aria-expanded={openAdvanced.outbound}
          >
            {t("sections.outboundSettings")}
            <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.outbound ? "rotate-180" : ""}`} />
          </button>
          {openAdvanced.outbound && (
            <div className="border-t border-[var(--border-default)] p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("labels.openingStrategy")}</label>
                <input
                  type="text"
                  value={agent.outboundOpening}
                  onChange={(e) => onChange({ outboundOpening: e.target.value })}
                  placeholder={t("placeholders.outboundOpening")}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("labels.outboundGoal")}</label>
                <select
                  value={agent.outboundGoal}
                  onChange={(e) => onChange({ outboundGoal: e.target.value as Agent["outboundGoal"] })}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                >
                  <option value="book">{t("options.outboundGoal.book")}</option>
                  <option value="qualify">{t("options.outboundGoal.qualify")}</option>
                  <option value="deliver">{t("options.outboundGoal.deliver")}</option>
                  <option value="custom">{t("options.outboundGoal.custom")}</option>
                </select>
                {agent.outboundGoal === "custom" && (
                  <input
                    type="text"
                    value={agent.outboundGoalCustom}
                    onChange={(e) => onChange({ outboundGoalCustom: e.target.value })}
                    placeholder={t("placeholders.describeGoal")}
                    className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                  />
                )}
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("labels.ifNotInterested")}</label>
                <select
                  value={agent.outboundNotInterested}
                  onChange={(e) => onChange({ outboundNotInterested: e.target.value as Agent["outboundNotInterested"] })}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                >
                  <option value="thank_end">{t("options.notInterested.thankEnd")}</option>
                  <option value="callback">{t("options.notInterested.callback")}</option>
                  <option value="ask_help">{t("options.notInterested.askHelp")}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("labels.voicemailBehavior")}</label>
                <select
                  value={agent.voicemailBehavior}
                  onChange={(e) => onChange({ voicemailBehavior: e.target.value as Agent["voicemailBehavior"] })}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                >
                  <option value="leave">{t("options.voicemail.leave")}</option>
                  <option value="hangup">{t("options.voicemail.hangup")}</option>
                  <option value="sms">{t("options.voicemail.sms")}</option>
                </select>
                {agent.voicemailBehavior === "leave" && (
                  <>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-2 mb-1">{t("labels.voicemailTemplates")}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {VOICEMAIL_DROP_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onChange({ voicemailMessage: t.message })}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={agent.voicemailMessage}
                      onChange={(e) => onChange({ voicemailMessage: e.target.value })}
                      placeholder={t("placeholders.voicemailMessage")}
                      className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)] resize-none"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inbound call settings — when purpose = inbound or both */}
      {(agent.purpose === "inbound" || agent.purpose === "both") && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenAdvanced((s) => ({ ...s, inbound: !s.inbound }))}
            className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset"
            aria-expanded={openAdvanced.inbound}
          >
            {t("sections.inboundSettings")}
            <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.inbound ? "rotate-180" : ""}`} />
          </button>
          {openAdvanced.inbound && (
            <div className="border-t border-[var(--border-default)] p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("labels.confusedCallerHandling")}</label>
                <input
                  type="text"
                  value={agent.confusedCallerHandling}
                  onChange={(e) => onChange({ confusedCallerHandling: e.target.value })}
                  placeholder={t("placeholders.confusedCaller")}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("labels.offTopicHandling")}</label>
                <textarea
                  rows={2}
                  value={agent.offTopicHandling}
                  onChange={(e) => onChange({ offTopicHandling: e.target.value })}
                  placeholder={t("placeholders.offTopic")}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)] resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function VoiceStepContent({
  agent,
  workspaceName,
  voices,
  onChange,
  onVoicePreview,
  previewingVoiceId,
  onBack,
  onNext,
}: {
  agent: Agent;
  workspaceName: string;
  voices: RecallVoice[];
  onChange: (p: Partial<Agent>) => void;
  onVoicePreview: (voiceId: string) => void;
  previewingVoiceId: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("agents");
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("voiceStep.heading", { defaultValue: "How should your operator sound?" })}</h3>
      <ProfileTab agent={agent} voices={voices} workspaceName={workspaceName} onChange={onChange} onVoicePreview={onVoicePreview} previewingVoiceId={previewingVoiceId} />
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          {t("back", { defaultValue: "Back" })}
        </button>
        <button type="button" onClick={onNext} className="rounded-xl bg-[var(--bg-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          {t("continue", { defaultValue: "Continue" })}
        </button>
      </div>
    </div>
  );
}


