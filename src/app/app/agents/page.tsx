"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { speakTextViaApi } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { LiveAgentChat } from "@/components/LiveAgentChat";
import { AGENT_TEMPLATES, AGENT_TEMPLATE_CATEGORIES, type AgentTemplateCategory } from "@/lib/data/agent-templates";

type VoiceId =
  | "warm_female"
  | "professional_male"
  | "upbeat_female"
  | "calm_male"
  | "conversational_female"
  | "authoritative_male";

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
  voice: VoiceId;
  greeting: string;
  personality: number;
  callStyle: CallStyle;
  active: boolean;
  callsHandled: number;
  services: string[];
  faq: Array<{ id: string; question: string; answer: string }>;
  specialInstructions: string;
  websiteUrl?: string;
  transferRules: Array<{ id: string; phrase: string; phone: string }>;
  afterHoursMode: "messages" | "emergency" | "forward";
  bookingEnabled: boolean;
  pricingEnabled: boolean;
  priceList?: string;
  maxCallDuration: number;
};

type TabId = "profile" | "knowledge" | "rules" | "test";

const STORAGE_KEY = "rt_agents";

function generateAgentId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const VOICE_OPTIONS: { id: VoiceId; label: string; description: string }[] = [
  { id: "warm_female", label: "Warm F", description: "Calm, friendly, receptionist-style" },
  { id: "professional_male", label: "Professional M", description: "Clear, steady, office tone" },
  { id: "upbeat_female", label: "Upbeat F", description: "Lively, energetic, ideal for follow-up" },
  { id: "calm_male", label: "Calm M", description: "Measured, reassuring, great for emergencies" },
  { id: "conversational_female", label: "Conversational F", description: "Natural, human, everyday calls" },
  { id: "authoritative_male", label: "Authoritative M", description: "Firm, concise, policy-heavy calls" },
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
    voice: "warm_female",
    greeting: templateGreeting("receptionist"),
    personality: 60,
    callStyle: "thorough",
    active: true,
    callsHandled: 0,
    services: [],
    faq: [],
    specialInstructions: "",
    websiteUrl: "",
    transferRules: [],
    afterHoursMode: "messages",
    bookingEnabled: true,
    pricingEnabled: false,
    priceList: "",
    maxCallDuration: 12,
  };
}

function loadAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Agent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAgents(next: Agent[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const initialAgents: Agent[] =
  typeof window === "undefined" ? [] : loadAgents();

export default function AppAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialAgents[0]?.id ?? null,
  );
  const [tab, setTab] = useState<TabId>("profile");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<AgentTemplateCategory | "all">("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const selected = useMemo(
    () => (selectedId ? agents.find((a) => a.id === selectedId) ?? null : null),
    [agents, selectedId],
  );
  const [hearPlaying, setHearPlaying] = useState(false);
  const [playingAgentId, setPlayingAgentId] = useState<string | null>(null);
  const isHearPlaying = hearPlaying && playingAgentId === selectedId;
  const voiceGender = useMemo(() => {
    if (!selected) return "female" as const;
    const maleVoices: VoiceId[] = ["professional_male", "calm_male", "authoritative_male"];
    return maleVoices.includes(selected.voice) ? "male" : "female";
  }, [selected]);

  const [elevenLabsVoices, setElevenLabsVoices] = useState<Array<{ id: string; name: string }>>([]);
  const [previewVoiceId, setPreviewVoiceId] = useState("");
  useEffect(() => {
    fetch("/api/agent/voices")
      .then((r) => r.json())
      .then((data: { voices?: Array<{ id: string; name: string }> }) => setElevenLabsVoices(data.voices ?? []))
      .catch(() => setElevenLabsVoices([]));
  }, []);

  const updateSelected = (partial: Partial<Agent>) => {
    if (!selected) return;
    const next = agents.map((a) => (a.id === selected.id ? { ...a, ...partial } : a));
    setAgents(next);
  };

  const handleSave = () => {
    saveAgents(agents);
    setToast("Agent saved");
  };

  const handleDelete = () => {
    if (!selected) return;
    const remaining = agents.filter((a) => a.id !== selected.id);
    const next = remaining;
    setAgents(next);
    setSelectedId(next[0]?.id ?? null);
    saveAgents(next);
    setToast("Agent deleted");
  };

  const createAgentFromTemplate = (template: AgentTemplateId) => {
    const id = generateAgentId("a");
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
    const voiceByTemplate: Partial<Record<AgentTemplateId, VoiceId>> = {
      emergency: "calm_male",
      after_hours: "professional_male",
      lead_qualifier: "conversational_female",
      follow_up: "upbeat_female",
      review_request: "warm_female",
    };

    const agent: Agent = {
      ...base,
      id,
      template,
      name: nameByTemplate[template],
      voice: voiceByTemplate[template] ?? base.voice,
      greeting: templateGreeting(template),
      callsHandled: 0,
      services: [],
      faq: [],
      transferRules: [],
      specialInstructions: "",
      websiteUrl: "",
      pricingEnabled: template === "review_request" ? false : base.pricingEnabled,
      afterHoursMode: template === "after_hours" ? "forward" : base.afterHoursMode,
    };

    const next = [...agents, agent];
    setAgents(next);
    setSelectedId(agent.id);
    setTab("profile");
    setShowTemplateModal(false);
    saveAgents(next);
    setToast("Agent created");
  };

  const createAgentFromSharedTemplate = (templateId: string) => {
    const t = AGENT_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    const id = generateAgentId("a");
    const base = defaultAgent();
    const name = t.name.replace(/^The\s+/, "") ?? t.name;
    const agent: Agent = {
      ...base,
      id,
      template: "receptionist",
      name,
      greeting: t.defaultGreeting,
      callsHandled: 0,
      services: [],
      faq: [],
      transferRules: [],
      specialInstructions: "",
      websiteUrl: "",
    };
    const next = [...agents, agent];
    setAgents(next);
    setSelectedId(agent.id);
    setTab("profile");
    setShowTemplateModal(false);
    saveAgents(next);
    setToast("Agent created");
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
                Voice: {VOICE_OPTIONS.find((v) => v.id === agent.voice)?.label ?? "Voice"}
              </p>
              <p className="mt-2 text-[11px] text-zinc-500 line-clamp-2">
                {agent.greeting}
              </p>
              <p className="mt-3 text-[11px] text-zinc-600">
                {agent.callsHandled} calls handled
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
                  {elevenLabsVoices.length > 0 && (
                    <select
                      value={previewVoiceId}
                      onChange={(e) => setPreviewVoiceId(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                      aria-label="Preview voice"
                    >
                      <option value="">Default voice</option>
                      {elevenLabsVoices.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPlayingAgentId(selected.id);
                      setHearPlaying(true);
                      void speakTextViaApi(selected.greeting, {
                        voiceId: previewVoiceId || undefined,
                        gender: voiceGender,
                        onStart: () => setHearPlaying(true),
                        onEnd: () => {
                          setHearPlaying(false);
                          setPlayingAgentId(null);
                        },
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
                  >
                    {isHearPlaying ? <Waveform isPlaying /> : <span>▶</span>}
                    Hear This Agent
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
                    className="px-4 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
                  >
                    Save
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
                    className={`px-3 py-2 border-b-2 -mb-px ${
                      tab === id ? "border-white text-white" : "border-transparent text-zinc-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "profile" && (
                <ProfileTab agent={selected} onChange={updateSelected} />
              )}
              {tab === "knowledge" && (
                <KnowledgeTab agent={selected} onChange={updateSelected} />
              )}
              {tab === "rules" && <RulesTab agent={selected} onChange={updateSelected} />}
              {tab === "test" && <TestTab agent={selected} />}
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Select or create an agent to edit how it answers calls.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
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
                title="📞 Receptionist"
                description="Answers every call, captures details, and books when ready."
                onClick={() => createAgentFromTemplate("receptionist")}
              />
              <TemplateCard
                title="🌙 After-Hours"
                description="Handles calls when the office is closed, forwards true emergencies."
                onClick={() => createAgentFromTemplate("after_hours")}
              />
              <TemplateCard
                title="🚨 Emergency"
                description="Keeps callers calm, routes urgent issues, and records every detail."
                onClick={() => createAgentFromTemplate("emergency")}
              />
              <TemplateCard
                title="📋 Lead Qualifier"
                description="Asks a short set of questions so only qualified leads reach you."
                onClick={() => createAgentFromTemplate("lead_qualifier")}
              />
              <TemplateCard
                title="📢 Follow-Up"
                description="Calls back enquiries and missed callers so nothing is dropped."
                onClick={() => createAgentFromTemplate("follow_up")}
              />
              <TemplateCard
                title="⭐ Review Request"
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
              <p className="text-xs font-medium text-zinc-400 mb-2">Or pick by communication style (20+ templates)</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button type="button" onClick={() => setTemplateCategory("all")} className={`rounded-full border px-2.5 py-1 text-[11px] ${templateCategory === "all" ? "border-zinc-500 bg-zinc-800 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"}`}>All</button>
                {AGENT_TEMPLATE_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setTemplateCategory(c.id)} className={`rounded-full border px-2.5 py-1 text-[11px] ${templateCategory === c.id ? "border-zinc-500 bg-zinc-800 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"}`}>{c.label}</button>
                ))}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(templateCategory === "all" ? AGENT_TEMPLATES : AGENT_TEMPLATES.filter((t) => t.category === templateCategory)).map((t) => (
                  <button key={t.id} type="button" onClick={() => createAgentFromSharedTemplate(t.id)} className="w-full text-left px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600 text-xs transition-colors">
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

function TemplateCard(props: { title: string; description: string; onClick: () => void }) {
  const { title, description, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-600 transition-colors"
    >
      <p className="text-sm font-medium text-white mb-1">{title}</p>
      <p className="text-xs text-zinc-500">{description}</p>
    </button>
  );
}

function ProfileTab({ agent, onChange }: { agent: Agent; onChange: (partial: Partial<Agent>) => void }) {
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
          {VOICE_OPTIONS.map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => onChange({ voice: voice.id })}
              className={`text-left p-2 rounded-xl border text-xs ${
                agent.voice === voice.id
                  ? "border-white bg-zinc-900 text-white"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-300"
              }`}
            >
              <p className="font-medium mb-0.5">{voice.label}</p>
              <p className="text-[11px] text-zinc-500">{voice.description}</p>
            </button>
          ))}
        </div>
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
            { id: "thorough" as CallStyle, label: "Thorough", desc: "Covers details, slower pace" },
            { id: "conversational" as CallStyle, label: "Conversational", desc: "Natural, mid-length calls" },
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
        <p className="text-[11px] text-zinc-500">{agent.callsHandled} calls so far</p>
      </div>
    </div>
  );
}

function KnowledgeTab({ agent, onChange }: { agent: Agent; onChange: (partial: Partial<Agent>) => void }) {
  const [serviceInput, setServiceInput] = useState("");

  const addService = () => {
    const v = serviceInput.trim();
    if (!v) return;
    if (!agent.services.includes(v)) {
      onChange({ services: [...agent.services, v] });
    }
    setServiceInput("");
  };

  const addFaqRow = () => {
    const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange({ faq: [...agent.faq, { id, question: "", answer: "" }] });
  };

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Services</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addService();
              }
            }}
            className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            placeholder="e.g., Emergency plumbing, Routine cleaning"
          />
          <button
            type="button"
            onClick={addService}
            className="px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
          >
            Add
          </button>
        </div>
        {agent.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.services.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  onChange({
                    services: agent.services.filter((x) => x !== s),
                  })
                }
                className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200"
              >
                {s} <span className="text-zinc-500">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] text-zinc-500">FAQ</label>
          <button
            type="button"
            onClick={addFaqRow}
            className="text-[11px] text-zinc-300 underline underline-offset-2"
          >
            + Add
          </button>
        </div>
        {agent.faq.length === 0 ? (
          <p className="text-[11px] text-zinc-600">
            Add 2–5 short Q&A pairs. Your AI will use these to answer confidently.
          </p>
        ) : (
          <div className="space-y-3">
            {agent.faq.map((item, index) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-zinc-500">Question {index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        faq: agent.faq.filter((f) => f.id !== item.id),
                      })
                    }
                    className="text-[11px] text-zinc-500 hover:text-zinc-200"
                  >
                    Remove
                  </button>
                </div>
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  placeholder="What do callers usually ask?"
                />
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
                  className="w-full px-3 py-2 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
                  placeholder="How should we answer?"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Special instructions</label>
        <textarea
          rows={3}
          value={agent.specialInstructions}
          onChange={(e) => onChange({ specialInstructions: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
          placeholder="Anything the AI should always remember when talking to callers."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">Website URL</label>
        <input
          type="url"
          value={agent.websiteUrl ?? ""}
          onChange={(e) => onChange({ websiteUrl: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          placeholder="https://yourbusiness.com"
        />
      </div>
    </div>
  );
}

function RulesTab({ agent, onChange }: { agent: Agent; onChange: (partial: Partial<Agent>) => void }) {
  const addTransferRule = () => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange({
      transferRules: [...agent.transferRules, { id, phrase: "", phone: "" }],
    });
  };

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] text-zinc-500">Transfer rules</label>
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
            Examples: &quot;billing&quot; → your billing specialist, &quot;emergency&quot; → on-call phone.
          </p>
        ) : (
          <div className="space-y-3">
            {agent.transferRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-zinc-500">
                    When caller says…
                  </p>
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
        <p className="text-[11px] text-zinc-500 mb-2">After-hours behavior</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "messages" as const, label: "Messages", desc: "Take messages only, no transfers" },
            { id: "emergency" as const, label: "Emergency", desc: "Route only clear emergencies" },
            { id: "forward" as const, label: "Forward", desc: "Forward all calls to on-call" },
          ].map(({ id, label, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ afterHoursMode: id })}
              className={`text-left p-2 rounded-xl border text-[11px] ${
                agent.afterHoursMode === id
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

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={agent.bookingEnabled}
            onClick={() => onChange({ bookingEnabled: !agent.bookingEnabled })}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              agent.bookingEnabled ? "bg-green-500" : "bg-zinc-700"
            }`}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all"
              style={{ left: agent.bookingEnabled ? "22px" : "2px" }}
            />
          </button>
          <p className="text-[11px] text-zinc-300">
            Allow this agent to book appointments
          </p>
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={agent.pricingEnabled}
            onClick={() => onChange({ pricingEnabled: !agent.pricingEnabled })}
            className={`mt-0.5 w-10 h-5 rounded-full relative transition-colors ${
              agent.pricingEnabled ? "bg-green-500" : "bg-zinc-700"
            }`}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all"
              style={{ left: agent.pricingEnabled ? "22px" : "2px" }}
            />
          </button>
          <div className="flex-1">
            <p className="text-[11px] text-zinc-300">Share pricing ranges on calls</p>
            <p className="text-[11px] text-zinc-500 mb-1">
              The AI will use these as a guide, not negotiate.
            </p>
            {agent.pricingEnabled && (
              <textarea
                rows={3}
                value={agent.priceList ?? ""}
                onChange={(e) => onChange({ priceList: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
                placeholder={"Examples:\n• New patient exam: $120–$180\n• Standard cleaning: $95–$140"}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-zinc-500">
          Max call duration (minutes)
        </label>
        <input
          type="number"
          min={3}
          max={30}
          value={agent.maxCallDuration}
          onChange={(e) =>
            onChange({
              maxCallDuration: Number(e.target.value || 0) || agent.maxCallDuration,
            })
          }
          className="w-24 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
      </div>
    </div>
  );
}

function agentNameToId(name: string): "sarah" | "alex" | "emma" {
  const n = (name || "").trim().toLowerCase();
  if (n === "alex") return "alex";
  if (n === "emma") return "emma";
  return "sarah";
}

function TestTab({ agent }: { agent: Agent }) {
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const start = () => {
    clearTimers();
    setPlaying(true);
    setStep(1);
    timersRef.current.push(
      window.setTimeout(() => setStep(2), 1200),
      window.setTimeout(() => setStep(3), 2400),
      window.setTimeout(() => {
        setStep(4);
        setPlaying(false);
      }, 3600),
    );
  };

  const stop = () => {
    clearTimers();
    setPlaying(false);
    setStep(0);
  };

  return (
    <div className="space-y-4 text-xs md:text-sm">
      <p className="text-[11px] text-zinc-500">
        Talk to this agent to test how it responds with your greeting and style.
      </p>
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
        <LiveAgentChat
          variant="mini"
          initialAgent={agentNameToId(agent.name)}
          businessName={agent.websiteUrl || undefined}
          greeting={agent.greeting}
            personality={agent.personality}
            callStyle={agent.callStyle}
            showMic={true}
        />
      </div>
      <p className="text-[11px] text-zinc-500">
        Quick simulated call so you can hear how this agent greets and handles a simple enquiry.
      </p>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Caller · &quot;New enquiry&quot;
          </p>
          <button
            type="button"
            onClick={() => (playing ? stop() : start())}
            className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
          >
            {playing ? "Stop" : "▶ Test Agent"}
          </button>
        </div>
        <div className="space-y-2">
          {step >= 1 && (
            <Bubble side="right" label="AI">
              {agent.greeting}
            </Bubble>
          )}
          {step >= 2 && (
            <Bubble side="left" label="Caller">
              Hi, I&apos;m a new customer. I wanted to see if you have availability this week.
            </Bubble>
          )}
          {step >= 3 && (
            <Bubble side="right" label="AI">
              Absolutely. I can help with that. What day and time works best, and what are you looking to book?
            </Bubble>
          )}
          {step >= 4 && (
            <Bubble side="left" label="Caller">
              Sometime Tuesday morning for a first visit.
            </Bubble>
          )}
        </div>
        {playing && step < 4 && (
          <div className="flex gap-1 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:120ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:240ms]" />
          </div>
        )}
      </div>
      <p className="text-[11px] text-zinc-500">
        This is a demo simulation only. In production, calls route through your connected phone number.
      </p>
    </div>
  );
}

function Bubble({
  side,
  label,
  children,
}: {
  side: "left" | "right";
  label: string;
  children: React.ReactNode;
}) {
  const align = side === "left" ? "items-start" : "items-end";
  const bubbleClass =
    side === "left"
      ? "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm"
      : "bg-zinc-200 text-zinc-900 rounded-2xl rounded-tr-sm";
  return (
    <div className={`flex flex-col ${align}`}>
      <span className="mb-0.5 text-[10px] text-zinc-500">{label}</span>
      <div className={`max-w-[85%] px-3 py-2 text-xs ${bubbleClass}`}>{children}</div>
    </div>
  );
}

