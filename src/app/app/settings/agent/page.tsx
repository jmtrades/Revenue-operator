"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { RECALL_VOICES, DEFAULT_RECALL_VOICE_ID } from "@/lib/constants/recall-voices";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { previewVoiceViaApi } from "@/lib/voice-preview";
import { WorkspaceVoiceButton } from "@/components/WorkspaceVoiceButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";

type AgentConfig = {
  businessName: string;
  greeting: string;
  agentName: string;
  preferredLanguage: string;
  voiceId: string;
  knowledgeItems: Array<{ q?: string; a?: string }>;
  qualificationMethod: "None" | "BANT" | "Custom Questions";
  customQualificationQuestions: Array<{ q?: string; a?: string }>;
  tonePreset: "Professional" | "Casual & Friendly" | "Concise & Direct" | "Empathetic & Warm";
  transferPolicy: "Never" | "If caller requests" | "On escalation trigger" | "Always";
  transferNumber: string;
  escalationThreshold: "Conservative — transfer often" | "Balanced" | "Aggressive — AI handles most";
  escalationTriggers: string;
  allowedActions: string[];
  forbiddenActions: string[];
  objections: Array<{ objection?: string; response?: string }>;
};

const AGENT_SETTINGS_SNAPSHOT_PREFIX = "rt_agent_settings_snapshot:";

function readAgentSettingsSnapshot(workspaceId: string): AgentConfig | null {
  if (typeof window === "undefined" || !workspaceId) return null;
  const key = `${AGENT_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`;
  try {
    const raw = safeGetItem(key);
    return raw ? (JSON.parse(raw) as AgentConfig) : null;
  } catch {
    safeRemoveItem(key);
    return null;
  }
}

function persistAgentSettingsSnapshot(workspaceId: string, config: AgentConfig) {
  if (typeof window === "undefined" || !workspaceId) return;
  const key = `${AGENT_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`;
  safeSetItem(key, JSON.stringify(config));
}

