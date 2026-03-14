"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CURATED_VOICES, DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { previewVoiceViaApi } from "@/lib/voice-preview";
import { WorkspaceVoiceButton } from "@/components/WorkspaceVoiceButton";

type AgentConfig = {
  businessName: string;
  greeting: string;
  agentName: string;
  preferredLanguage: string;
  elevenlabsVoiceId: string;
  knowledgeItems: Array<{ q?: string; a?: string }>;
};

const AGENT_SETTINGS_SNAPSHOT_PREFIX = "rt_agent_settings_snapshot:";

function readAgentSettingsSnapshot(workspaceId: string): AgentConfig | null {
  if (typeof window === "undefined" || !workspaceId) return null;
  try {
    const raw = window.localStorage.getItem(
      `${AGENT_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`,
    );
    return raw ? (JSON.parse(raw) as AgentConfig) : null;
  } catch {
    return null;
  }
}

function persistAgentSettingsSnapshot(workspaceId: string, config: AgentConfig) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(
      `${AGENT_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore persistence errors
  }
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
  const [config, setConfig] = useState<AgentConfig>(
    initialConfig ?? {
      businessName: "",
      greeting: "",
      agentName: "Receptionist",
      preferredLanguage: "en",
      elevenlabsVoiceId: DEFAULT_VOICE_ID,
      knowledgeItems: [],
    },
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/agent", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AgentConfig;
        const nextConfig = {
          businessName: data.businessName ?? "",
          greeting: data.greeting ?? "",
          agentName: data.agentName ?? "Receptionist",
          preferredLanguage: data.preferredLanguage ?? "en",
          elevenlabsVoiceId: data.elevenlabsVoiceId || DEFAULT_VOICE_ID,
          knowledgeItems: Array.isArray(data.knowledgeItems) ? data.knowledgeItems : [],
        };
        setConfig(nextConfig);
        persistAgentSettingsSnapshot(snapshotWorkspaceId, nextConfig);
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
          elevenlabsVoiceId: config.elevenlabsVoiceId || null,
          knowledgeItems: config.knowledgeItems.filter((i) => (i.q ?? "").trim()),
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
      const agentRes = await fetch("/api/vapi/create-agent", { method: "POST", credentials: "include" });
      if (!agentRes.ok) {
        const message = tSettings("agent.voiceSyncFailed");
        setInlineToast(message);
        toast.error(message);
      } else {
        const message = tSettings("agent.updated");
        setInlineToast(message);
        toast.success(tToast("saved"));
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

  const playGreeting = () => {
    const text = config.greeting.trim() || `Thanks for calling ${config.businessName || tSettings("agent.defaultBusiness")}. How can I help?`;
    setPreviewing(true);
    previewVoiceViaApi(text, {
      voiceId: config.elevenlabsVoiceId || undefined,
      gender: CURATED_VOICES.find((voice) => voice.id === config.elevenlabsVoiceId)?.gender ?? "female",
      onEnd: () => setPreviewing(false),
    });
  };

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto p-4 md:p-6">
        <p className="text-sm text-zinc-500">{tSettings("agent.loading")}</p>
        <p className="mt-4">
          <Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">{tSettings("agent.heading")}</h1>
      <p className="text-sm text-zinc-500 mb-6">{tSettings("agent.description")}</p>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="agent-business" className="block text-xs font-medium text-zinc-400 mb-1">{tSettings("agent.businessNameLabel")}</label>
          <input
            id="agent-business"
            type="text"
            value={config.businessName}
            onChange={(e) => setConfig((c) => ({ ...c, businessName: e.target.value }))}
            placeholder={tSettings("agent.businessNamePlaceholder")}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="agent-name" className="block text-xs font-medium text-zinc-400 mb-1">{tSettings("agent.agentNameLabel")}</label>
          <input
            id="agent-name"
            type="text"
            value={config.agentName}
            onChange={(e) => setConfig((c) => ({ ...c, agentName: e.target.value }))}
            placeholder={tSettings("agent.agentNamePlaceholder")}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="agent-greeting" className="block text-xs font-medium text-zinc-400 mb-1">{tSettings("agent.openingGreetingLabel")}</label>
          <p className="text-[11px] text-zinc-500 mb-1">{tSettings("agent.openingGreetingHelp")}</p>
          <textarea
            id="agent-greeting"
            rows={2}
            value={config.greeting}
            onChange={(e) => setConfig((c) => ({ ...c, greeting: e.target.value }))}
            placeholder={tSettings("agent.greetingPlaceholderDefault", { business: config.businessName || tSettings("agent.defaultBusiness") })}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none resize-none"
          />
          <button type="button" onClick={playGreeting} className="mt-1 text-xs text-zinc-400 hover:text-white transition-colors">{tSettings("agent.previewVoice")}</button>
        </div>
        <div>
          <label htmlFor="agent-voice" className="block text-xs font-medium text-zinc-400 mb-1">{tSettings("agent.voiceLabel")}</label>
          <select
            id="agent-voice"
            value={config.elevenlabsVoiceId}
            onChange={(e) => {
              const nextVoiceId = e.target.value;
              setConfig((c) => ({ ...c, elevenlabsVoiceId: nextVoiceId }));
              setPreviewing(true);
              previewVoiceViaApi("Thanks for calling. How can I help you today?", {
                voiceId: nextVoiceId,
                gender: CURATED_VOICES.find((voice) => voice.id === nextVoiceId)?.gender ?? "female",
                onEnd: () => setPreviewing(false),
              });
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          >
            {CURATED_VOICES.map((v) => (
              <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="agent-lang" className="block text-xs font-medium text-zinc-400 mb-1">Language</label>
          <select
            id="agent-lang"
            value={config.preferredLanguage}
            onChange={(e) => setConfig((c) => ({ ...c, preferredLanguage: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-zinc-400">{tSettings("agent.knowledgeLabel")}</label>
            <button type="button" onClick={addKnowledge} className="text-xs text-zinc-400 hover:text-white transition-colors">{tSettings("agent.knowledgeAdd")}</button>
          </div>
          <div className="space-y-2">
            {config.knowledgeItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={item.q ?? ""}
                  onChange={(e) => updateKnowledge(idx, "q", e.target.value)}
                  placeholder={tSettings("agent.questionPlaceholder")}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
                <input
                  type="text"
                  value={item.a ?? ""}
                  onChange={(e) => updateKnowledge(idx, "a", e.target.value)}
                  placeholder={tSettings("agent.answerPlaceholder")}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
                <button type="button" onClick={() => removeKnowledge(idx)} className="shrink-0 text-zinc-500 hover:text-red-400 text-sm px-1" aria-label={tSettings("agent.removeAria")}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {previewing && (
        <p className="mb-4 text-xs text-zinc-500">{tSettings("agent.playingVoicePreview")}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-60 transition-colors"
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
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">
          {inlineToast}
        </div>
      )}

      <p className="mt-6">
        <Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">{tSettings("agent.backToSettings")}</Link>
      </p>
    </div>
  );
}
