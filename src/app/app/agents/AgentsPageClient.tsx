"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Headphones,
  Play,
  PhoneCall,
  PhoneForwarded,
  PhoneOutgoing,
  Settings,
  Square,
  Star,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { AgentTestPanel } from "@/app/app/agents/AgentTestPanel";
import { Confetti } from "@/components/Confetti";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  AGENT_TEMPLATES,
  AGENT_TEMPLATE_CATEGORIES,
  type AgentTemplateCategory,
} from "@/lib/data/agent-templates";
import {
  CURATED_VOICES,
  DEFAULT_VOICE_ID,
  type CuratedVoice,
} from "@/lib/constants/curated-voices";
import { getTemplateVoiceId } from "@/lib/data/agent-templates";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { calculateReadiness, type ReadinessAgent } from "@/lib/readiness";

type CallStyle = "thorough" | "conversational" | "quick";

type AgentTemplateId =
  | "receptionist"
  | "after_hours"
  | "emergency"
  | "lead_qualifier"
  | "follow_up"
  | "review_request"
  | "appointment_setter"
  | "support"
  | "scratch";

type AgentPurpose = "inbound" | "outbound" | "both";

type PrimaryGoalId =
  | "answer_route"
  | "book_appointments"
  | "qualify_leads"
  | "support"
  | "sales"
  | "follow_up"
  | "custom";