export default function AppSettingsAgentPage() {
  const tSettings = useTranslations("settings");
  const tToast = useTranslations("toast");
  useEffect(() => {
    document.title = tSettings("agentPageTitle");
  }, [tSettings]);
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceSnapshot?.id?.trim() || "default";
  const initialConfig = readAgentSettingsSnapshot(snapshotWorkspaceId);
  const [loading, setLoading] = useState(initialConfig == null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [inlineToast, setInlineToast] = useState<string | null>(null);
  const [pendingKnowledgeDelete, setPendingKnowledgeDelete] = useState<number | null>(null);
  const [config, setConfig] = useState<AgentConfig>(
    initialConfig ?? {
      businessName: "",
      greeting: "",
      agentName: tSettings("agent.defaultAgentName"),
      preferredLanguage: "en",
      voiceId: DEFAULT_RECALL_VOICE_ID,
      knowledgeItems: [],
      qualificationMethod: "None",
      customQualificationQuestions: [],
      tonePreset: "Professional",
      transferPolicy: "Never",
      transferNumber: "",
      escalationThreshold: "Balanced",
      escalationTriggers: "",
      allowedActions: ["Book appointments", "Collect contact info", "Send SMS follow-up", "Transfer to human", "Leave voicemail"],
      forbiddenActions: [],
      objections: [
        { objection: "Too expensive", response: "I understand budget is important. Let me share what's included and we can find the right option for you." },
        { objection: "I need to think about it", response: "Of course! Can I send you a summary and follow up tomorrow?" },
      ],
    },
  );
  const lastSavedRef = useRef<string>(JSON.stringify(config));
  const isDirty = lastSavedRef.current !== JSON.stringify(config);
  useUnsavedChanges(isDirty);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/agent", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AgentConfig;
        const nextConfig = {
          businessName: data.businessName ?? "",
          greeting: data.greeting ?? "",
          agentName: data.agentName ?? tSettings("agent.defaultAgentName"),
          preferredLanguage: data.preferredLanguage ?? "en",
          voiceId: data.voiceId || DEFAULT_RECALL_VOICE_ID,
          knowledgeItems: Array.isArray(data.knowledgeItems) ? data.knowledgeItems : [],
          qualificationMethod: data.qualificationMethod ?? "None",
          customQualificationQuestions: Array.isArray(data.customQualificationQuestions) ? data.customQualificationQuestions : [],
          tonePreset: data.tonePreset ?? "Professional",
          transferPolicy: data.transferPolicy ?? "Never",
          transferNumber: data.transferNumber ?? "",
          escalationThreshold: data.escalationThreshold ?? "Balanced",
          escalationTriggers: data.escalationTriggers ?? "",
          allowedActions: Array.isArray(data.allowedActions) ? data.allowedActions : ["Book appointments", "Collect contact info", "Send SMS follow-up", "Transfer to human", "Leave voicemail"],
          forbiddenActions: Array.isArray(data.forbiddenActions) ? data.forbiddenActions : [],
          objections: Array.isArray(data.objections) ? data.objections : [],
        };
        setConfig(nextConfig);
        persistAgentSettingsSnapshot(snapshotWorkspaceId, nextConfig);
        lastSavedRef.current = JSON.stringify(nextConfig);
      }
    } catch {
      const message = tSettings("agent.loadFailed");
      setInlineToast(message);
      toast.error(message);
      setTimeout(() => setInlineToast(null), 4000);
    } finally {
      setLoading(false);
    }
  }, [snapshotWorkspaceId, tSettings]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setInlineToast(null);
    try {
      const patchRes = await fetch("/api/workspace/agent", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: config.businessName || tSettings("agent.defaultWorkspaceName"),
          greeting: config.greeting,
          agentName: config.agentName,
          preferredLanguage: config.preferredLanguage,
          voiceId: config.voiceId || null,
          knowledgeItems: config.knowledgeItems.filter((i) => (i.q ?? "").trim()),
          qualificationMethod: config.qualificationMethod,
          customQualificationQuestions: config.customQualificationQuestions.filter((i) => (i.q ?? "").trim()),
          tonePreset: config.tonePreset,
          transferPolicy: config.transferPolicy,
          transferNumber: config.transferNumber,
          escalationThreshold: config.escalationThreshold,
          escalationTriggers: config.escalationTriggers,
          allowedActions: config.allowedActions,
          forbiddenActions: config.forbiddenActions,
          objections: config.objections.filter((i) => (i.objection ?? "").trim()),
        }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        const message =
          (err as { error?: string }).error ??
          tSettings("agent.saveFailed");
        setInlineToast(message);
        toast.error(message);
        setSaving(false);
        setTimeout(() => setInlineToast(null), 4000);
        return;
      }
      {
        const message = tSettings("agent.updated");
        setInlineToast(message);
        toast.success(tSettings("agent.updated"));
        lastSavedRef.current = JSON.stringify(config);
      }
      setTimeout(() => setInlineToast(null), 4000);
    } catch {
      setInlineToast(tToast("error.generic"));
      toast.error(tSettings("agent.saveFailed"));
      setTimeout(() => setInlineToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const addKnowledge = () => {
    setConfig((prev) => ({
      ...prev,
      knowledgeItems: [...prev.knowledgeItems, { q: "", a: "" }],
    }));
  };

  const updateKnowledge = (idx: number, field: "q" | "a", value: string) => {
    setConfig((prev) => {
      const next = [...prev.knowledgeItems];
      if (!next[idx]) next[idx] = { q: "", a: "" };
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, knowledgeItems: next };
    });
  };

  const removeKnowledge = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      knowledgeItems: prev.knowledgeItems.filter((_, i) => i !== idx),
    }));
  };

  const addCustomQuestion = () => {
    setConfig((prev) => ({
      ...prev,
      customQualificationQuestions: [...prev.customQualificationQuestions, { q: "", a: "" }],
    }));
  };

  const updateCustomQuestion = (idx: number, field: "q" | "a", value: string) => {
    setConfig((prev) => {
      const next = [...prev.customQualificationQuestions];
      if (!next[idx]) next[idx] = { q: "", a: "" };
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, customQualificationQuestions: next };
    });
  };

  const removeCustomQuestion = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      customQualificationQuestions: prev.customQualificationQuestions.filter((_, i) => i !== idx),
    }));
  };

  const addObjection = () => {
    setConfig((prev) => ({
      ...prev,
      objections: [...prev.objections, { objection: "", response: "" }],
    }));
  };

  const updateObjection = (idx: number, field: "objection" | "response", value: string) => {
    setConfig((prev) => {
      const next = [...prev.objections];
      if (!next[idx]) next[idx] = { objection: "", response: "" };
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, objections: next };
    });
  };

  const removeObjection = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      objections: prev.objections.filter((_, i) => i !== idx),
    }));
  };

  const toggleAllowedAction = (action: string) => {
    setConfig((prev) => ({
      ...prev,
      allowedActions: prev.allowedActions.includes(action)
        ? prev.allowedActions.filter((a) => a !== action)
        : [...prev.allowedActions, action],
    }));
  };

  const toggleForbiddenAction = (action: string) => {
    setConfig((prev) => ({
      ...prev,
      forbiddenActions: prev.forbiddenActions.includes(action)
        ? prev.forbiddenActions.filter((a) => a !== action)
        : [...prev.forbiddenActions, action],
    }));
  };

  const BANT_QUESTIONS = [
    "What's your budget for this solution?",
    "Who is the decision maker on your team?",
    "What specific business need are you trying to address?",
    "What's your timeline for implementing a solution?",
  ];

  const ALLOWED_ACTIONS_LIST = [
    "Book appointments",
    "Collect contact info",
    "Send SMS follow-up",
    "Transfer to human",
    "Leave voicemail",
  ];

  const FORBIDDEN_ACTIONS_LIST = [
    "Take payments",
    "Share pricing without approval",
    "Make promises about timelines",
    "Discuss competitors",
  ];

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    behavior: false,
    escalation: false,
    actions: false,
    objections: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const playGreeting = () => {
    const text = config.greeting.trim() || tSettings("agent.defaultGreeting", { business: config.businessName || tSettings("agent.defaultBusiness") });
    setPreviewing(true);
    previewVoiceViaApi(text, {
      voiceId: config.voiceId || undefined,
      gender: RECALL_VOICES.find((voice) => voice.id === config.voiceId)?.gender ?? "female",
      onEnd: () => setPreviewing(false),
    });
  };

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto p-4 md:p-6 space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-[var(--bg-inset)] rounded" />
        <div className="h-4 w-full max-w-md bg-[var(--bg-inset)] rounded" />
        <div className="space-y-4">
          <div className="h-10 w-full bg-[var(--bg-inset)] rounded-xl" />
          <div className="h-10 w-full bg-[var(--bg-inset)] rounded-xl" />
          <div className="h-20 w-full bg-[var(--bg-inset)] rounded-xl" />
          <div className="h-32 w-full bg-[var(--bg-inset)] rounded-xl" />
        </div>
        <div className="h-10 w-32 bg-[var(--bg-inset)] rounded-xl" />
        <p className="mt-4">
          <Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tSettings("agent.backToSettings")}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tSettings("agent.heading")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tSettings("agent.description")}</p>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="agent-business" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("agent.businessNameLabel")}</label>
          <input
            id="agent-business"
            type="text"
            value={config.businessName}
            onChange={(e) => setConfig((c) => ({ ...c, businessName: e.target.value }))}
            placeholder={tSettings("agent.businessNamePlaceholder")}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="agent-name" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("agent.agentNameLabel")}</label>
          <input
            id="agent-name"
            type="text"
            value={config.agentName}
            onChange={(e) => setConfig((c) => ({ ...c, agentName: e.target.value }))}
            placeholder={tSettings("agent.agentNamePlaceholder")}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="agent-greeting" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("agent.openingGreetingLabel")}</label>
          <p className="text-[11px] text-[var(--text-secondary)] mb-1">{tSettings("agent.openingGreetingHelp")}</p>
          <textarea
            id="agent-greeting"
            rows={2}
            value={config.greeting}
            onChange={(e) => setConfig((c) => ({ ...c, greeting: e.target.value }))}
            placeholder={tSettings("agent.greetingPlaceholderDefault", { business: config.businessName || tSettings("agent.defaultBusiness") })}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none resize-none"
          />
          <button type="button" onClick={playGreeting} className="mt-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tSettings("agent.previewVoice")}</button>
        </div>
        <div>
          <label htmlFor="agent-voice" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("agent.voiceLabel")}</label>
          <select
            id="agent-voice"
            value={config.voiceId}
            onChange={(e) => {
              const nextVoiceId = e.target.value;
              setConfig((c) => ({ ...c, voiceId: nextVoiceId }));
              setPreviewing(true);
              previewVoiceViaApi(tSettings("agent.voicePreviewText"), {
                voiceId: nextVoiceId,
                gender: RECALL_VOICES.find((voice) => voice.id === nextVoiceId)?.gender ?? "female",
                onEnd: () => setPreviewing(false),
              });
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          >
            {RECALL_VOICES.map((v) => (
              <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="agent-lang" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("agent.languageLabel")}</label>
          <select
            id="agent-lang"
            value={config.preferredLanguage}
            onChange={(e) => setConfig((c) => ({ ...c, preferredLanguage: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-[var(--text-tertiary)]">{tSettings("agent.knowledgeLabel")}</label>
            <button type="button" onClick={addKnowledge} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tSettings("agent.knowledgeAdd")}</button>
          </div>
          <div className="space-y-2">
            {config.knowledgeItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={item.q ?? ""}
                  onChange={(e) => updateKnowledge(idx, "q", e.target.value)}
                  placeholder={tSettings("agent.questionPlaceholder")}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
                <input
                  type="text"
                  value={item.a ?? ""}
                  onChange={(e) => updateKnowledge(idx, "a", e.target.value)}
                  placeholder={tSettings("agent.answerPlaceholder")}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
                <button type="button" onClick={() => setPendingKnowledgeDelete(idx)} className="shrink-0 text-[var(--text-secondary)] hover:text-red-400 text-sm px-1" aria-label={tSettings("agent.removeAria")}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section A: Behavior & Qualification */}
      <div className="mb-6 border border-[var(--border-default)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("behavior")}
          className="w-full px-4 py-3 flex items-center justify-between bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Behavior & Qualification</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Configure qualification methods and tone</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${expandedSections.behavior ? "rotate-180" : ""}`} />
        </button>
        {expandedSections.behavior && (
          <div className="px-4 py-4 space-y-4 border-t border-[var(--border-default)]">
            <div>
              <label htmlFor="qual-method" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Qualification Method</label>
              <select
                id="qual-method"
                value={config.qualificationMethod}
                onChange={(e) => setConfig((c) => ({ ...c, qualificationMethod: e.target.value as "None" | "BANT" | "Custom Questions" }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
              >
                <option value="None">None</option>
                <option value="BANT">BANT</option>
                <option value="Custom Questions">Custom Questions</option>
              </select>
            </div>

            {config.qualificationMethod === "BANT" && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-2">BANT Questions (Read-only Examples)</label>
                <div className="space-y-2">
                  {BANT_QUESTIONS.map((q, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-default)]">
                      <p className="text-xs text-[var(--text-primary)]">{idx + 1}. {q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.qualificationMethod === "Custom Questions" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-[var(--text-tertiary)]">Custom Questions</label>
                  <button type="button" onClick={addCustomQuestion} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">+ Add</button>
                </div>
                <div className="space-y-2">
                  {config.customQualificationQuestions.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={item.q ?? ""}
                        onChange={(e) => updateCustomQuestion(idx, "q", e.target.value)}
                        placeholder="Question"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={item.a ?? ""}
                        onChange={(e) => updateCustomQuestion(idx, "a", e.target.value)}
                        placeholder="Expected answer"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                      />
                      <button type="button" onClick={() => removeCustomQuestion(idx)} className="shrink-0 text-[var(--text-secondary)] hover:text-red-400 text-sm px-1">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="tone-preset" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Tone Preset</label>
              <select
                id="tone-preset"
                value={config.tonePreset}
                onChange={(e) => setConfig((c) => ({ ...c, tonePreset: e.target.value as typeof config.tonePreset }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
              >
                <option value="Professional">Professional</option>
                <option value="Casual & Friendly">Casual & Friendly</option>
                <option value="Concise & Direct">Concise & Direct</option>
                <option value="Empathetic & Warm">Empathetic & Warm</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Section B: Escalation & Transfer Rules */}
      <div className="mb-6 border border-[var(--border-default)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("escalation")}
          className="w-full px-4 py-3 flex items-center justify-between bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Escalation & Transfer Rules</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Configure when to transfer to humans</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${expandedSections.escalation ? "rotate-180" : ""}`} />
        </button>
        {expandedSections.escalation && (
          <div className="px-4 py-4 space-y-4 border-t border-[var(--border-default)]">
            <div>
              <label htmlFor="transfer-policy" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Transfer Policy</label>
              <select
                id="transfer-policy"
                value={config.transferPolicy}
                onChange={(e) => setConfig((c) => ({ ...c, transferPolicy: e.target.value as typeof config.transferPolicy }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
              >
                <option value="Never">Never</option>
                <option value="If caller requests">If caller requests</option>
                <option value="On escalation trigger">On escalation trigger</option>
                <option value="Always">Always</option>
              </select>
            </div>

            {config.transferPolicy !== "Never" && (
              <div>
                <label htmlFor="transfer-number" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Transfer Phone Number</label>
                <input
                  id="transfer-number"
                  type="tel"
                  value={config.transferNumber}
                  onChange={(e) => setConfig((c) => ({ ...c, transferNumber: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="escalation-threshold" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Confidence Threshold</label>
              <select
                id="escalation-threshold"
                value={config.escalationThreshold}
                onChange={(e) => setConfig((c) => ({ ...c, escalationThreshold: e.target.value as typeof config.escalationThreshold }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
              >
                <option value="Conservative — transfer often">Conservative — transfer often</option>
                <option value="Balanced">Balanced</option>
                <option value="Aggressive — AI handles most">Aggressive — AI handles most</option>
              </select>
            </div>

            <div>
              <label htmlFor="escalation-triggers" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Escalation Triggers</label>
              <p className="text-[11px] text-[var(--text-secondary)] mb-1">Describe situations when the agent should transfer to a human</p>
              <textarea
                id="escalation-triggers"
                rows={3}
                value={config.escalationTriggers}
                onChange={(e) => setConfig((c) => ({ ...c, escalationTriggers: e.target.value }))}
                placeholder="E.g., Angry customer, technical issue, competitor comparison..."
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section C: Allowed & Forbidden Actions */}
      <div className="mb-6 border border-[var(--border-default)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("actions")}
          className="w-full px-4 py-3 flex items-center justify-between bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Allowed & Forbidden Actions</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Control what the agent can and cannot do</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${expandedSections.actions ? "rotate-180" : ""}`} />
        </button>
        {expandedSections.actions && (
          <div className="px-4 py-4 space-y-4 border-t border-[var(--border-default)]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-2">Allowed Actions</label>
                <div className="space-y-2">
                  {ALLOWED_ACTIONS_LIST.map((action) => (
                    <label key={action} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.allowedActions.includes(action)}
                        onChange={() => toggleAllowedAction(action)}
                        className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                      />
                      <span className="text-xs text-[var(--text-primary)]">{action}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-2">Forbidden Actions</label>
                <div className="space-y-2">
                  {FORBIDDEN_ACTIONS_LIST.map((action) => (
                    <label key={action} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.forbiddenActions.includes(action)}
                        onChange={() => toggleForbiddenAction(action)}
                        className="w-4 h-4 rounded border-[var(--border-default)] text-red-500 focus:ring-red-500"
                      />
                      <span className="text-xs text-[var(--text-primary)]">{action}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section D: Objection Handling */}
      <div className="mb-6 border border-[var(--border-default)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("objections")}
          className="w-full px-4 py-3 flex items-center justify-between bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Objection Handling</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Pre-built responses to common objections</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${expandedSections.objections ? "rotate-180" : ""}`} />
        </button>
        {expandedSections.objections && (
          <div className="px-4 py-4 space-y-4 border-t border-[var(--border-default)]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-[var(--text-tertiary)]">Objection/Response Pairs</label>
                <button type="button" onClick={addObjection} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">+ Add</button>
              </div>
              <div className="space-y-2">
                {config.objections.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={item.objection ?? ""}
                      onChange={(e) => updateObjection(idx, "objection", e.target.value)}
                      placeholder="Objection"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={item.response ?? ""}
                      onChange={(e) => updateObjection(idx, "response", e.target.value)}
                      placeholder="Response"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                    />
                    <button type="button" onClick={() => removeObjection(idx)} className="shrink-0 text-[var(--text-secondary)] hover:text-red-400 text-sm px-1">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {previewing && (
        <p className="mb-4 text-xs text-[var(--text-secondary)]">{tSettings("agent.playingVoicePreview")}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-60 transition-colors"
      >
        {saving ? tSettings("agent.saving") : tSettings("agent.saveAndUpdateAgent")}
      </button>

      <div className="mt-6">
        <WorkspaceVoiceButton
          title={tSettings("agent.testTitle")}
          description={tSettings("agent.testDescription")}
          startLabel={tSettings("agent.startLiveTest")}
          endLabel={tSettings("agent.endLiveTest")}
          showUnavailable={true}
        />
      </div>

      {inlineToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-[var(--text-primary)]">
          {inlineToast}
        </div>
      )}

      <ConfirmDialog
        open={pendingKnowledgeDelete !== null}
        title={tSettings("agent.knowledgeDeleteConfirmTitle")}
        message={tSettings("agent.knowledgeDeleteConfirmMessage")}
        variant="danger"
        confirmLabel={tSettings("agent.removeAria")}
        onConfirm={() => {
          if (pendingKnowledgeDelete !== null) removeKnowledge(pendingKnowledgeDelete);
          setPendingKnowledgeDelete(null);
        }}
        onClose={() => setPendingKnowledgeDelete(null)}
      />

      <p className="mt-6">
        <Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tSettings("agent.backToSettings")}</Link>
      </p>
    </div>
  );
}
