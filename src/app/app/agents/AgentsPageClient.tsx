"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Mic,
  MoonStar,
  Play,
  PhoneCall,
  PhoneForwarded,
  ShieldAlert,
  Square,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Waveform } from "@/components/Waveform";
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

type CallStyle = "thorough" | "conversational" | "quick";

type AgentTemplateId =
  | "receptionist"
  | "after_hours"
  | "emergency"
  | "lead_qualifier"
  | "follow_up"
  | "review_request"
  | "scratch";

type Agent = {
  id: string;
  name: string;
  template: AgentTemplateId;
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
  afterHoursMode: "messages" | "emergency" | "forward";
  bookingEnabled: boolean;
  pricingEnabled: boolean;
  priceList?: string;
  maxCallDuration: number;
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

type TabId = "profile" | "knowledge" | "rules" | "test";

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

const DEFAULT_FAQ_SEED = [
  {
    question: "What are your hours?",
    answer:
      "We can help you during our normal business hours, and I can still take details any time.",
  },
  {
    question: "Where are you located?",
    answer:
      "I can share our location details and make sure the right person follows up if you need anything specific.",
  },
  {
    question: "How do I book an appointment?",
    answer: "I can help you book that right now and confirm the next available time.",
  },
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
    neverSay: [],
    alwaysTransfer: [],
    escalationChain: [],
    transferPhone: "",
    transferRules: [],
    afterHoursMode: "messages",
    bookingEnabled: true,
    pricingEnabled: false,
    priceList: "",
    maxCallDuration: 12,
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
    afterHoursMode?: "messages" | "emergency" | "forward";
    bookingEnabled?: boolean;
    pricingEnabled?: boolean;
    priceList?: string;
    maxCallDuration?: number;
    callStyle?: CallStyle;
    voiceSettings?: Partial<Agent["voiceSettings"]>;
  };
  const rules = (row.rules ?? {}) as {
    neverSay?: string[];
    alwaysTransfer?: string[];
    escalationChain?: string[];
    transferPhone?: string;
    transferRules?: Array<{ phrase?: string; phone?: string }>;
  };
  const stats = (row.stats ?? {}) as {
    avgRating?: number;
    totalCalls?: number;
    appointmentsBooked?: number;
  };

  return {
    ...defaultAgent(),
    id: String(row.id ?? generateAgentId("a")),
    name: String(row.name ?? "Receptionist"),
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
    afterHoursMode: knowledgeBase.afterHoursMode ?? "messages",
    bookingEnabled: knowledgeBase.bookingEnabled ?? true,
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
    purpose:
      agent.template === "follow_up" || agent.template === "review_request"
        ? "outbound"
        : "both",
    greeting: agent.greeting,
    knowledge_base: {
      services: agent.services,
      faq: agent.faq.map((item) => ({ q: item.question, a: item.answer })),
      specialInstructions: agent.specialInstructions,
      websiteUrl: agent.websiteUrl,
      afterHoursMode: agent.afterHoursMode,
      bookingEnabled: agent.bookingEnabled,
      pricingEnabled: agent.pricingEnabled,
      priceList: agent.priceList,
      maxCallDuration: agent.maxCallDuration,
      callStyle: agent.callStyle,
      voiceSettings: agent.voiceSettings,
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
    },
    is_active: agent.active,
  };
}