type Agent = {
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
  vapiAgentId: string | null;
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

export type StepId = "identity" | "voice" | "knowledge" | "behavior" | "test" | "golive";

const SETUP_STEPS: { id: StepId; label: string; description: string }[] = [
  { id: "identity", label: "Mission", description: "What does this agent do?" },
  { id: "voice", label: "Voice", description: "How does it sound?" },
  { id: "knowledge", label: "Knowledge", description: "What does it know?" },
  { id: "behavior", label: "Behavior", description: "How does it act?" },
  { id: "test", label: "Test", description: "Does it work?" },
  { id: "golive", label: "Go live", description: "Connect to your phone" },
];

function isStepComplete(stepId: StepId, agent: Agent): boolean {
  switch (stepId) {
    case "identity":
      return !!(agent.name?.trim() && agent.greeting?.trim());
    case "voice":
      return !!agent.voice?.trim();
    case "knowledge":
      return agent.faq.filter((e) => (e.question ?? "").trim() && (e.answer ?? "").trim()).length >= 3;
    case "behavior":
      return (
        agent.alwaysTransfer.length > 0 ||
        (agent.transferPhone ?? "").trim() !== "" ||
        agent.transferRules.some((r) => (r.phrase ?? "").trim())
      );
    case "test":
      return (agent.stats?.totalCalls ?? 0) > 0 || !!(agent.vapiAgentId?.trim());
    case "golive":
      return !!(agent.vapiAgentId?.trim());
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
  label: string;
  complete: boolean;
  weight: number;
  category: ReadinessTaskCategory;
};

type AgentReadiness = {
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
    vapi_agent_id: agent.vapiAgentId?.trim() || null,
    tested_at: (agent.stats?.totalCalls ?? 0) > 0 ? "1" : null,
  };
}

function getAgentReadiness(agent: Agent): AgentReadiness {
  const snapshot = getWorkspaceMeSnapshotSync() as { name?: string; progress?: { items?: Array<{ key: string; completed?: boolean }> } } | null;
  const phoneConnected = snapshot?.progress?.items?.find((i) => i.key === "phone")?.completed ?? false;
  const workspace = { name: snapshot?.name ?? null, phoneConnected };
  const { percentage, items } = calculateReadiness(workspace, agentToReadinessAgent(agent));
  const percent = percentage;
  const tasks: ReadinessTask[] = items.map((item) => ({
    label: item.label,
    complete: item.done,
    weight: item.weight,
    category: "required" as const,
  }));
  const status =
    percent >= 90 ? "excellent" : percent >= 70 ? "good" : percent >= 40 ? "basic" : "not_ready";
  const recommendations = items.filter((i) => !i.done).map((i) => i.label);

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
  elevenlabsVoiceId?: string;
  knowledgeItems?: Array<{ q?: string; a?: string }>;
} | null;

function generateAgentId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 5 starter Q&A entries (aligned with workspace onboarding seed). */
const DEFAULT_FAQ_SEED = [
  { question: "What are your hours?", answer: "We are open Monday through Friday, 9 AM to 5 PM." },
  { question: "Where are you located?", answer: "I can have someone share our address with you. What is the best way to reach you?" },
  { question: "How do I book an appointment?", answer: "I can help you with that right now. What day works best for you?" },
  { question: "What services do you offer?", answer: "We offer a full range of services. What specifically are you looking for help with?" },
  { question: "What is your pricing?", answer: "Pricing depends on your specific needs. I can have our team send you a detailed quote. Can I get your name and email?" },
];

const ALWAYS_TRANSFER_OPTIONS = [
  "Caller explicitly asks for a human",
  "Caller is angry or frustrated",
  "Question is about billing or payments",
  "Agent cannot answer after 2 attempts",
];

function templateGreeting(id: AgentTemplateId): string {
  switch (id) {
    case "after_hours":
      return "Hi, this is your AI receptionist for Recall Touch, handling your calls after hours. How can I help today?";
    case "emergency":
      return "This is your emergency line. I’ll move quickly, keep you calm, and make sure the right person is alerted.";
    case "lead_qualifier":
      return "Thanks for reaching out. I’ll ask a few quick questions so we can get you to the right next step.";
    case "follow_up":
      return "Hi, this is your AI following up so nothing falls through the cracks. Can I check in on your last visit?";
    case "review_request":
      return "Hi, this is your AI assistant with a quick favor about your recent visit. It will only take a moment.";
    case "appointment_setter":
      return "Hi, I'm calling to help schedule a time that works for you. What does your week look like?";
    case "support":
      return "Hi, thanks for calling. I'm here to help with questions and get you to the right person if needed.";
    case "receptionist":
    default:
      return "Hi, thanks for calling. I’m your AI receptionist — I’ll get the right details and make sure nothing is missed.";
  }
}

function defaultAgent(): Agent {
  return {
    id: "a-default",
    name: "Receptionist",
    template: "receptionist",
    purpose: "both",
    primaryGoal: "answer_route",
    businessContext: "",
    targetAudience: "",
    voice: DEFAULT_VOICE_ID,
    greeting: templateGreeting("receptionist"),
    personality: 60,
    callStyle: "thorough",
    active: true,
    services: [],
    faq: [],
    specialInstructions: "",
    websiteUrl: "",
    vapiAgentId: null,
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
        { id: "budget", label: "Has budget", enabled: false },
        { id: "timeline", label: "Has timeline", enabled: false },
        { id: "decision_maker", label: "Is decision maker", enabled: false },
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
    confusedCallerHandling: "I'm sorry, let me try to help. Could you tell me what you need?",
    offTopicHandling: "I'm the phone assistant here. I can help with appointments, pricing, and general questions. What can I help with?",
    assertiveness: 50,
    whenHesitation: "acknowledge_offer_info",
    whenThinkAboutIt: "offer_follow_up",
    whenPricing: "range_then_pivot",
    whenCompetitor: "acknowledge_differentiate",
    voiceSettings: {
      stability: 0.55,
      speed: 1,
      responseDelay: 0.4,
      backchannel: true,
      denoising: true,
      similarityBoost: 0.8,
      style: 0.35,
      useSpeakerBoost: true,
    },
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

function mapAgentRow(row: Record<string, unknown>): Agent {
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
    ...defaultAgent(),
    id: String(row.id ?? generateAgentId("a")),
    name: String(row.name ?? "Receptionist"),
    purpose,
    primaryGoal: validGoal,
    businessContext: typeof knowledgeBase.businessContext === "string" ? knowledgeBase.businessContext : "",
    targetAudience: typeof knowledgeBase.targetAudience === "string" ? knowledgeBase.targetAudience : "",
    greeting: String(row.greeting ?? ""),
    voice: String(row.voice_id ?? DEFAULT_VOICE_ID),
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
    vapiAgentId: typeof row.vapi_agent_id === "string" ? row.vapi_agent_id : null,
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
      const defaultCriteria = defaultAgent().qualification.criteria;
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
    confusedCallerHandling: typeof knowledgeBase.confusedCallerHandling === "string" ? knowledgeBase.confusedCallerHandling : defaultAgent().confusedCallerHandling,
    offTopicHandling: typeof knowledgeBase.offTopicHandling === "string" ? knowledgeBase.offTopicHandling : defaultAgent().offTopicHandling,
    assertiveness: typeof knowledgeBase.assertiveness === "number" ? Math.max(0, Math.min(100, knowledgeBase.assertiveness)) : 50,
    whenHesitation: typeof knowledgeBase.whenHesitation === "string" ? knowledgeBase.whenHesitation : "acknowledge_offer_info",
    whenThinkAboutIt: typeof knowledgeBase.whenThinkAboutIt === "string" ? knowledgeBase.whenThinkAboutIt : "offer_follow_up",
    whenPricing: typeof knowledgeBase.whenPricing === "string" ? knowledgeBase.whenPricing : "range_then_pivot",
    whenCompetitor: typeof knowledgeBase.whenCompetitor === "string" ? knowledgeBase.whenCompetitor : "acknowledge_differentiate",
    active: Boolean(row.is_active ?? true),
    voiceSettings: {
      ...defaultAgent().voiceSettings,
      ...(knowledgeBase.voiceSettings ?? {}),
    },
  };
}

function buildFallbackAgent(fallback: InitialFallbackAgent): Agent | null {
  if (!fallback) return null;
  return {
    ...defaultAgent(),
    id: "primary-agent",
    name: fallback.agentName?.trim() || "Receptionist",
    greeting:
      fallback.greeting?.trim() ||
      `Thanks for calling ${fallback.businessName?.trim() || "your business"}. How can I help you today?`,
    voice: fallback.elevenlabsVoiceId?.trim() || DEFAULT_VOICE_ID,
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
  const { workspaceId: contextWorkspaceId } = useWorkspace();
  const workspaceId = contextWorkspaceId || initialWorkspaceId;
  const initialAgents = useMemo(() => {
    if (Array.isArray(initialAgentsRows) && initialAgentsRows.length > 0) {
      return initialAgentsRows.map((row) => mapAgentRow(row));
    }
    const fallbackAgent = buildFallbackAgent(initialFallbackAgent);
    return fallbackAgent ? [fallbackAgent] : [];
  }, [initialAgentsRows, initialFallbackAgent]);
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
  useEffect(() => {
    const handler = () => {
      setToast("Test link copied!");
    };
    window.addEventListener("agents:test-link-copied", handler as EventListener);
    return () => {
      window.removeEventListener("agents:test-link-copied", handler as EventListener);
    };
  }, []);
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
          ? data.agents.map((row) => mapAgentRow(row))
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
        const agent = buildFallbackAgent(fallback);
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
  }, [workspaceId, initialWorkspaceId, hasInitialPayload]);

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

  const [elevenLabsVoices, setElevenLabsVoices] =
    useState<CuratedVoice[]>(CURATED_VOICES);
  useEffect(() => {
    fetch("/api/agent/voices")
      .then((r) => r.json())
      .then((data: { voices?: CuratedVoice[] }) =>
        setElevenLabsVoices(
          Array.isArray(data.voices) && data.voices.length > 0
            ? data.voices
            : CURATED_VOICES,
        ),
      )
      .catch(() => setElevenLabsVoices(CURATED_VOICES));
  }, []);

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
      setToast("Select a voice first to hear a preview.");
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
        setToast("Could not play preview");
      };
      await audio.play();
    } catch {
      setHearPlaying(false);
      setPlayingVoiceId(null);
      setPlayingAgentId(null);
      setToast("Could not play preview");
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
        if (options?.showToast !== false) setToast("Could not save agent");
        return { patchOk: false };
      }

      const syncRes = await fetch("/api/agent/create-vapi", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentToSave.id }),
      });
      const syncData = (await syncRes.json().catch(() => null)) as
        | { vapi_agent_id?: string; error?: string }
        | null;

      if (syncRes.ok && syncData?.vapi_agent_id) {
        setAgents((current) =>
          current.map((agent) =>
            agent.id === agentToSave.id
              ? { ...agent, vapiAgentId: syncData!.vapi_agent_id ?? agent.vapiAgentId }
              : agent,
          ),
        );
        const successMsg = options?.successToast ?? "Agent saved and synced live";
        if (options?.showToast !== false) setToast(successMsg);
        return { patchOk: true, vapiId: syncData.vapi_agent_id };
      }

      if (options?.showToast !== false) {
        setToast(
          options?.successToast
            ?? (syncRes.status === 503
              ? "Agent saved; voice sync unavailable (check voice config)"
              : "Agent saved; voice sync failed"),
        );
      }
      return { patchOk: true, vapiId: null };
    } catch {
      if (options?.showToast !== false) setToast("Could not save agent");
      return { patchOk: false };
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    await persistAgent(selected, { showToast: true, successToast: "Changes saved ✓" });
  };

  const handleStepChange = async (newStepId: StepId) => {
    if (!selected || newStepId === activeStep) return;
    const result = await persistAgent(selected, { showToast: false });
    if (result.patchOk) {
      setActiveStep(newStepId);
    } else {
      setToast("Changes couldn't be saved. Try again.");
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
      setToast("Agent deleted");
    } catch {
      setToast("Could not delete agent");
    } finally {
      setDeleteConfirmAgent(null);
    }
  };

  const createAgentFromTemplate = async (template: AgentTemplateId) => {
    if (!workspaceId) return;
    const base = defaultAgent();
    const nameByTemplate: Record<AgentTemplateId, string> = {
      receptionist: "Receptionist",
      after_hours: "After-Hours",
      emergency: "Emergency Line",
      lead_qualifier: "Sales Caller",
      follow_up: "Follow-Up",
      review_request: "Review Request",
      appointment_setter: "Appointment Setter",
      support: "Support",
      scratch: "Custom Agent",
    };
    const agent: Agent = {
      ...base,
      id: generateAgentId("temp"),
      template,
      name: nameByTemplate[template],
      voice: getTemplateVoiceId(template) || base.voice,
      greeting: templateGreeting(template),
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
      const result = await persistAgent(persisted, { showToast: false });
      const assistantId = result?.vapiId ?? null;
      const next = [...agents, { ...persisted, vapiAgentId: assistantId }];
      setAgents(next);
      setSelectedId(persisted.id);
      setActiveStep(getFirstIncompleteStep({ ...persisted, vapiAgentId: assistantId }));
      setShowTemplateModal(false);
      setToast("Agent created and synced");
    } catch {
      setToast("Could not create agent");
    }
  };

  const createAgentFromSharedTemplate = async (templateId: string) => {
    const t = AGENT_TEMPLATES.find((x) => x.id === templateId);
    if (!t || !workspaceId) return;
    const base = defaultAgent();
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
      const result = await persistAgent(persisted, { showToast: false });
      const assistantId = result?.vapiId ?? null;
      const next = [...agents, { ...persisted, vapiAgentId: assistantId }];
      setAgents(next);
      setSelectedId(persisted.id);
      setActiveStep(getFirstIncompleteStep({ ...persisted, vapiAgentId: assistantId }));
      setShowTemplateModal(false);
      setToast("Agent created and synced");
    } catch {
      setToast("Could not create agent");
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6 overflow-x-hidden min-w-0">
      {showConfetti && <Confetti key="agent-activate-confetti" />}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-white">AI Agents</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Different agents for daytime, after-hours, emergencies, and follow-up.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplateModal(true)}
          className="hidden sm:inline-flex items-center gap-1.5 bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
        >
          + Create Agent
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowTemplateModal(true)}
        className="sm:hidden mb-4 w-full bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
      >
        + Create Agent
      </button>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] gap-4 lg:gap-6 items-stretch lg:min-h-[480px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 animate-pulse" aria-hidden>
                <div className="h-4 w-3/4 rounded bg-[var(--border-default)] mb-3" />
                <div className="h-3 w-1/2 rounded bg-[var(--border-default)] mb-2" />
                <div className="h-3 w-full rounded bg-[var(--border-default)] mb-2" />
                <div className="h-3 w-2/3 rounded bg-[var(--border-default)]" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 animate-pulse" aria-hidden>
            <div className="h-4 w-1/3 rounded bg-[var(--border-default)] mb-4" />
            <div className="h-20 rounded bg-[var(--border-default)] mb-4" />
            <div className="h-32 rounded bg-[var(--border-default)]" />
          </div>
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row h-full min-h-0 gap-4 lg:gap-0 lg:min-h-[480px]">
        <div className="w-full lg:w-[280px] lg:shrink-0 lg:border-r lg:border-[var(--border-default)] lg:overflow-y-auto lg:pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 content-start">
          {agents.map((agent) => (
            <div
              key={agent.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedId(agent.id);
                setActiveStep(getFirstIncompleteStep(agent));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(agent.id);
                  setActiveStep(getFirstIncompleteStep(agent));
                }
              }}
              className={`text-left p-4 rounded-2xl border bg-[var(--bg-input)]/50 hover:bg-[var(--bg-input)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
                selected?.id === agent.id ? "border-[var(--border-medium)]" : "border-[var(--border-default)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-medium text-sm text-white truncate">{agent.name}</p>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    agent.active ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {agent.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mb-1">
                Voice: {elevenLabsVoices.find((v) => v.id === agent.voice)?.name ?? "Voice"}
                {" · "}
                {agent.purpose === "inbound" ? "Inbound" : agent.purpose === "outbound" ? "Outbound" : "Inbound + Outbound"}
              </p>
              <p className="text-[11px] text-zinc-500">
                Knows: {(agent.faq?.filter((e) => (e.question ?? "").trim() && (e.answer ?? "").trim()).length ?? 0)} Q&As
                {(agent.services?.length ?? 0) > 0 && ` · ${agent.services.length} services`}
              </p>
              <p className="text-[11px] text-zinc-500">
                Rules:{" "}
                {[
                  ((agent.alwaysTransfer?.length ?? 0) > 0 || (agent.transferRules?.length ?? 0) > 0) && "Transfer on request",
                  agent.afterHoursMode && agent.afterHoursMode !== "messages" && "After-hours",
                ]
                  .filter(Boolean)
                  .join(", ") || "Default"}
              </p>
              {(() => {
                const readiness = getAgentReadiness(agent);
                const isLive = !!(agent.vapiAgentId?.trim());
                return (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    {isLive ? (
                      <span className="text-green-500/80">Live</span>
                    ) : (
                      <span className={readiness.percent >= 80 ? "text-green-500/80" : readiness.percent >= 40 ? "text-amber-500/80" : "text-zinc-500"}>
                        {readiness.percent}% ready
                      </span>
                    )}
                    {" · "}{agent.stats.totalCalls} calls
                  </p>
                );
              })()}
              <div className="mt-3 pt-2 border-t border-[var(--border-default)] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
                  onClick={() => { setSelectedId(agent.id); setActiveStep(getFirstIncompleteStep(agent)); }}
                >
                  Edit
                </button>
                <span className="text-zinc-600">·</span>
                <button
                  type="button"
                  className="text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
                  onClick={() => { setSelectedId(agent.id); setActiveStep("test"); }}
                >
                  Test
                </button>
                <span className="text-zinc-600">·</span>
                <button
                  type="button"
                  className="text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
                  onClick={() => { setSelectedId(agent.id); setActiveStep("golive"); }}
                >
                  Launch
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] lg:overflow-hidden">
          {selected ? (
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 min-w-0">
              <div className="w-full lg:w-[240px] flex-shrink-0 border-r border-[var(--border-default)] p-4 space-y-4 overflow-y-auto">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-medium text-sm text-white truncate">{selected.name}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selected.active ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
                      {selected.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {selected.vapiAgentId?.trim() ? (
                      <span className="text-green-500/80">Live</span>
                    ) : (
                      <span className={getAgentReadiness(selected).percent >= 80 ? "text-green-500/80" : getAgentReadiness(selected).percent >= 40 ? "text-amber-500/80" : "text-zinc-500"}>
                        {getAgentReadiness(selected).percent}% ready
                      </span>
                    )}
                    {" · "}{selected.stats.totalCalls} calls
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-zinc-500 mb-2">Agent setup</p>
                  <div className="lg:hidden mb-2">
                    <p className="text-[11px] text-zinc-500 mb-1.5">
                      Step {SETUP_STEPS.findIndex((s) => s.id === activeStep) + 1} of {SETUP_STEPS.length}
                    </p>
                    <label htmlFor="agent-step-select" className="sr-only">Jump to setup step</label>
                    <select
                      id="agent-step-select"
                      value={activeStep}
                      onChange={(e) => void handleStepChange(e.target.value as StepId)}
                      aria-label="Jump to setup step"
                      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                    >
                      {SETUP_STEPS.map((step, i) => (
                        <option key={step.id} value={step.id}>
                          {i + 1}. {step.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="hidden lg:block space-y-1">
                  {SETUP_STEPS.map((step, i) => {
                    const complete = isStepComplete(step.id, selected);
                    const active = activeStep === step.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => void handleStepChange(step.id)}
                        aria-label={`${step.label}: ${step.description}${complete ? ", completed" : ""}${active ? ", current step" : ""}`}
                        aria-current={active ? "step" : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                          active ? "bg-[var(--bg-hover)] border border-[var(--border-medium)]" : "hover:bg-[var(--bg-card)] border border-transparent"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          complete ? "bg-emerald-500/20" : active ? "bg-[var(--bg-hover)]" : "bg-[var(--bg-input)]"
                        }`}>
                          {complete ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
                          ) : (
                            <span className="text-xs text-white/30">{i + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${active ? "text-white" : "text-[var(--text-secondary)]"}`}>{step.label}</p>
                          <p className="text-xs text-[var(--text-tertiary)] truncate">{step.description}</p>
                        </div>
                        {active && <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" aria-hidden />}
                      </button>
                    );
                  })}
                  </div>
                </div>
                <p className="text-[11px] font-medium text-zinc-500 mb-2 pt-2">Quick actions</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleStepChange("identity")} aria-label="Edit agent" className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-zinc-300 hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Edit</button>
                  <button type="button" onClick={() => void handleStepChange("test")} aria-label="Test agent" className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-zinc-300 hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Test</button>
                  <button type="button" onClick={() => void handleStepChange("golive")} aria-label="Go live" className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-zinc-300 hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Go live</button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" onClick={handleDelete} aria-label="Delete this agent" className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-zinc-300 hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Delete</button>
                  <button type="button" onClick={handleSave} disabled={saving} aria-label={saving ? "Saving agent" : "Save agent and sync to voice"} className="px-4 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
              <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 relative break-words" style={{ overflowWrap: "anywhere" }} aria-labelledby="agent-step-heading">
                {saving && <div className="absolute top-3 right-3 text-xs text-white/30">Saving...</div>}
                <h2 id="agent-step-heading" className="text-xs text-zinc-500 mb-4 font-normal">
                  Currently on: {SETUP_STEPS.find((s) => s.id === activeStep)?.label ?? activeStep}
                </h2>
                <div role="status" aria-live="polite" className="sr-only">
                  Step {SETUP_STEPS.findIndex((s) => s.id === activeStep) + 1} of {SETUP_STEPS.length}: {SETUP_STEPS.find((s) => s.id === activeStep)?.label ?? activeStep}
                </div>
                {activeStep === "identity" && (
                  <IdentityStepContent agent={selected} onChange={updateSelected} onNext={async () => { await handleStepChange("voice"); }} />
                )}
                {activeStep === "voice" && (
                  <VoiceStepContent agent={selected} workspaceName={initialWorkspaceName} voices={elevenLabsVoices} onChange={updateSelected} onVoicePreview={(voiceId) => void playAudioPreview({ key: voiceId, voiceId, text: selected.greeting.trim() || "Thanks for calling. How can I help you today?", settings: selected.voiceSettings })} previewingVoiceId={playingVoiceId} onBack={() => void handleStepChange("identity")} onNext={async () => { await handleStepChange("knowledge"); }} />
                )}
                {activeStep === "knowledge" && (
                  <KnowledgeStepContent agent={selected} onChange={updateSelected} onBack={() => void handleStepChange("voice")} onNext={async () => { await handleStepChange("behavior"); }} />
                )}
                {activeStep === "behavior" && (
                  <BehaviorStepContent agent={selected} onChange={updateSelected} onBack={() => void handleStepChange("knowledge")} onNext={async () => { await handleStepChange("test"); }} />
                )}
                {activeStep === "test" && (
                  <TestStepContent agent={selected} workspaceName={initialWorkspaceName} onBack={() => void handleStepChange("behavior")} onNext={async () => { await handleStepChange("golive"); }} />
                )}
                {activeStep === "golive" && (
                  <GoLiveStepContent agent={selected} voices={elevenLabsVoices} getReadiness={getAgentReadiness} onBack={() => void handleStepChange("test")} onActivate={async () => { const result = await persistAgent(selected, { showToast: true }); if (result.vapiId) { setAgents((c) => c.map((a) => (a.id === selected.id ? { ...a, vapiAgentId: result.vapiId ?? null } : a))); setToast("Your AI agent is live! 🎉"); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); } }} activating={saving} />
                )}
              </div>
            </div>
          ) : agents.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-white mb-1">No agents yet</p>
              <p className="text-xs text-zinc-500 mb-6 max-w-sm mx-auto">Create your first AI agent to answer calls, capture leads, and book appointments.</p>
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label="Create your first agent"
              >
                + Create Agent
              </button>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Select or create an agent to edit how it answers calls.
            </p>
          )}
        </div>
      </div>
      )}

      <p className="mt-6">
        <Link
          href="/app/activity"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Activity
        </Link>
      </p>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm text-zinc-100 shadow-lg">
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
                <h2 id="create-agent-dialog-title" className="text-sm font-semibold text-white">Create agent</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Start from a proven pattern instead of configuring from scratch.
                </p>
              </div>
              <button
                ref={templateModalCloseRef}
                type="button"
                onClick={() => setShowTemplateModal(false)}
                aria-label="Close create agent dialog"
                className="text-xs text-zinc-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
              <TemplateCard
                title="Receptionist"
                icon={PhoneCall}
                description="Answer calls, route, and handle FAQs."
                onClick={() => createAgentFromTemplate("receptionist")}
              />
              <TemplateCard
                title="Sales Caller"
                icon={ClipboardList}
                description="Call leads, qualify, and pitch."
                onClick={() => createAgentFromTemplate("lead_qualifier")}
              />
              <TemplateCard
                title="Appointment Setter"
                icon={Calendar}
                description="Book meetings, confirm, and remind."
                onClick={() => createAgentFromTemplate("appointment_setter")}
              />
              <TemplateCard
                title="Support"
                icon={PhoneForwarded}
                description="Triage, answer, and escalate."
                onClick={() => createAgentFromTemplate("support")}
              />
              <TemplateCard
                title="Follow-Up"
                icon={BellRing}
                description="Re-engage cold leads and check in."
                onClick={() => createAgentFromTemplate("follow_up")}
              />
              <TemplateCard
                title="Custom"
                icon={Star}
                description="Start from scratch."
                onClick={() => createAgentFromTemplate("scratch")}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              More options: <button type="button" onClick={() => setTemplateCategory("all")} className="underline hover:text-white">After-hours</button>, <button type="button" onClick={() => createAgentFromTemplate("emergency")} className="underline hover:text-white">Emergency</button>, <button type="button" onClick={() => createAgentFromTemplate("review_request")} className="underline hover:text-white">Review Request</button>
            </p>
            <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs font-medium text-zinc-400 mb-2">
                Or pick by communication style (20+ templates)
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setTemplateCategory("all")}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    templateCategory === "all"
                      ? "border-[var(--border-medium)] bg-zinc-800 text-white"
                      : "border-[var(--border-medium)] text-zinc-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                {AGENT_TEMPLATE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTemplateCategory(c.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      templateCategory === c.id
                        ? "border-[var(--border-medium)] bg-zinc-800 text-white"
                        : "border-[var(--border-medium)] text-zinc-400 hover:text-white"
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
                    className="w-full text-left px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)]/50 hover:bg-[var(--bg-input)] hover:border-zinc-600 text-xs transition-colors"
                  >
                    <span className="font-medium text-white">{t.name}</span>
                    <span className="text-zinc-500 ml-1">· {t.styleLabel}</span>
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
          title="Delete agent"
          message={`Delete "${deleteConfirmAgent.name}"? This cannot be undone.`}
          confirmLabel="Delete"
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
      className="text-left p-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-input)] hover:border-zinc-600 transition-colors"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-input)] text-zinc-300">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm font-medium text-white mb-1">{title}</p>
      <p className="text-xs text-zinc-500">{description}</p>
    </button>
  );
}

function VoiceCard(props: {
  voice: CuratedVoice;
  selected: boolean;
  previewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const { voice, selected, previewing, onSelect, onPreview } = props;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      aria-pressed={selected}
      aria-label={`${voice.name}, ${voice.description}. ${selected ? "Selected." : "Select this voice."}`}
      className={`relative cursor-pointer rounded-xl p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        selected
          ? "border-2 border-white bg-[var(--bg-hover)] ring-1 ring-white/20"
          : "border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-medium)]"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        aria-label={`Preview ${voice.name} voice`}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-hover)] transition-colors hover:bg-white/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {previewing ? (
          <Square className="h-3 w-3 fill-current text-[var(--text-secondary)]" />
        ) : (
          <Play className="h-3 w-3 fill-current text-[var(--text-secondary)]" />
        )}
      </button>
      <p className="text-sm font-medium text-[var(--text-primary)]">{voice.name}</p>
      <p className="mt-0.5 text-xs text-white/40">{voice.description}</p>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{voice.accent}</p>
      <p className="mt-2 pr-8 text-[10px] leading-tight text-white/20">{voice.bestFor}</p>
    </div>
  );
}

