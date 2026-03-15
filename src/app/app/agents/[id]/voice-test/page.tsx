"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CURATED_VOICES, type CuratedVoice } from "@/lib/constants/curated-voices";
import { cn } from "@/lib/cn";

function playVoicePreview(voiceId: string, text: string): Promise<void> {
  return fetch("/api/agent/preview-voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice_id: voiceId, text: text.slice(0, 5000) }),
  }).then(async (res) => {
    if (!res.ok || !res.body) throw new Error("Preview failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Playback failed"));
      };
      audio.play().catch(reject);
    });
  });
}

export default function AgentVoiceTestPage() {
  const params = useParams();
  useRouter();
  const t = useTranslations("agents.voiceTest");
  const tToast = useTranslations("toast");
  const agentId = typeof params?.id === "string" ? params.id : "";
  const [agent, setAgent] = useState<{ id: string; name: string; voice_id: string | null } | null>(null);
  const [loading, setLoading] = useState(!!agentId);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [customScript, setCustomScript] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [_generating, _setGenerating] = useState(false);
  const [abVoiceA, setAbVoiceA] = useState<string>(CURATED_VOICES[0]?.id ?? "");
  const [abVoiceB, setAbVoiceB] = useState<string>(CURATED_VOICES[1]?.id ?? "");
  const [abWinner, setAbWinner] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setCustomScript((prev) => (prev === "" ? t("defaultPreviewText") : prev));
  }, [t]);

  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/agents/${agentId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id?: string; name?: string; voice_id?: string | null } | null) => {
        if (data?.id) {
          setAgent({ id: data.id, name: data.name ?? "Agent", voice_id: data.voice_id ?? null });
          setSelectedVoiceId(data.voice_id ?? CURATED_VOICES[0]?.id ?? null);
        }
      })
      .catch(() => setAgent(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  const handlePlay = useCallback(
    async (voice: CuratedVoice) => {
      setPlayingId(voice.id);
      try {
        await playVoicePreview(voice.id, customScript || t("defaultPreviewText"));
        toast.success(t("toast.played", { name: voice.name }));
      } catch {
        toast.error(t("errors.previewFailed"));
      } finally {
        setPlayingId(null);
      }
    },
    [customScript, t]
  );

  const handleApply = useCallback(async () => {
    if (!agentId || !selectedVoiceId) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: selectedVoiceId }),
      });
      if (res.ok) {
        toast.success(t("toast.applied"));
        setAgent((a) => (a ? { ...a, voice_id: selectedVoiceId } : null));
      } else {
        const d = (await res.json()) as { error?: string };
        toast.error(d.error ?? t("errors.applyFailed"));
      }
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setApplying(false);
    }
  }, [agentId, selectedVoiceId, t, tToast]);

  if (!agentId) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-zinc-400">No agent selected.</p>
        <Link href="/app/agents" className="text-sm text-[var(--accent-primary)] hover:underline mt-2 inline-block">
          Back to Agents
        </Link>
      </div>
    );
  }

  if (loading || !agent) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        href="/app/agents"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>
      <h1 className="text-xl font-semibold text-white mb-1">Voice preview & test</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Try voices for &quot;{agent.name}&quot;. Play samples, test your script, compare two voices, then apply.
      </p>

      {/* Test with my script */}
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 mb-6">
        <h2 className="text-sm font-semibold text-white mb-2">Test with your script</h2>
        <textarea
          value={customScript}
          onChange={(e) => setCustomScript(e.target.value)}
          placeholder={t("scriptPlaceholder")}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--accent-primary)] focus:outline-none resize-y mb-3"
        />
        <p className="text-[11px] text-zinc-500 mb-3">
          Select a voice below and click Play to hear this script. Or use &quot;Generate Preview&quot; after picking a voice.
        </p>
      </section>

      {/* A/B comparison */}
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">A/B comparison</h2>
        <div className="flex flex-wrap gap-4 items-end mb-3">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Voice A</label>
            <select
              value={abVoiceA}
              onChange={(e) => setAbVoiceA(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:outline-none min-w-[160px]"
            >
              {CURATED_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Voice B</label>
            <select
              value={abVoiceB}
              onChange={(e) => setAbVoiceB(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:outline-none min-w-[160px]"
            >
              {CURATED_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={playingId !== null}
              onClick={async () => {
                setPlayingId(abVoiceA);
                try {
                  await playVoicePreview(abVoiceA, customScript || t("defaultPreviewText"));
                } finally {
                  setPlayingId(null);
                }
              }}
              className="px-3 py-2 rounded-xl border border-[var(--border-default)] text-zinc-300 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              Play A
            </button>
            <button
              type="button"
              disabled={playingId !== null}
              onClick={async () => {
                setPlayingId(abVoiceB);
                try {
                  await playVoicePreview(abVoiceB, customScript || t("defaultPreviewText"));
                } finally {
                  setPlayingId(null);
                }
              }}
              className="px-3 py-2 rounded-xl border border-[var(--border-default)] text-zinc-300 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              Play B
            </button>
            <button
              type="button"
              onClick={() => { setSelectedVoiceId(abVoiceA); setAbWinner("A"); }}
              className={cn("px-3 py-2 rounded-xl text-sm border", abWinner === "A" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "border-[var(--border-default)] text-zinc-300 hover:bg-[var(--bg-hover)]")}
            >
              Pick A
            </button>
            <button
              type="button"
              onClick={() => { setSelectedVoiceId(abVoiceB); setAbWinner("B"); }}
              className={cn("px-3 py-2 rounded-xl text-sm border", abWinner === "B" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "border-[var(--border-default)] text-zinc-300 hover:bg-[var(--bg-hover)]")}
            >
              Pick B
            </button>
          </div>
        </div>
      </section>

      {/* Voice list */}
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">All voices</h2>
        <div className="grid gap-3">
          {CURATED_VOICES.map((voice) => (
            <div
              key={voice.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border",
                selectedVoiceId === voice.id
                  ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/5"
                  : "border-[var(--border-default)] bg-[var(--bg-input)]/30"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  disabled={playingId !== null}
                  onClick={() => void handlePlay(voice)}
                  className="p-2 rounded-lg bg-[var(--bg-hover)] text-white hover:bg-white/10 disabled:opacity-50 shrink-0"
                  aria-label={`Play ${voice.name}`}
                >
                  {playingId === voice.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{voice.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {voice.accent} · {voice.gender} · {voice.tone} · {voice.bestFor}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVoiceId(voice.id)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-lg border",
                    selectedVoiceId === voice.id
                      ? "bg-white text-black border-white"
                      : "border-[var(--border-default)] text-zinc-400 hover:text-white"
                  )}
                >
                  {selectedVoiceId === voice.id ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Apply to agent */}
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h2 className="text-sm font-semibold text-white mb-2">Apply to agent</h2>
        <p className="text-xs text-zinc-500 mb-3">
          {selectedVoiceId
            ? `Selected: ${CURATED_VOICES.find((v) => v.id === selectedVoiceId)?.name ?? selectedVoiceId}`
            : "Select a voice above to apply."}
        </p>
        <button
          type="button"
          disabled={!selectedVoiceId || applying}
          onClick={() => void handleApply()}
          className="px-4 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100 disabled:opacity-50 flex items-center gap-2"
        >
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Apply to agent
        </button>
      </section>
    </div>
  );
}