export default function AppAgentsPageClient({
  initialWorkspaceId = "",
  initialAgentsRows = [],
  initialFallbackAgent = null,
}: {
  initialWorkspaceId?: string;
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
  const [tab, setTab] = useState<TabId>("profile");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<
    AgentTemplateCategory | "all"
  >("all");
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
  const isHearPlaying = hearPlaying && playingAgentId === selectedId;

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

  useEffect(() => {
    setTab("profile");
  }, [selectedId]);

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
          voice_id: input.voiceId,
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

  const persistAgent = async (agentToSave: Agent, options?: { showToast?: boolean }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentToSave.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toAgentPatchPayload(agentToSave)),
      });
      if (!res.ok) throw new Error("save_failed");
      const syncRes = await fetch("/api/agent/create-vapi", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentToSave.id }),
      });
      const syncData = (await syncRes.json().catch(() => null)) as
        | { vapi_agent_id?: string; error?: string }
        | null;
      if (!syncRes.ok || !syncData?.vapi_agent_id) {
        throw new Error(syncData?.error || "sync_failed");
      }
      setAgents((current) =>
        current.map((agent) =>
          agent.id === agentToSave.id
            ? { ...agent, vapiAgentId: syncData.vapi_agent_id ?? agent.vapiAgentId }
            : agent,
        ),
      );
      if (options?.showToast !== false) {
        setToast("Agent saved and synced live");
      }
      return syncData.vapi_agent_id;
    } catch {
      if (options?.showToast !== false) {
        setToast("Could not save agent");
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    await persistAgent(selected, { showToast: true });
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/agents/${selected.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete_failed");
      const next = agents.filter((a) => a.id !== selected.id);
      setAgents(next);
      setSelectedId(next[0]?.id ?? null);
      setToast("Agent deleted");
    } catch {
      setToast("Could not delete agent");
    }
  };

  const createAgentFromTemplate = async (template: AgentTemplateId) => {
    if (!workspaceId) return;
    const base = defaultAgent();
    const nameByTemplate: Record<AgentTemplateId, string> = {
      receptionist: "Receptionist",
      after_hours: "After-Hours",
      emergency: "Emergency Line",
      lead_qualifier: "Lead Qualifier",
      follow_up: "Follow-Up",
      review_request: "Review Request",
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
      const assistantId = await persistAgent(persisted, { showToast: false });
      const next = [...agents, { ...persisted, vapiAgentId: assistantId }];
      setAgents(next);
      setSelectedId(persisted.id);
      setTab("profile");
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
      const assistantId = await persistAgent(persisted, { showToast: false });
      const next = [...agents, { ...persisted, vapiAgentId: assistantId }];
      setAgents(next);
      setSelectedId(persisted.id);
      setTab("profile");
      setShowTemplateModal(false);
      setToast("Agent created and synced");
    } catch {
      setToast("Could not create agent");
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6">
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

      {loading && (
        <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
          Loading your agents…
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.7fr)] gap-4 lg:gap-6 items-start">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => {
                setSelectedId(agent.id);
                setTab("profile");
              }}
              className={`text-left p-4 rounded-2xl border bg-zinc-900/50 hover:bg-zinc-900 transition-colors ${
                selected?.id === agent.id ? "border-zinc-500" : "border-zinc-800"
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
                Template:{" "}
                {agent.template === "receptionist"
                  ? "Receptionist"
                  : agent.template === "after_hours"
                    ? "After-Hours"
                    : agent.template === "emergency"
                      ? "Emergency"
                      : agent.template === "lead_qualifier"
                        ? "Lead Qualifier"
                        : agent.template === "follow_up"
                          ? "Follow-Up"
                          : agent.template === "review_request"
                            ? "Review Request"
                            : "Custom"}
              </p>
              <p className="text-[11px] text-zinc-500">
                Voice: {elevenLabsVoices.find((v) => v.id === agent.voice)?.name ?? "Voice"}
              </p>
              <p className="mt-2 text-[11px] text-zinc-500 line-clamp-2">
                {agent.greeting}
              </p>
              <p className="mt-3 text-[11px] text-zinc-600">
                {agent.stats.totalCalls} calls handled
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">{selected.name}</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Configure how this agent answers, books, and follows through.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      void playAudioPreview({
                        key: `agent-${selected.id}`,
                        voiceId: selected.voice,
                        text:
                          selected.greeting.trim() ||
                          "Thanks for calling. How can I help you today?",
                        settings: selected.voiceSettings,
                        agentId: selected.id,
                      })
                    }
                    disabled={!selected.greeting.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
                  >
                    {isHearPlaying ? (
                      <Waveform isPlaying />
                    ) : (
                      <Play className="h-3 w-3 fill-current" />
                    )}
                    {isHearPlaying ? "Stop preview" : "Hear This Agent"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mb-4 border-b border-zinc-800 text-xs">
                {[
                  { id: "profile" as TabId, label: "Profile" },
                  { id: "knowledge" as TabId, label: "Knowledge" },
                  { id: "rules" as TabId, label: "Rules" },
                  { id: "test" as TabId, label: "Test" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    role="tab"
                    aria-selected={tab === id}
                    className={`px-3 py-2 border-b-2 -mb-px ${
                      tab === id ? "border-white text-white" : "border-transparent text-zinc-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "profile" && (
                <ProfileTab
                  agent={selected}
                  voices={elevenLabsVoices}
                  onChange={updateSelected}
                  onVoicePreview={(voiceId) =>
                    void playAudioPreview({
                      key: voiceId,
                      voiceId,
                      text:
                        selected.greeting.trim() ||
                        "Thanks for calling. How can I help you today?",
                      settings: selected.voiceSettings,
                    })
                  }
                  previewingVoiceId={playingVoiceId}
                />
              )}
              {tab === "knowledge" && (
                <KnowledgeTab agent={selected} onChange={updateSelected} />
              )}
              {tab === "rules" && <RulesTab agent={selected} onChange={updateSelected} />}
              {tab === "test" && (
                <TestTab
                  agent={selected}
                  onPrepareAgent={async () => {
                    const assistantId = await persistAgent(selected, { showToast: false });
                    if (assistantId) {
                      setAgents((current) =>
                        current.map((agent) =>
                          agent.id === selected.id
                            ? { ...agent, vapiAgentId: assistantId }
                            : agent,
                        ),
                      );
                    }
                    return assistantId;
                  }}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Select or create an agent to edit how it answers calls.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6">
        <Link
          href="/app/activity"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Activity
        </Link>
      </p>

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 shadow-lg">
          {toast}
        </div>
      )}

      {showTemplateModal && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Create agent</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Start from a proven pattern instead of configuring from scratch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
              <TemplateCard
                title="Receptionist"
                icon={PhoneCall}
                description="Answers every call, captures details, and books when ready."
                onClick={() => createAgentFromTemplate("receptionist")}
              />
              <TemplateCard
                title="After-Hours"
                icon={MoonStar}
                description="Handles calls when the office is closed, forwards true emergencies."
                onClick={() => createAgentFromTemplate("after_hours")}
              />
              <TemplateCard
                title="Emergency"
                icon={ShieldAlert}
                description="Keeps callers calm, routes urgent issues, and records every detail."
                onClick={() => createAgentFromTemplate("emergency")}
              />
              <TemplateCard
                title="Lead Qualifier"
                icon={ClipboardList}
                description="Asks a short set of questions so only qualified leads reach you."
                onClick={() => createAgentFromTemplate("lead_qualifier")}
              />
              <TemplateCard
                title="Follow-Up"
                icon={BellRing}
                description="Calls back enquiries and missed callers so nothing is dropped."
                onClick={() => createAgentFromTemplate("follow_up")}
              />
              <TemplateCard
                title="Review Request"
                icon={Star}
                description="Follows up after visits to collect reviews without pressure."
                onClick={() => createAgentFromTemplate("review_request")}
              />
            </div>
            <button
              type="button"
              onClick={() => createAgentFromTemplate("scratch")}
              className="mt-2 text-xs text-zinc-400 hover:text-white underline underline-offset-2"
            >
              Create from scratch
            </button>
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 mb-2">
                Or pick by communication style (20+ templates)
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setTemplateCategory("all")}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    templateCategory === "all"
                      ? "border-zinc-500 bg-zinc-800 text-white"
                      : "border-zinc-700 text-zinc-400 hover:text-white"
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
                        ? "border-zinc-500 bg-zinc-800 text-white"
                        : "border-zinc-700 text-zinc-400 hover:text-white"
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
                    className="w-full text-left px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600 text-xs transition-colors"
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
      className="text-left p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-600 transition-colors"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-zinc-300">
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
      onClick={onSelect}
      className={`relative cursor-pointer rounded-xl p-3 transition-all ${
        selected
          ? "border-2 border-white bg-white/[0.06] ring-1 ring-white/20"
          : "border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
        title="Preview voice"
      >
        {previewing ? (
          <Square className="h-3 w-3 fill-current text-white/70" />
        ) : (
          <Play className="h-3 w-3 fill-current text-white/50" />
        )}
      </button>
      <p className="text-sm font-medium text-white/90">{voice.name}</p>
      <p className="mt-0.5 text-xs text-white/40">{voice.description}</p>
      <p className="mt-0.5 text-xs text-white/25">{voice.accent}</p>
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

function ProfileTab({
  agent,
  voices,
  onChange,
  onVoicePreview,
  previewingVoiceId,
}: {
  agent: Agent;
  voices: CuratedVoice[];
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
          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
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
        <details className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
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
        <label className="block text-[11px] text-zinc-500">Greeting</label>
        <textarea
          rows={3}
          value={agent.greeting}
          onChange={(e) => onChange({ greeting: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
        />
      </div>

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
                  ? "border-white bg-zinc-900 text-white"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-300"
              }`}
            >
              <p className="font-medium mb-0.5">{label}</p>
              <p className="text-[10px] text-zinc-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
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
    if (agent.faq.length > 0) return;
    onChange({
      faq: DEFAULT_FAQ_SEED.map((item, index) => ({
        id: `seed-${index}`,
        question: item.question,
        answer: item.answer,
      })),
    });
  };

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white/80">Knowledge base</h3>
          <p className="text-xs text-white/40">
            Q&A pairs your agent uses to answer callers clearly and consistently.
          </p>
        </div>
        <button
          type="button"
          onClick={addFaqRow}
          className="text-sm text-white hover:text-zinc-300"
        >
          + Add entry
        </button>
      </div>

      {agent.faq.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-300">No knowledge entries yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Add common questions and short answers so callers get clear next steps.
          </p>
          <button
            type="button"
            onClick={seedDefaults}
            className="mt-4 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-500"
          >
            Add starter entries
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agent.faq.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
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
                className="mt-1 w-full border-b border-white/[0.08] bg-transparent py-1 text-sm text-white/80 focus:outline-none"
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
                className="mt-1 w-full border-b border-white/[0.08] bg-transparent py-1 text-sm text-white/80 focus:outline-none resize-none"
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
          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
          placeholder="Anything the agent should always remember on calls."
        />
      </div>
    </div>
  );
}