function RangeSetting(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  note?: string;
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step, suffix, note, onChange } = props;
  return (
    <div>
      <label className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="text-zinc-500">
          {value}
          {suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-white"
      />
      {note ? <p className="mt-1 text-[10px] text-zinc-500">{note}</p> : null}
    </div>
  );
}

function ConversationPreview({ agent, workspaceName }: { agent: Agent; workspaceName: string }) {
  const previews = useMemo(() => {
    const items: Array<{ question: string; answer: string }> = [];
    const faq = agent.faq?.filter((e) => (e.question ?? "").trim() && (e.answer ?? "").trim()) ?? [];
    faq.slice(0, 3).forEach((e) => {
      items.push({ question: e.question, answer: e.answer });
    });
    const hasTransfer = (agent.alwaysTransfer?.length ?? 0) > 0 || (agent.transferRules?.length ?? 0) > 0;
    if (hasTransfer) {
      items.push({
        question: "I need to speak to someone",
        answer: "Of course. Let me transfer you now.",
      });
    }
    items.push({
      question: "Something not in your knowledge base",
      answer: "That's a great question. Let me have someone get back to you on that. Can I get your name and number?",
    });
    const businessName = workspaceName.trim() || "this business";
    items.push({
      question: "Are you a robot?",
      answer: `I'm the phone assistant for ${businessName}. How can I help you today?`,
    });
    return items;
  }, [agent.faq, agent.alwaysTransfer, agent.transferRules, workspaceName]);

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">How your AI handles calls</h3>
      <p className="text-xs text-white/30 mb-4">
        Your agent has a natural conversation after the greeting. Here&apos;s how it responds:
      </p>
      <div className="space-y-0 border border-[var(--border-default)] rounded-xl overflow-hidden">
        {previews.map((p, i) => (
          <div key={i} className={`p-3 ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
            <p className="text-xs text-white/40 mb-1.5">&ldquo;{p.question}&rdquo;</p>
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="text-blue-400/60 text-xs mr-1.5">AI:</span>
              {p.answer}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/20 mt-3">
        Generated from your knowledge base and rules. Add more entries to make your AI smarter.
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
  voices: CuratedVoice[];
  workspaceName: string;
  onChange: (partial: Partial<Agent>) => void;
  onVoicePreview: (voiceId: string) => void;
  previewingVoiceId: string | null;
}) {
  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Agent name</label>
        <input
          type="text"
          value={agent.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          placeholder="Receptionist"
        />
      </div>

      <div>
        <p className="text-[11px] text-zinc-500 mb-2">Voice</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {voices.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              selected={agent.voice === voice.id}
              previewing={previewingVoiceId === voice.id}
              onSelect={() => onChange({ voice: voice.id })}
              onPreview={() => onVoicePreview(voice.id)}
            />
          ))}
        </div>
        <details className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <summary className="cursor-pointer text-xs text-zinc-400 hover:text-white">
            Advanced voice settings
          </summary>
          <div className="mt-4 space-y-4">
            <RangeSetting
              label="Stability"
              value={agent.voiceSettings.stability}
              min={0}
              max={1}
              step={0.05}
              suffix=""
              note="Lower feels more expressive. Higher feels more consistent."
              onChange={(value) =>
                onChange({
                  voiceSettings: { ...agent.voiceSettings, stability: value },
                })
              }
            />
            <RangeSetting
              label="Speed"
              value={agent.voiceSettings.speed}
              min={0.8}
              max={1.3}
              step={0.05}
              suffix="x"
              onChange={(value) =>
                onChange({
                  voiceSettings: { ...agent.voiceSettings, speed: value },
                })
              }
            />
            <RangeSetting
              label="Response delay"
              value={agent.voiceSettings.responseDelay}
              min={0}
              max={1.5}
              step={0.1}
              suffix="s"
              note="A slight pause can sound more thoughtful. 0.3-0.5 seconds is usually best."
              onChange={(value) =>
                onChange({
                  voiceSettings: { ...agent.voiceSettings, responseDelay: value },
                })
              }
            />
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={agent.voiceSettings.backchannel}
                onChange={(e) =>
                  onChange({
                    voiceSettings: {
                      ...agent.voiceSettings,
                      backchannel: e.target.checked,
                    },
                  })
                }
                className="accent-white"
              />
              Backchannel sounds while listening
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={agent.voiceSettings.denoising}
                onChange={(e) =>
                  onChange({
                    voiceSettings: {
                      ...agent.voiceSettings,
                      denoising: e.target.checked,
                    },
                  })
                }
                className="accent-white"
              />
              Background noise reduction
            </label>
          </div>
        </details>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Opening greeting</label>
        <p className="text-[11px] text-white/30 mb-2">This is how your AI answers the phone. After this, it has a natural conversation based on your knowledge and rules.</p>
        <textarea
          rows={3}
          value={agent.greeting}
          onChange={(e) => onChange({ greeting: e.target.value })}
          placeholder="Thanks for calling. How can I help you today?"
          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none resize-none"
        />
      </div>

      <ConversationPreview agent={agent} workspaceName={workspaceName} />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>Personality</span>
          <span>Professional ←→ Friendly</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={agent.personality}
          onChange={(e) => onChange({ personality: Number(e.target.value) })}
          className="w-full accent-white"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-zinc-500">Call style</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: "thorough" as CallStyle,
              label: "Thorough",
              desc: "Covers details, slower pace",
            },
            {
              id: "conversational" as CallStyle,
              label: "Conversational",
              desc: "Natural, mid-length calls",
            },
            { id: "quick" as CallStyle, label: "Quick", desc: "Short, direct, gets to booking" },
          ].map(({ id, label, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ callStyle: id })}
              className={`text-left p-2 rounded-xl border text-[11px] ${
                agent.callStyle === id
                  ? "border-white bg-[var(--bg-input)] text-white"
                  : "border-[var(--border-default)] bg-[var(--bg-input)]/50 text-zinc-300"
              }`}
            >
              <p className="font-medium mb-0.5">{label}</p>
              <p className="text-[10px] text-zinc-500">{desc}</p>
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
              agent.active ? "bg-green-500" : "bg-zinc-700"
            }`}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all"
              style={{ left: agent.active ? "22px" : "2px" }}
            />
          </button>
          <span className="text-[11px] text-zinc-300">
            {agent.active ? "Active on your number" : "Inactive"}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500">{agent.stats.totalCalls} calls so far</p>
      </div>
    </div>
  );
}

function KnowledgeTab({
  agent,
  onChange,
}: {
  agent: Agent;
  onChange: (partial: Partial<Agent>) => void;
}) {
  const addFaqRow = () => {
    const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange({ faq: [...agent.faq, { id, question: "", answer: "" }] });
  };

  const seedDefaults = () => {
    const entries = DEFAULT_FAQ_SEED.map((item, index) => ({
      id: `seed-${Date.now()}-${index}`,
      question: item.question,
      answer: item.answer,
    }));
    onChange({ faq: agent.faq.length === 0 ? entries : [...agent.faq, ...entries] });
  };

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Knowledge base</h3>
          <p className="text-xs text-white/40">
            Q&A pairs your agent uses to answer callers clearly and consistently.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={seedDefaults}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            {agent.faq.length === 0 ? "Seed 5 starter entries" : "Add 5 starter entries"}
          </button>
          <button
            type="button"
            onClick={addFaqRow}
            className="text-sm text-white hover:text-zinc-300"
          >
            + Add entry
          </button>
        </div>
      </div>

      {agent.faq.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-300">No knowledge entries yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Add common questions and short answers so callers get clear next steps.
          </p>
          <button
            type="button"
            onClick={seedDefaults}
            className="mt-4 rounded-xl border border-[var(--border-medium)] px-3 py-2 text-xs text-zinc-200 hover:border-[var(--border-medium)]"
          >
            Seed 5 starter entries
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agent.faq.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] text-zinc-500">Entry {index + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      faq: agent.faq.filter((f) => f.id !== item.id),
                    })
                  }
                  className="text-[11px] text-zinc-500 hover:text-white"
                >
                  Remove
                </button>
              </div>
              <label className="text-xs text-zinc-500">When caller asks about...</label>
              <input
                type="text"
                value={item.question}
                onChange={(e) =>
                  onChange({
                    faq: agent.faq.map((f) =>
                      f.id === item.id ? { ...f, question: e.target.value } : f,
                    ),
                  })
                }
                className="mt-1 w-full border-b border-[var(--border-default)] bg-transparent py-1 text-sm text-[var(--text-primary)] focus:outline-none"
                placeholder="What do callers usually ask?"
              />
              <label className="mt-3 block text-xs text-zinc-500">Agent responds with...</label>
              <textarea
                rows={2}
                value={item.answer}
                onChange={(e) =>
                  onChange({
                    faq: agent.faq.map((f) =>
                      f.id === item.id ? { ...f, answer: e.target.value } : f,
                    ),
                  })
                }
                className="mt-1 w-full border-b border-[var(--border-default)] bg-transparent py-1 text-sm text-[var(--text-primary)] focus:outline-none resize-none"
                placeholder="How should the agent respond?"
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Special instructions</label>
        <textarea
          rows={3}
          value={agent.specialInstructions}
          onChange={(e) => onChange({ specialInstructions: e.target.value })}
          aria-label="Special instructions for the agent"
          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black resize-none"
          placeholder="Anything the agent should always remember on calls."
        />
      </div>
    </div>
  );
}

