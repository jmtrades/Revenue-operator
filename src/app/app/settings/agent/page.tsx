"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CURATED_VOICES, DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages";
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

export default function AppSettingsAgentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    businessName: "",
    greeting: "",
    agentName: "Receptionist",
    preferredLanguage: "en",
    elevenlabsVoiceId: DEFAULT_VOICE_ID,
    knowledgeItems: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/agent", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AgentConfig;
        setConfig({
          businessName: data.businessName ?? "",
          greeting: data.greeting ?? "",
          agentName: data.agentName ?? "Receptionist",
          preferredLanguage: data.preferredLanguage ?? "en",
          elevenlabsVoiceId: data.elevenlabsVoiceId || DEFAULT_VOICE_ID,
          knowledgeItems: Array.isArray(data.knowledgeItems) ? data.knowledgeItems : [],
        });
      }
    } catch {
      setToast("Could not load agent settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const patchRes = await fetch("/api/workspace/agent", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: config.businessName || "My Workspace",
          greeting: config.greeting,
          agentName: config.agentName,
          preferredLanguage: config.preferredLanguage,
          elevenlabsVoiceId: config.elevenlabsVoiceId || null,
          knowledgeItems: config.knowledgeItems.filter((i) => (i.q ?? "").trim()),
        }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        setToast((err as { error?: string }).error ?? "Failed to save.");
        setSaving(false);
        setTimeout(() => setToast(null), 4000);
        return;
      }
      const agentRes = await fetch("/api/vapi/create-agent", { method: "POST", credentials: "include" });
      if (!agentRes.ok) {
        setToast("Saved, but voice agent could not be updated. Try again.");
      } else {
        setToast("Agent updated. Your next calls will use the new settings.");
      }
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast("Something went wrong.");
      setTimeout(() => setToast(null), 4000);
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
    const text = config.greeting.trim() || `Thanks for calling ${config.businessName || "your business"}. How can I help?`;
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
        <p className="text-sm text-zinc-500">Loading agent settings…</p>
        <p className="mt-4">
          <Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Agent</h1>
      <p className="text-sm text-zinc-500 mb-6">Control your voice agent: greeting, voice, language, and knowledge.</p>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="agent-business" className="block text-xs font-medium text-zinc-400 mb-1">Business name</label>
          <input
            id="agent-business"
            type="text"
            value={config.businessName}
            onChange={(e) => setConfig((c) => ({ ...c, businessName: e.target.value }))}
            placeholder="Your business"
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="agent-name" className="block text-xs font-medium text-zinc-400 mb-1">Agent name</label>
          <input
            id="agent-name"
            type="text"
            value={config.agentName}
            onChange={(e) => setConfig((c) => ({ ...c, agentName: e.target.value }))}
            placeholder="Receptionist"
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="agent-greeting" className="block text-xs font-medium text-zinc-400 mb-1">Greeting (first thing callers hear)</label>
          <textarea
            id="agent-greeting"
            rows={2}
            value={config.greeting}
            onChange={(e) => setConfig((c) => ({ ...c, greeting: e.target.value }))}
            placeholder={`Thanks for calling ${config.businessName || "your business"}. How can I help you today?`}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none resize-none"
          />
          <button type="button" onClick={playGreeting} className="mt-1 text-xs text-zinc-400 hover:text-white transition-colors">Preview voice →</button>
        </div>
        <div>
          <label htmlFor="agent-voice" className="block text-xs font-medium text-zinc-400 mb-1">Voice</label>
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
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
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
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-zinc-400">Knowledge (Q&A the agent can use)</label>
            <button type="button" onClick={addKnowledge} className="text-xs text-zinc-400 hover:text-white transition-colors">+ Add</button>
          </div>
          <div className="space-y-2">
            {config.knowledgeItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={item.q ?? ""}
                  onChange={(e) => updateKnowledge(idx, "q", e.target.value)}
                  placeholder="Question"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={item.a ?? ""}
                  onChange={(e) => updateKnowledge(idx, "a", e.target.value)}
                  placeholder="Answer"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:outline-none"
                />
                <button type="button" onClick={() => removeKnowledge(idx)} className="shrink-0 text-zinc-500 hover:text-red-400 text-sm px-1" aria-label="Remove">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {previewing && (
        <p className="mb-4 text-xs text-zinc-500">Playing voice preview…</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-60 transition-colors"
      >
        {saving ? "Saving…" : "Save and update agent"}
      </button>

      <div className="mt-6">
        <WorkspaceVoiceButton
          title="Test your agent"
          description="Run a live browser call with your current assistant, then review the transcript before saving more changes."
          startLabel="Start live test"
          endLabel="End live test"
          showUnavailable={true}
        />
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">
          {toast}
        </div>
      )}

      <p className="mt-6">
        <Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link>
      </p>
    </div>
  );
}