function RulesTab({
  agent,
  onChange,
}: {
  agent: Agent;
  onChange: (partial: Partial<Agent>) => void;
}) {
  const addTransferRule = () => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange({
      transferRules: [...agent.transferRules, { id, phrase: "", phone: "" }],
    });
  };

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-2 text-sm font-medium text-white/80">Transfer to a human when...</h3>
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
            className="mt-1 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80 focus:outline-none"
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
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80 focus:outline-none resize-none"
          placeholder="Competitor names, legal advice, pricing specifics..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] text-zinc-500">Phrase-based transfer rules</label>
          <button
            type="button"
            onClick={addTransferRule}
            className="text-[11px] text-zinc-300 underline underline-offset-2"
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
                className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2"
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  placeholder="(503) 555-0199"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-[11px] text-zinc-500">After-hours behavior</label>
        <select
          value={agent.afterHoursMode}
          onChange={(e) => onChange({ afterHoursMode: e.target.value as Agent["afterHoursMode"] })}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80 focus:outline-none"
        >
          <option value="messages">Take a message and notify the owner</option>
          <option value="forward">Offer to schedule a callback</option>
          <option value="emergency">Transfer to the emergency line</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Maximum call duration</label>
        <select
          value={String(agent.maxCallDuration)}
          onChange={(e) => onChange({ maxCallDuration: Number(e.target.value) })}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80 focus:outline-none"
        >
          <option value="5">5 minutes</option>
          <option value="10">10 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
        </select>
      </div>
    </div>
  );
}