const DEFAULT_OBJECTIONS = [
  { trigger: "Too expensive", response: "We offer flexible pricing. Can I learn more about your budget?" },
  { trigger: "I need to think about it", response: "Of course. Can I follow up tomorrow to answer any questions?" },
  { trigger: "I'm already working with someone", response: "That's great. We'd love to be your backup. Can I send our info?" },
];

function RulesTab({
  agent,
  onChange,
}: {
  agent: Agent;
  onChange: (partial: Partial<Agent>) => void;
}) {
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

  const WHEN_HESITATION_OPTIONS = [
    { id: "wait_patiently", label: "Wait patiently" },
    { id: "ask_what_thinking", label: "Ask what they're thinking" },
    { id: "acknowledge_offer_info", label: "Acknowledge their concern and offer more information" },
    { id: "offer_alternatives", label: "Offer alternatives" },
    { id: "redirect", label: "Redirect to the main point" },
  ];
  const WHEN_THINK_OPTIONS = [
    { id: "accept_gracefully", label: "Accept gracefully" },
    { id: "offer_follow_up", label: "Offer to follow up: \"I can call you back tomorrow — what time works?\"" },
    { id: "create_urgency", label: "Create gentle urgency" },
    { id: "ask_what_help", label: "Ask what would help them decide" },
  ];
  const WHEN_PRICING_OPTIONS = [
    { id: "give_full", label: "Give full pricing" },
    { id: "range_then_pivot", label: "Give range if available, then pivot to booking" },
    { id: "redirect_consultation", label: "Redirect to consultation" },
    { id: "defer_human", label: "Defer to human" },
  ];
  const WHEN_COMPETITOR_OPTIONS = [
    { id: "acknowledge", label: "Acknowledge only" },
    { id: "acknowledge_differentiate", label: "Acknowledge and differentiate without criticizing" },
    { id: "redirect_strengths", label: "Redirect to your strengths" },
    { id: "defer_human", label: "Defer to human" },
  ];

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h3 className="mb-3 text-sm font-medium text-[var(--text-primary)]">Conversation style</h3>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Assertiveness</span>
            <span>Gentle ←→ Direct</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={agent.assertiveness}
            onChange={(e) => onChange({ assertiveness: Number(e.target.value) })}
            className="w-full accent-white"
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">When the caller hesitates</label>
            <select
              value={agent.whenHesitation}
              onChange={(e) => onChange({ whenHesitation: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--border-medium)]"
            >
              {WHEN_HESITATION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">When the caller says &ldquo;let me think about it&rdquo;</label>
            <select
              value={agent.whenThinkAboutIt}
              onChange={(e) => onChange({ whenThinkAboutIt: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--border-medium)]"
            >
              {WHEN_THINK_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">When the caller asks about pricing</label>
            <select
              value={agent.whenPricing}
              onChange={(e) => onChange({ whenPricing: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--border-medium)]"
            >
              {WHEN_PRICING_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">When the caller mentions a competitor</label>
            <select
              value={agent.whenCompetitor}
              onChange={(e) => onChange({ whenCompetitor: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--border-medium)]"
            >
              {WHEN_COMPETITOR_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h3 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Transfer to a human when...</h3>
        <div className="space-y-2">
          {ALWAYS_TRANSFER_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="accent-white"
                checked={agent.alwaysTransfer.includes(option)}
                onChange={(e) =>
                  onChange({
                    alwaysTransfer: e.target.checked
                      ? [...agent.alwaysTransfer, option]
                      : agent.alwaysTransfer.filter((item) => item !== option),
                  })
                }
              />
              {option}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-xs text-zinc-500">Transfer to phone number</label>
          <input
            type="tel"
            value={agent.transferPhone}
            onChange={(e) => onChange({ transferPhone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            aria-label="Transfer to phone number"
            className="mt-1 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Never say</label>
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
          aria-label="Words or phrases the agent should never say"
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black resize-none"
          placeholder="Competitor names, legal advice, pricing specifics..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] text-zinc-500">Phrase-based transfer rules</label>
          <button
            type="button"
            onClick={addTransferRule}
            aria-label="Add phrase-based transfer rule"
            className="text-[11px] text-zinc-300 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
          >
            + Add rule
          </button>
        </div>
        {agent.transferRules.length === 0 ? (
          <p className="text-[11px] text-zinc-600">
            Examples: &quot;billing&quot; → your billing specialist, &quot;emergency&quot; →
            on-call phone.
          </p>
        ) : (
          <div className="space-y-3">
            {agent.transferRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-zinc-500">When caller says…</p>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        transferRules: agent.transferRules.filter((r) => r.id !== rule.id),
                      })
                    }
                    className="text-[11px] text-zinc-500 hover:text-zinc-200"
                  >
                    Remove
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-[var(--border-default)] text-xs text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder="e.g., emergency, billing, new patient"
                />
                <p className="text-[11px] text-zinc-500">→ Call this number</p>
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-[var(--border-default)] text-xs text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder="(503) 555-0199"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {agent.learnedBehaviors.length > 0 && (
        <div>
          <label className="mb-2 block text-[11px] text-zinc-500">Learned behaviors (from Call Intelligence)</label>
          <div className="space-y-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
            {agent.learnedBehaviors.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="flex-1">{line}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      learnedBehaviors: agent.learnedBehaviors.filter((_, i) => i !== idx),
                    })
                  }
                  className="shrink-0 text-zinc-500 hover:text-white text-xs"
                  aria-label="Remove"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-[11px] text-zinc-500">After-hours behavior</label>
        <select
          value={agent.afterHoursMode}
          onChange={(e) => onChange({ afterHoursMode: e.target.value as Agent["afterHoursMode"] })}
          aria-label="After-hours behavior"
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
        >
          <option value="messages">Take message and notify</option>
          <option value="forward">Schedule callback</option>
          <option value="emergency">Transfer to emergency line</option>
          <option value="closed">Closed greeting only</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Maximum call duration</label>
        <select
          value={[0, 5, 10, 12, 15, 30].includes(agent.maxCallDuration) ? String(agent.maxCallDuration) : "15"}
          onChange={(e) => onChange({ maxCallDuration: Number(e.target.value) })}
          aria-label="Maximum call duration in minutes"
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
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Appointment booking</h3>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            className="accent-white"
            checked={agent.bookingEnabled}
            onChange={(e) => onChange({ bookingEnabled: e.target.checked })}
          />
          Agent can book appointments
        </label>
        {agent.bookingEnabled && (
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Default duration</label>
            <select
              value={[15, 30, 45, 60].includes(agent.bookingDefaultDurationMinutes) ? String(agent.bookingDefaultDurationMinutes) : "30"}
              onChange={(e) => onChange({ bookingDefaultDurationMinutes: Number(e.target.value) })}
              aria-label="Default appointment duration"
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
            <p className="mt-1 text-[11px] text-zinc-500">Available slots: linked to calendar or manual entry.</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Follow-up behavior</h3>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            className="accent-white"
            checked={agent.followUpSMS}
            onChange={(e) => onChange({ followUpSMS: e.target.checked })}
          />
          Send follow-up SMS after every call
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            className="accent-white"
            checked={agent.notifyOwnerOnLead}
            onChange={(e) => onChange({ notifyOwnerOnLead: e.target.checked })}
          />
          Notify owner when lead captured
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            className="accent-white"
            checked={agent.sendSummaryEmail}
            onChange={(e) => onChange({ sendSummaryEmail: e.target.checked })}
          />
          Send call summary via email
        </label>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Conversation style</h3>
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Pace</label>
          <select
            value={agent.callStyle}
            onChange={(e) => onChange({ callStyle: e.target.value as CallStyle })}
            aria-label="Conversation pace"
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
          >
            <option value="thorough">Thorough</option>
            <option value="conversational">Conversational</option>
            <option value="quick">Quick</option>
          </select>
        </div>
        {(agent.purpose === "outbound" || agent.purpose === "both") && (
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Persistence (outbound)</label>
            <select
              value={agent.persistence}
              onChange={(e) => onChange({ persistence: e.target.value as Agent["persistence"] })}
              aria-label="Outbound persistence"
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        )}
      </div>

      {/* Qualification framework — collapsed by default */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenAdvanced((s) => ({ ...s, qualification: !s.qualification }))}
          className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-inset"
          aria-expanded={openAdvanced.qualification}
        >
          Qualification framework
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.qualification ? "rotate-180" : ""}`} />
        </button>
        {openAdvanced.qualification && (
          <div className="border-t border-[var(--border-default)] p-4 space-y-3">
            <p className="text-[11px] text-zinc-500">What makes someone a qualified lead?</p>
            {(agent.qualification?.criteria ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  className="accent-white"
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
              <label className="block text-[11px] text-zinc-500 mb-1">Custom criterion</label>
              <input
                type="text"
                value={agent.qualification?.customCriterion ?? ""}
                onChange={(e) =>
                  onChange({
                    qualification: { ...agent.qualification, customCriterion: e.target.value },
                  })
                }
                placeholder="e.g., Has authority to sign"
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
          className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-inset"
          aria-expanded={openAdvanced.objection}
        >
          Objection handling
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.objection ? "rotate-180" : ""}`} />
        </button>
        {openAdvanced.objection && (
          <div className="border-t border-[var(--border-default)] p-4 space-y-4">
            <p className="text-[11px] text-zinc-500">Common objections and how to respond.</p>
            {(agent.objections ?? []).map((o) => (
              <div key={o.id} className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">If they say…</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        objections: agent.objections.filter((x) => x.id !== o.id),
                      })
                    }
                    className="text-[11px] text-zinc-500 hover:text-zinc-200"
                  >
                    Remove
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-[var(--border-default)] text-xs text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder='e.g., "Too expensive"'
                />
                <span className="text-[11px] text-zinc-500">Response</span>
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-[var(--border-default)] text-xs text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder="We offer flexible pricing..."
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
                className="text-[11px] text-zinc-300 underline underline-offset-2 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded"
              >
                Add objection
              </button>
              {(agent.objections?.length ?? 0) === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = DEFAULT_OBJECTIONS.map((o, i) => ({
                      id: `obj-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                      trigger: o.trigger,
                      response: o.response,
                    }));
                    onChange({ objections: next });
                  }}
                  className="text-[11px] text-zinc-300 underline underline-offset-2 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded"
                >
                  Add from suggestions
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
            className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-inset"
            aria-expanded={openAdvanced.outbound}
          >
            Outbound call settings
            <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.outbound ? "rotate-180" : ""}`} />
          </button>
          {openAdvanced.outbound && (
            <div className="border-t border-[var(--border-default)] p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Opening strategy</label>
                <input
                  type="text"
                  value={agent.outboundOpening}
                  onChange={(e) => onChange({ outboundOpening: e.target.value })}
                  placeholder="Hi {name}, this is calling from {business}. I'm following up on..."
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Goal of outbound calls</label>
                <select
                  value={agent.outboundGoal}
                  onChange={(e) => onChange({ outboundGoal: e.target.value as Agent["outboundGoal"] })}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                >
                  <option value="book">Book an appointment</option>
                  <option value="qualify">Qualify the lead</option>
                  <option value="deliver">Deliver information</option>
                  <option value="custom">Custom</option>
                </select>
                {agent.outboundGoal === "custom" && (
                  <input
                    type="text"
                    value={agent.outboundGoalCustom}
                    onChange={(e) => onChange({ outboundGoalCustom: e.target.value })}
                    placeholder="Describe the goal"
                    className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                  />
                )}
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">If not interested</label>
                <select
                  value={agent.outboundNotInterested}
                  onChange={(e) => onChange({ outboundNotInterested: e.target.value as Agent["outboundNotInterested"] })}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                >
                  <option value="thank_end">Thank and end politely</option>
                  <option value="callback">Offer to call back later</option>
                  <option value="ask_help">Ask what would be helpful</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Voicemail behavior</label>
                <select
                  value={agent.voicemailBehavior}
                  onChange={(e) => onChange({ voicemailBehavior: e.target.value as Agent["voicemailBehavior"] })}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                >
                  <option value="leave">Leave a message</option>
                  <option value="hangup">Hang up and try again later</option>
                  <option value="sms">Send SMS instead</option>
                </select>
                {agent.voicemailBehavior === "leave" && (
                  <textarea
                    rows={2}
                    value={agent.voicemailMessage}
                    onChange={(e) => onChange({ voicemailMessage: e.target.value })}
                    placeholder="Hi {name}, this is {business}..."
                    className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)] resize-none"
                  />
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
            className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-inset"
            aria-expanded={openAdvanced.inbound}
          >
            Inbound call settings
            <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${openAdvanced.inbound ? "rotate-180" : ""}`} />
          </button>
          {openAdvanced.inbound && (
            <div className="border-t border-[var(--border-default)] p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Confused caller handling</label>
                <input
                  type="text"
                  value={agent.confusedCallerHandling}
                  onChange={(e) => onChange({ confusedCallerHandling: e.target.value })}
                  placeholder="I'm sorry, let me try to help. Could you tell me what you need?"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-medium)] focus:outline-none focus:ring-1 focus:ring-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Off-topic handling</label>
                <textarea
                  rows={2}
                  value={agent.offTopicHandling}
                  onChange={(e) => onChange({ offTopicHandling: e.target.value })}
                  placeholder="I'm the phone assistant for {business}. I can help with..."
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

function IdentityStepContent({
  agent,
  onChange,
  onNext,
}: {
  agent: Agent;
  onChange: (p: Partial<Agent>) => void;
  onNext: () => void;
}) {
  const [websiteUrl, setWebsiteUrl] = useState(agent.websiteUrl ?? "");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pendingExtract, setPendingExtract] = useState<{
    businessName: string;
    industry?: string;
    services?: string[];
    location?: string;
    targetAudience?: string;
    faq?: Array<{ question: string; answer: string }>;
  } | null>(null);

  useEffect(() => {
    setWebsiteUrl(agent.websiteUrl ?? "");
  }, [agent.websiteUrl]);

  const applyExtractedDetails = (data: {
    businessName: string;
    industry?: string;
    services?: string[];
    location?: string;
    targetAudience?: string;
    faq?: Array<{ question: string; answer: string }>;
  }) => {
    const services = Array.isArray(data.services)
      ? data.services.map((s) => String(s ?? "").trim()).filter(Boolean)
      : [];
    const faqSource = Array.isArray(data.faq) ? data.faq : [];
    const existingFaq = Array.isArray(agent.faq) ? agent.faq : [];
    const newFaq = faqSource
      .map((entry, index) => {
        const question = String(entry?.question ?? "").trim();
        const answer = String(entry?.answer ?? "").trim();
        if (!question || !answer) return null;
        return {
          id: generateAgentId(`faq-${index}`),
          question,
          answer,
        };
      })
      .filter((e): e is { id: string; question: string; answer: string } => !!e);

    const contextParts: string[] = [];
    if (data.industry?.trim()) contextParts.push(data.industry.trim());
    if (services.length) contextParts.push(services.join(", "));
    if (data.location?.trim()) contextParts.push(data.location.trim());
    const businessContext =
      contextParts.join(" · ") ||
      agent.businessContext ||
      "Describe what you do and who you serve so your AI can represent you accurately.";

    onChange({
      name: (agent.name ?? "").trim() ? agent.name : data.businessName || agent.name,
      businessContext,
      targetAudience:
        (agent.targetAudience ?? "").trim() ||
        (data.targetAudience ?? "").trim() ||
        agent.targetAudience,
      websiteUrl: websiteUrl.trim(),
      services: services.length ? services : agent.services,
      faq: newFaq.length ? [...existingFaq, ...newFaq] : existingFaq,
    });
  };

  const handleWebsiteExtract = async () => {
    const url = websiteUrl.trim();
    if (!url || extracting) return;
    setExtractError(null);
    setPendingExtract(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/agent/extract-business", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        businessName?: string;
        industry?: string;
        services?: string[];
        location?: string;
        targetAudience?: string;
        faq?: Array<{ question: string; answer: string }>;
      };
      if (!res.ok || data.error) {
        setExtractError(
          data.error ||
            "We couldn't read that website. Check the URL and try again.",
        );
        return;
      }
      if (!data.businessName && !data.industry && !data.services?.length) {
        setExtractError(
          "We couldn't find clear business details on that page. You can still fill them in manually.",
        );
        return;
      }
      setPendingExtract({
        businessName: String(data.businessName ?? "").trim(),
        industry: data.industry,
        services: data.services,
        location: data.location,
        targetAudience: data.targetAudience,
        faq: data.faq,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong while reading that site.";
      setExtractError(message);
    } finally {
      setExtracting(false);
    }
  };

  const purpose = agent.purpose ?? "both";
  const nameValid = (agent.name ?? "").trim().length > 0;
  const greetingValid = (agent.greeting ?? "").trim().length > 0;
  const canContinue = nameValid && greetingValid;
  const [triedContinue, setTriedContinue] = useState(false);
  const showNameError = triedContinue && !nameValid;
  const showGreetingError = triedContinue && !greetingValid;

  const TEMPLATES = [
    {
      id: "receptionist" as const,
      label: "Receptionist",
      desc: "Answer calls, take messages, and route cleanly.",
      defaults: {
        purpose: "inbound" as AgentPurpose,
        primaryGoal: "answer_route" as PrimaryGoalId,
        greeting:
          "Thanks for calling. I can help with questions, take messages, and get you to the right place. How can I help today?",
      },
    },
    {
      id: "appointment_setter" as const,
      label: "Appointment Booker",
      desc: "Book appointments and confirm details.",
      defaults: {
        purpose: "inbound" as AgentPurpose,
        primaryGoal: "book_appointments" as PrimaryGoalId,
        greeting:
          "Hi, I can help you schedule an appointment right now. What day works best for you?",
      },
    },
    {
      id: "lead_qualifier" as const,
      label: "Lead Qualifier",
      desc: "Qualify leads, then route hot prospects.",
      defaults: {
        purpose: "inbound" as AgentPurpose,
        primaryGoal: "qualify_leads" as PrimaryGoalId,
        greeting:
          "Thanks for reaching out. I’ll ask a few quick questions so we can get you to the right next step.",
      },
    },
    {
      id: "follow_up" as const,
      label: "Follow-up Caller",
      desc: "Call back leads and re-engage.",
      defaults: {
        purpose: "outbound" as AgentPurpose,
        primaryGoal: "follow_up" as PrimaryGoalId,
        greeting:
          "Hi, this is your AI assistant following up so nothing falls through the cracks. Is now a good time?",
      },
    },
    {
      id: "support" as const,
      label: "Customer Support",
      desc: "Answer questions, troubleshoot, resolve issues",
      defaults: {
        purpose: "inbound" as AgentPurpose,
        primaryGoal: "support" as PrimaryGoalId,
        greeting: "Thanks for calling support! What can I help you with?",
      },
    },
    {
      id: "scratch" as const,
      label: "Custom",
      desc: "Build from scratch with full control",
      defaults: {},
    },
  ];

  const PLAYBOOK_ICONS: Record<string, LucideIcon> = {
    receptionist: PhoneCall,
    appointment_setter: Calendar,
    lead_qualifier: UserCheck,
    follow_up: PhoneOutgoing,
    support: Headphones,
    scratch: Settings,
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    if ("purpose" in tpl.defaults && tpl.defaults.purpose != null) {
      onChange({
        template: tpl.id,
        purpose: tpl.defaults.purpose,
        primaryGoal: (tpl.defaults as { primaryGoal?: PrimaryGoalId }).primaryGoal ?? "answer_route",
        greeting: (agent.greeting ?? "").trim() ? agent.greeting : ((tpl.defaults as { greeting?: string }).greeting ?? ""),
      });
    } else {
      onChange({ template: tpl.id });
    }
  };

  return (
    <div className="space-y-6">
      <h3
        id="identity-heading"
        className="text-sm font-semibold text-white"
      >
        What does this agent do?
      </h3>
      <section
        aria-label="Playbook templates"
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3"
      >
        <div>
          <p className="text-sm font-medium text-white/70">
            Start with a playbook
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Pick a starting mission. You can still edit details below.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => {
            const active = agent.template === tpl.id;
            const Icon = PLAYBOOK_ICONS[tpl.id] ?? PhoneCall;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={`text-left rounded-xl border p-4 transition-all hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  active
                    ? "border-zinc-500/50 bg-zinc-800/50"
                    : "border-white/[0.08]"
                }`}
                aria-pressed={active}
              >
                <Icon className="w-5 h-5 text-white/50 mb-2" />
                <p className="font-medium text-sm text-white">
                  {tpl.label}
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  {tpl.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>
      <div className="mb-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <p className="text-sm text-white/60 mb-2">
          Have a website? We&apos;ll auto-fill your business details.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            placeholder="https://yourbusiness.com"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value);
              onChange({ websiteUrl: e.target.value });
            }}
            className="flex-1 bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleWebsiteExtract}
            disabled={extracting || !websiteUrl.trim()}
            className="px-4 py-2 bg-white text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-30 whitespace-nowrap"
          >
            {extracting ? "Extracting..." : "Extract"}
          </button>
        </div>
        {extractError && (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {extractError}
          </p>
        )}
        {pendingExtract && (
          <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/80">
            <p className="text-xs text-white/40 mb-1">
              We found:
            </p>
            <p className="text-sm mb-2">
              <span className="font-medium">
                {pendingExtract.businessName || "Unnamed business"}
              </span>
              {pendingExtract.industry && ` — ${pendingExtract.industry}`}
              {Array.isArray(pendingExtract.services) &&
                pendingExtract.services.length > 0 && (
                  <> — {pendingExtract.services.join(", ")}</>
                )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  applyExtractedDetails(pendingExtract);
                  setPendingExtract(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white text-xs font-semibold text-gray-900 hover:bg-zinc-100"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  applyExtractedDetails(pendingExtract);
                  setPendingExtract(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-white/[0.12] text-xs text-white/80 hover:bg-white/[0.04]"
              >
                Edit details below
              </button>
            </div>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="agent-name" className="block text-xs text-zinc-500 mb-1.5">Agent name</label>
        <input
          id="agent-name"
          type="text"
          value={agent.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Receptionist"
          aria-describedby={showNameError ? "agent-name-error" : "agent-name-hint"}
          aria-invalid={showNameError}
          className={`w-full bg-[var(--bg-card)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black border ${showNameError ? "border-red-500/60" : "border-[var(--border-default)]"}`}
        />
        {showNameError ? (
          <p id="agent-name-error" className="mt-1 text-[11px] text-[var(--accent-red)]" role="alert">Enter an agent name.</p>
        ) : (
          <p id="agent-name-hint" className="mt-1 text-[11px] text-[var(--text-tertiary)]">This is just for your reference — callers won&apos;t hear it.</p>
        )}
      </div>
      <div role="group" aria-labelledby="agent-purpose-label">
        <span id="agent-purpose-label" className="block text-xs text-zinc-500 mb-2">What does this agent do?</span>
        <div className="grid grid-cols-3 gap-2">
          {(["inbound", "outbound", "both"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ purpose: p })}
              aria-pressed={purpose === p}
              className={`rounded-xl border p-3 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                purpose === p
                  ? "border-white bg-[var(--bg-hover)] text-white"
                  : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
              }`}
            >
              {p === "inbound" && "Answer calls — Inbound only"}
              {p === "outbound" && "Make calls — Outbound only"}
              {p === "both" && "Both — Inbound + outbound"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
          Outbound agents are used when you click &ldquo;Have AI call this lead&rdquo; on Leads and when you run outbound campaigns. Set to Outbound or Both so this agent can make calls.
        </p>
      </div>
      <div role="group" aria-labelledby="primary-goal-label">
        <span id="primary-goal-label" className="block text-xs text-zinc-500 mb-2">Primary goal</span>
        <select
          value={agent.primaryGoal}
          onChange={(e) => onChange({ primaryGoal: e.target.value as PrimaryGoalId })}
          aria-label="Primary goal"
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        >
          <option value="answer_route">Answer questions and route callers</option>
          <option value="book_appointments">Book appointments for my business</option>
          <option value="qualify_leads">Qualify leads before human follow-up</option>
          <option value="support">Handle customer support requests</option>
          <option value="sales">Make sales or pitch calls</option>
          <option value="follow_up">Follow up with existing contacts</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div>
        <label htmlFor="agent-business-context" className="block text-xs text-zinc-500 mb-1.5">Business context</label>
        <textarea
          id="agent-business-context"
          value={agent.businessContext}
          onChange={(e) => onChange({ businessContext: e.target.value })}
          placeholder="What you do, who you serve (so the AI can represent you accurately)"
          rows={2}
          className="w-full bg-[var(--bg-card)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 border border-[var(--border-default)] resize-none"
        />
      </div>
      <div>
        <label htmlFor="agent-target-audience" className="block text-xs text-zinc-500 mb-1.5">Target audience</label>
        <input
          id="agent-target-audience"
          type="text"
          value={agent.targetAudience}
          onChange={(e) => onChange({ targetAudience: e.target.value })}
          placeholder="e.g. homeowners needing plumbing, small business owners, patients calling a dental office"
          className="w-full bg-[var(--bg-card)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 border border-[var(--border-default)]"
        />
      </div>
      <div>
        <label htmlFor="agent-greeting" className="block text-xs text-white/40 mb-1">
          Opening greeting
        </label>
        <p className="text-xs text-white/30 mb-2">
          What your AI says when it answers a call.
        </p>
        <textarea
          id="agent-greeting"
          value={agent.greeting}
          onChange={(e) => onChange({ greeting: e.target.value })}
          placeholder="Thanks for calling! How can I help you today?"
          rows={2}
          aria-describedby={showGreetingError ? "agent-greeting-error" : "agent-greeting-hint"}
          aria-invalid={showGreetingError}
          className={`w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-zinc-500 focus:outline-none resize-none ${
            showGreetingError ? "border-red-500/60" : ""
          }`}
        />
        <div className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-zinc-700/60">
          <p className="text-xs text-zinc-400 mb-0.5">Your caller will hear:</p>
          <p className="text-sm text-white/80">
            {agent.greeting?.trim() || "Thanks for calling! How can I help you today?"}
          </p>
        </div>
        {showGreetingError ? (
          <p
            id="agent-greeting-error"
            className="mt-1 text-[11px] text-[var(--accent-red)]"
            role="alert"
          >
            Enter an opening greeting.
          </p>
        ) : (
          <p
            id="agent-greeting-hint"
            className="mt-1 text-[11px] text-[var(--text-tertiary)]"
          >
            This is the first thing callers hear.
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { if (canContinue) onNext(); else setTriedContinue(true); }}
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Continue to Voice"
        >
          Continue
        </button>
      </div>
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
  voices: CuratedVoice[];
  onChange: (p: Partial<Agent>) => void;
  onVoicePreview: (voiceId: string) => void;
  previewingVoiceId: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-white">How should your agent sound?</h3>
      <ProfileTab agent={agent} voices={voices} workspaceName={workspaceName} onChange={onChange} onVoicePreview={onVoicePreview} previewingVoiceId={previewingVoiceId} />
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label="Back to Identity" className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          Back
        </button>
        <button type="button" onClick={onNext} aria-label="Continue to Knowledge" className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          Continue
        </button>
      </div>
    </div>
  );
}

function KnowledgeStepContent({
  agent,
  onChange,
  onBack,
  onNext,
}: {
  agent: Agent;
  onChange: (p: Partial<Agent>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [seeding, setSeeding] = useState(false);
  const seedFive = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/agent/seed-knowledge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id }),
      });
      if (res.ok) {
        const data = (await res.json()) as { knowledge_base?: { faq?: Array<{ q?: string; a?: string }> } };
        const faq = data.knowledge_base?.faq ?? [];
        onChange({ faq: faq.map((item, i) => ({ id: `seed-${i}`, question: item.q ?? "", answer: item.a ?? "" })) });
      }
    } finally {
      setSeeding(false);
    }
  };
  return (
    <div className="space-y-6">
      <h3 id="knowledge-heading" className="text-sm font-semibold text-white">What does your agent know?</h3>
      <section aria-labelledby="knowledge-quick-label" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <p id="knowledge-quick-label" className="text-xs text-[var(--text-secondary)] mb-2">Quick start: Add 5 common Q&As for your business (hours, location, booking, services, pricing).</p>
        <button type="button" onClick={seedFive} disabled={seeding} aria-busy={seeding} aria-label={seeding ? "Adding default Q&As" : "Add 5 default Q&As now"} className="rounded-xl bg-[var(--bg-hover)] border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--bg-hover)] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          {seeding ? "Adding…" : "Add them now"}
        </button>
      </section>
      <KnowledgeTab agent={agent} onChange={onChange} />
      {(agent.faq?.length ?? 0) === 0 && (
        <p className="text-[11px] text-amber-500/90">Add at least one Q&A for better results. You can also continue and add knowledge later.</p>
      )}
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label="Back to Voice" className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Back</button>
        <button type="button" onClick={onNext} aria-label="Continue to Behavior" className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Continue</button>
      </div>
    </div>
  );
}

function BehaviorStepContent({
  agent,
  onChange,
  onBack,
  onNext,
}: {
  agent: Agent;
  onChange: (p: Partial<Agent>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const NEVER_DO_PRESETS = [
    "Never discuss pricing or give quotes",
    "Never schedule outside business hours",
    "Never make promises about delivery dates",
    "Never discuss competitors",
    "Never share internal information",
  ];

  const neverDo = Array.isArray(agent.neverSay) ? agent.neverSay : [];

  const addNeverDo = (rule: string) => {
    if (!rule.trim() || neverDo.includes(rule)) return;
    onChange({ neverSay: [...neverDo, rule] });
  };

  const removeNeverDo = (rule: string) => {
    onChange({ neverSay: neverDo.filter((r) => r !== rule) });
  };

  const qualificationQuestions = Array.isArray(agent.qualificationQuestions)
    ? agent.qualificationQuestions
    : [];

  const updateQuestion = (index: number, value: string) => {
    const next = [...qualificationQuestions];
    next[index] = value;
    onChange({
      qualificationQuestions: next
        .map((q) => q.trim())
        .filter((q, i) => q || i === index),
    });
  };

  const removeQuestion = (index: number) => {
    const next = qualificationQuestions.filter((_, i) => i !== index);
    onChange({ qualificationQuestions: next });
  };

  const addQuestion = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onChange({ qualificationQuestions: [...qualificationQuestions, trimmed] });
  };

  const objections = agent.objectionHandling ?? {};

  const setObjection = (
    id: "price" | "timing" | "competitor" | "notInterested",
    value: string,
  ) => {
    onChange({
      objectionHandling: {
        ...objections,
        [id]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h3 id="behavior-heading" className="text-sm font-semibold text-white">How should your agent behave?</h3>
      <section
        aria-label="Guardrails"
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3"
      >
        <div>
          <p className="text-xs font-semibold text-white/80">
            What should your AI never do?
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Set clear boundaries so calls stay on-brand and in-bounds.
          </p>
        </div>
        <div className="space-y-1.5">
          {NEVER_DO_PRESETS.map((rule) => (
            <label
              key={rule}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-white"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-[var(--border-default)] bg-[var(--bg-input)]"
                checked={neverDo.includes(rule)}
                onChange={(e) =>
                  e.target.checked ? addNeverDo(rule) : removeNeverDo(rule)
                }
              />
              <span>{rule}</span>
            </label>
          ))}
        </div>
        <div className="pt-2">
          <label
            htmlFor="custom-never-do"
            className="block text-[11px] text-[var(--text-tertiary)] mb-1"
          >
            Add custom rule
          </label>
          <input
            id="custom-never-do"
            type="text"
            placeholder="Add custom rule… (press Enter)"
            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = e.currentTarget.value.trim();
                if (value) {
                  addNeverDo(value);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      </section>
      <RulesTab agent={agent} onChange={onChange} />
      <section className="mt-4">
        <h3 className="text-sm font-medium text-white/70 mb-1">
          Qualification questions
        </h3>
        <p className="text-xs text-white/40 mb-3">
          Questions your AI asks to qualify leads. Drag to reorder priority.
        </p>

        {(qualificationQuestions || []).map((q, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/20 w-5">{i + 1}.</span>
            <input
              value={q}
              onChange={(e) => updateQuestion(i, e.target.value)}
              className="flex-1 bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeQuestion(i)}
              className="text-xs text-white/20 hover:text-red-400 p-1"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => addQuestion("")}
          className="mt-2 text-xs text-white/40 hover:text-white/60"
        >
          + Add question
        </button>

        {qualificationQuestions.length === 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {[
              "What are you looking for?",
              "What is your budget range?",
              "When do you need this done?",
              "How did you hear about us?",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addQuestion(preset)}
                className="text-xs px-3 py-1.5 border border-white/[0.08] rounded-lg text-white/40 hover:bg-white/[0.04]"
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="mt-6">
        <h3 className="text-sm font-medium text-white/70 mb-1">
          Objection handling
        </h3>
        <p className="text-xs text-white/40 mb-3">
          How your AI responds to common pushback.
        </p>

        <div className="space-y-3">
          {[
            {
              id: "price" as const,
              label: "Price objection",
              placeholder:
                "I understand budget is important. Our clients typically see ROI within the first month...",
            },
            {
              id: "timing" as const,
              label: '"Not the right time"',
              placeholder:
                "I completely understand. Would it help if I followed up in a week or two?",
            },
            {
              id: "competitor" as const,
              label: "Comparing competitors",
              placeholder:
                "That's a smart approach. What specifically are you comparing? I can highlight where we differ.",
            },
            {
              id: "notInterested" as const,
              label: '"Not interested"',
              placeholder:
                "No problem at all. Can I ask what would need to change for this to be useful?",
            },
          ].map((obj) => (
            <div key={obj.id}>
              <label className="text-xs text-white/50 mb-1 block">
                {obj.label}
              </label>
              <textarea
                value={(objections as Record<string, string | undefined>)[obj.id] ?? ""}
                onChange={(e) => setObjection(obj.id, e.target.value)}
                rows={2}
                placeholder={obj.placeholder}
                className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-zinc-500 focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <h3 className="text-sm font-medium text-white/70 mb-1">
          Escalation &amp; transfer
        </h3>
        <p className="text-xs text-white/40 mb-3">
          When should your AI hand off to a human?
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Transfer to this number when escalating
            </label>
            <input
              value={agent.transferPhone || ""}
              onChange={(e) => onChange({ transferPhone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Transfer when the caller...
            </label>
            <div className="space-y-1.5">
              {[
                "Asks to speak to a manager",
                "Gets angry or frustrated",
                "Has a complex legal or medical question",
                "Explicitly requests a human",
                "Mentions an emergency",
              ].map((trigger) => (
                <label
                  key={trigger}
                  className="flex items-center gap-2 text-sm text-white/50 cursor-pointer hover:text-white/70"
                >
                  <input
                    type="checkbox"
                    className="rounded border-white/20 bg-transparent"
                    checked={(agent.escalationTriggers || []).includes(trigger)}
                    onChange={(e) => {
                      const current = agent.escalationTriggers || [];
                      const updated = e.target.checked
                        ? [...current, trigger]
                        : current.filter((t) => t !== trigger);
                      onChange({ escalationTriggers: updated });
                    }}
                  />
                  {trigger}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label="Back to Knowledge" className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Back</button>
        <button type="button" onClick={onNext} aria-label="Continue to Test" className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Continue</button>
      </div>
    </div>
  );
}

function TestStepContent({
  agent,
  workspaceName,
  onBack,
  onNext,
}: {
  agent: Agent;
  workspaceName?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const [showGoLiveCta, setShowGoLiveCta] = useState(false);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-white">Talk to your AI</h3>
      <p className="text-xs text-[var(--text-secondary)]">Chat with your agent to see how it responds. It uses your actual greeting, knowledge, and behavior rules.</p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <AgentTestPanel
            agent={{ id: agent.id, name: agent.name, greeting: agent.greeting }}
            workspace={{ name: workspaceName ?? undefined }}
            onTested={() => setShowGoLiveCta(true)}
          />
        </div>
        <div className="shrink-0 self-start">
          <button
            type="button"
            onClick={async () => {
              try {
                const url = `${window.location.origin}/test/${agent.id}`;
                await navigator.clipboard.writeText(url);
                // use lightweight inline toast pattern from this page
                window.dispatchEvent(
                  new CustomEvent("agents:test-link-copied", { detail: { url } }),
                );
              } catch {
                // no-op; clipboard may be blocked
              }
            }}
            className="text-xs text-white/40 hover:text-white/60 border border-white/[0.08] rounded-lg px-3 py-1.5"
          >
            Copy test link
          </button>
        </div>
      </div>
      {showGoLiveCta && (
        <>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">Your agent responded well.</p>
            {(() => {
              const r = getAgentReadiness(agent);
              const tips = r.recommendations.slice(0, 2);
              if (tips.length === 0) return null;
              return (
                <p className="text-xs text-[var(--text-secondary)]">
                  To improve readiness: {tips.join(". ")}
                </p>
              );
            })()}
          </div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-primary)]">Ready to go live?</p>
            <button type="button" onClick={() => { onNext(); setShowGoLiveCta(false); }} className="text-sm font-medium text-white hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded">
              Continue
            </button>
          </div>
        </>
      )}
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label="Back to Behavior" className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Back</button>
        <button type="button" onClick={onNext} aria-label="Continue to Go live" className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Continue</button>
      </div>
    </div>
  );
}

function GoLiveStepContent({
  agent,
  voices,
  getReadiness,
  onBack,
  onActivate,
  activating,
}: {
  agent: Agent;
  voices: CuratedVoice[];
  getReadiness: (a: Agent) => AgentReadiness;
  onBack: () => void;
  onActivate: () => void | Promise<void>;
  activating: boolean;
}) {
  const r = getReadiness(agent);
  const _voiceName = agent.voice?.trim() ? (voices.find((v) => v.id === agent.voice)?.name ?? agent.voice) : null;
  const canActivate =
    !!(agent.name?.trim() && agent.greeting?.trim()) &&
    !!agent.voice?.trim() &&
    (agent.faq?.length ?? 0) >= 3;
  const allowActivate = canActivate && r.percent >= 40;
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-white">Go live</h3>
      <div>
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">Readiness: {r.percent}%</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
          <div
            className="h-full rounded-full bg-white/20 transition-[width] duration-300"
            style={{ width: `${r.percent}%` }}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Readiness checklist</p>
        <ul className="space-y-2 text-xs text-[var(--text-secondary)]" role="list">
          {r.tasks.map((t) => (
            <li key={t.label} className="flex items-center gap-2">
              {t.complete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-white/30 text-white/30" aria-hidden />
              )}
              <span className={t.complete ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>{t.label}</span>
              {t.label === "Voice assistant created" && !agent.vapiAgentId && allowActivate && (
                <button
                  type="button"
                  onClick={() => void onActivate()}
                  disabled={activating}
                  className="text-[11px] font-medium text-[var(--text-primary)] hover:text-white underline underline-offset-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded disabled:opacity-50 ml-auto"
                >
                  {activating ? "Syncing…" : "Retry sync"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <section className="rounded-2xl border border-[var(--border-default)] bg-white/[0.02] p-5 space-y-4" aria-label="Preview how your AI will respond">
        <h3 className="text-sm font-medium text-white/70 mb-4">Preview — how your AI will respond</h3>
        <div className="space-y-4">
          {/* 1. Booking scenario */}
          <div>
            <p className="text-xs text-white/40 mb-1">
              Caller wants to book an appointment
            </p>
            <p className="text-sm text-white/70 bg-blue-500/[0.06] border border-blue-500/[0.1] rounded-lg p-3">
              {(() => {
                const greeting = agent.greeting?.trim();
                if (greeting) {
                  const sliceLen = agent.primaryGoal === "book_appointments" ? 140 : 110;
                  return (
                    greeting.slice(0, sliceLen) +
                    (greeting.length > sliceLen ? "…" : "")
                  );
                }
                if (agent.bookingEnabled !== false) {
                  return "Your agent will greet the caller, confirm what they need, and offer to book a time on your calendar.";
                }
                return "Your agent will greet the caller, gather details, and take a clear message for your team to schedule.";
              })()}
            </p>
          </div>

          {/* 2. Pricing question */}
          <div>
            <p className="text-xs text-white/40 mb-1">Caller asks about pricing</p>
            <p className="text-sm text-white/70 bg-blue-500/[0.06] border border-blue-500/[0.1] rounded-lg p-3">
              {(() => {
                const faq = agent.faq ?? [];
                const pricingFromFaq = faq.find((e) => {
                  const q = (e.question ?? "").toLowerCase();
                  const a = (e.answer ?? "").toLowerCase();
                  return q.includes("price") || q.includes("pricing") || a.includes("price");
                });
                if (pricingFromFaq?.answer?.trim()) {
                  const ans = pricingFromFaq.answer.trim();
                  return ans.slice(0, 110) + (ans.length > 110 ? "…" : "");
                }
                const never = (agent.neverSay ?? []).some((r) =>
                  r.toLowerCase().includes("pricing") || r.toLowerCase().includes("quote"),
                );
                if (never) {
                  return "Your agent will not give exact pricing (per your rules). It will explain that a human will follow up with a quote and capture contact details.";
                }
                if (agent.pricingEnabled && (agent.priceList ?? "").trim()) {
                  return "Your agent will share your saved pricing overview and then guide the caller toward booking or a follow-up.";
                }
                return "Your agent will explain that pricing depends on the situation, offer a rough range if appropriate, and collect details so your team can send a precise quote.";
              })()}
            </p>
          </div>

          {/* 3. After-hours behavior */}
          <div>
            <p className="text-xs text-white/40 mb-1">Caller reaches you after hours</p>
            <p className="text-sm text-white/70 bg-blue-500/[0.06] border border-blue-500/[0.1] rounded-lg p-3">
              {(() => {
                switch (agent.afterHoursMode) {
                  case "forward":
                    return "Your agent will explain that the office is closed and forward urgent calls to your transfer number, or take a message when forwarding isn’t appropriate.";
                  case "messages":
                    return "Your agent will let the caller know you’re closed, capture their name, number, and reason for calling, and confirm that someone will follow up.";
                  case "emergency":
                    return "Your agent will quickly check if it’s an emergency and, if so, transfer to your emergency contact. Otherwise it will take a detailed message.";
                  case "closed":
                    return "Your agent will state that the office is closed right now, share basic hours if known, and invite the caller to leave a message.";
                  default:
                    return "Your agent will check basic details, let the caller know your team is currently unavailable, and take a message for follow-up.";
                }
              })()}
            </p>
          </div>

          {/* 4. Pricing objection */}
          {(() => {
            const priceObj = agent.objectionHandling?.price?.trim();
            if (!priceObj) return null;
            return (
              <div>
                <p className="text-xs text-white/40 mb-1">
                  Caller says the price feels too high
                </p>
                <p className="text-sm text-white/70 bg-blue-500/[0.06] border border-blue-500/[0.1] rounded-lg p-3">
                  {priceObj.slice(0, 160) + (priceObj.length > 160 ? "…" : "")}
                </p>
              </div>
            );
          })()}

          {/* 5. Escalation / speak to human */}
          {(() => {
            const hasEscalationTriggers =
              Array.isArray(agent.escalationTriggers) &&
              agent.escalationTriggers.length > 0;
            const hasTransferNumber = (agent.transferPhone ?? "").trim().length > 0;
            if (!hasEscalationTriggers && !hasTransferNumber) return null;
            return (
              <div>
                <p className="text-xs text-white/40 mb-1">
                  Caller asks to speak to someone else
                </p>
                <p className="text-sm text-white/70 bg-blue-500/[0.06] border border-blue-500/[0.1] rounded-lg p-3">
                  {hasTransferNumber
                    ? "Your agent will stay calm, confirm why they’d like a human, and then transfer to your saved number when your escalation rules match."
                    : "Your agent will stay calm, explain what it can help with, and if needed, take a message with the caller’s details for a human to follow up."}
                </p>
              </div>
            );
          })()}
        </div>
      </section>
      <p className="text-xs text-white/40">Connect your phone number or activate for test calls and outbound only.</p>
      <div className="grid gap-3 sm:grid-cols-2" role="list">
        <Link
          href="/app/settings/phone"
          aria-label="Forward your existing number. Set up call forwarding to your AI."
          className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">Forward your existing number</span>
          <span className="mt-1 text-xs text-[var(--text-secondary)]">Keep your current number. Forward calls to your AI.</span>
          <span className="mt-3 text-xs font-medium text-[var(--text-secondary)]">Set up forwarding</span>
        </Link>
        <Link
          href="/app/settings/phone"
          aria-label="Get a new phone number. We'll assign you a local number instantly."
          className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">Get a new number</span>
          <span className="mt-1 text-xs text-[var(--text-secondary)]">We&apos;ll assign you a local number instantly.</span>
          <span className="mt-3 text-xs font-medium text-[var(--text-secondary)]">Get number</span>
        </Link>
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-white/[0.01] p-4">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Or activate without a phone number</p>
        <p className="mt-1 text-[11px] text-white/40">Your AI will be available for test calls and outbound campaigns only.</p>
      </div>
      {!allowActivate && r.percent < 40 && (
        <p className="text-[11px] text-amber-500/90">Complete the required items above to activate (at least 40% readiness).</p>
      )}
      {!allowActivate && r.percent >= 40 && !canActivate && (
        <p className="text-[11px] text-amber-500/90">Complete greeting, voice, and at least 3 knowledge entries to activate.</p>
      )}
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label="Back to Test" className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Back</button>
        <button type="button" onClick={() => void onActivate()} disabled={activating || !allowActivate} aria-busy={activating} aria-label={activating ? "Activating agent" : allowActivate ? "Launch my AI" : "Complete required items to activate"} className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          {activating ? "Activating…" : "Launch my AI"}
        </button>
      </div>
    </div>
  );
}