function TestTab({
  agent,
  onPrepareAgent,
}: {
  agent: Agent;
  onPrepareAgent: () => Promise<string | null>;
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "active" | "ended">(
    "idle",
  );
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<{
    start: (assistantId: string) => Promise<unknown>;
    stop: () => void;
    on: (event: string, handler: (payload?: unknown) => void) => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      clientRef.current?.stop();
      clientRef.current = null;
    };
  }, []);

  const endCall = () => {
    clientRef.current?.stop();
    clientRef.current = null;
    setStatus("ended");
  };

  const startTestCall = async () => {
    setStatus("connecting");
    setTranscript([]);
    setError(null);

    try {
      const assistantId = (await onPrepareAgent()) || agent.vapiAgentId;
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not configured");
      }
      if (!assistantId) {
        throw new Error("This agent has not been synced to Vapi yet");
      }

      const { default: Vapi } = await import("@vapi-ai/web");
      const client = new Vapi(publicKey) as {
        start: (assistantId: string) => Promise<unknown>;
        stop: () => void;
        on: (event: string, handler: (payload?: unknown) => void) => void;
      };
      clientRef.current = client;

      client.on("call-start", () => setStatus("active"));
      client.on("call-end", () => {
        setStatus("ended");
        clientRef.current = null;
      });
      client.on("message", (payload?: unknown) => {
        const data = payload as
          | {
              role?: string;
              transcript?: string;
              text?: string;
              transcriptType?: string;
              type?: string;
            }
          | undefined;
        const text = data?.transcript ?? data?.text ?? "";
        if (!text || data?.transcriptType === "partial") return;
        const role = data?.role === "assistant" ? "assistant" : "user";
        setTranscript((current) => [...current, { role, text }]);
      });

      await client.start(assistantId);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not start test call");
    }
  };

  return (
    <div className="py-4 text-center">
      {status === "idle" && (
        <div>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.06]">
            <Mic className="h-8 w-8 text-white/70" />
          </div>
          <h3 className="mb-1 text-lg font-medium text-white/90">Test your agent</h3>
          <p className="mx-auto mb-6 max-w-xs text-sm text-white/40">
            Have a real browser conversation with this agent using its current voice,
            greeting, and knowledge.
          </p>
          <button
            type="button"
            onClick={() => void startTestCall()}
            className="rounded-xl bg-white px-6 py-3 font-medium text-black transition-colors hover:bg-zinc-100"
          >
            Start test call
          </button>
        </div>
      )}

      {status === "connecting" && (
        <div>
          <div className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-white/[0.08]">
            <PhoneForwarded className="h-8 w-8 text-white/70" />
          </div>
          <p className="text-sm text-zinc-400">Connecting...</p>
        </div>
      )}

      {(status === "active" || status === "ended") && (
        <div>
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
              status === "active"
                ? "animate-pulse bg-emerald-500/20 text-emerald-300"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {status === "active" ? (
              <Mic className="h-8 w-8" />
            ) : (
              <CheckCircle2 className="h-8 w-8" />
            )}
          </div>
          <p
            className={`mb-4 text-sm font-medium ${
              status === "active" ? "text-emerald-400" : "text-zinc-300"
            }`}
          >
            {status === "active" ? "Call active — speak now" : "Test call complete"}
          </p>
          <div className="mx-auto max-h-56 max-w-md space-y-2 overflow-y-auto text-left">
            {transcript.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  item.role === "assistant"
                    ? "bg-blue-500/10 text-blue-300"
                    : "bg-white/[0.04] text-white/70"
                }`}
              >
                <span className="mr-2 text-xs text-white/30">
                  {item.role === "assistant" ? "Agent" : "You"}
                </span>
                {item.text}
              </div>
            ))}
          </div>
          {status === "active" ? (
            <button
              type="button"
              onClick={endCall}
              className="mt-4 inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
            >
              <Square className="h-3 w-3 fill-current" />
              End call
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setTranscript([]);
              }}
              className="mt-4 text-sm text-white hover:text-zinc-300"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {error ? (
        <p className="mt-4 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
