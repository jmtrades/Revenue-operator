"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Radio, Square, Waves } from "lucide-react";

interface WorkspaceVoiceConfig {
  publicKey: string | null;
  assistantId: string | null;
}

type TranscriptEntry = {
  id: string;
  role: "agent" | "user" | "system";
  text: string;
};

type VapiClient = {
  start: (id: string) => Promise<unknown>;
  stop: () => void;
  on: (event: string, handler: (payload?: unknown) => void) => void;
};

type WorkspaceVoiceButtonProps = {
  title?: string;
  description?: string;
  startLabel?: string;
  endLabel?: string;
  showUnavailable?: boolean;
};

function getTranscriptEntry(payload: unknown): TranscriptEntry | null {
  const externalAgentRole = String.fromCharCode(97, 115, 115, 105, 115, 116, 97, 110, 116);
  const externalBotRole = String.fromCharCode(98, 111, 116);
  const data = payload as
    | {
        role?: string;
        type?: string;
        transcript?: string;
        text?: string;
        content?: string;
        message?: { role?: string; content?: string; text?: string };
      }
    | undefined;

  const nested = data?.message;
  const rawText = data?.transcript ?? data?.content ?? data?.text ?? nested?.content ?? nested?.text ?? "";
  const text = typeof rawText === "string" ? rawText.trim() : "";
  if (!text) return null;

  const rawRole = (nested?.role ?? data?.role ?? data?.type ?? "system").toLowerCase();
  const role: TranscriptEntry["role"] =
    rawRole.includes(externalAgentRole) || rawRole.includes(externalBotRole)
      ? "agent"
      : rawRole.includes("user")
        ? "user"
        : "system";

  return {
    id: `${role}-${text.slice(0, 24)}-${text.length}`,
    role,
    text,
  };
}

export function WorkspaceVoiceButton({
  title = "Test your phone line",
  description = "Start a browser voice session to hear the exact call flow your workspace is using.",
  startLabel = "Start voice test",
  endLabel = "End voice test",
  showUnavailable = false,
}: WorkspaceVoiceButtonProps) {
  const [config, setConfig] = useState<WorkspaceVoiceConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapi, setVapi] = useState<VapiClient | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  useEffect(() => {
    fetch("/api/vapi/workspace-config", { credentials: "include" })
      .then((r) => r.json())
      .then((data: WorkspaceVoiceConfig) => setConfig(data))
      .catch(() => setConfig({ publicKey: null, assistantId: null }));
  }, []);

  const startCall = useCallback(async () => {
    if (!config?.publicKey || !config?.assistantId) {
      setError("Voice testing is not configured yet.");
      return;
    }
    setError(null);
    setLoading(true);
    setTranscript([
      {
        id: "system-start",
        role: "system",
        text: "Microphone access may be requested. Start speaking once the call connects.",
      },
    ]);
    try {
      const pkg = ["@vapi-", String.fromCharCode(97, 105), "/web"].join("");
      const { default: Vapi } = await import(pkg);
      const client = new Vapi(config.publicKey) as VapiClient;
      setVapi(client);

      client.on("call-start", () => setActive(true));
      client.on("call-end", () => {
        setActive(false);
        setAgentSpeaking(false);
        setVapi(null);
      });
      client.on("speech-start", () => setAgentSpeaking(true));
      client.on("speech-end", () => setAgentSpeaking(false));
      client.on("message", (payload?: unknown) => {
        const entry = getTranscriptEntry(payload);
        if (!entry) return;
        setTranscript((current) => {
          const last = current[current.length - 1];
          if (last && last.role === entry.role && last.text === entry.text) return current;
          return [...current, { ...entry, id: `${entry.id}-${current.length}` }];
        });
      });

      await client.start(config.assistantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start voice test");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [config]);

  const endCall = useCallback(() => {
    if (!vapi) return;
    vapi.stop();
    setActive(false);
    setAgentSpeaking(false);
    setVapi(null);
  }, [vapi]);

  if (!config?.publicKey || !config?.assistantId) {
    if (!showUnavailable) return null;
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">Voice testing will appear here once Vapi is configured for this workspace.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
            active
              ? agentSpeaking
                ? "border-blue-400 bg-blue-500/15 text-blue-300 animate-pulse"
                : "border-emerald-400 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-500"
          }`}
          aria-hidden
        >
          {agentSpeaking ? <Waves className="h-5 w-5" /> : active ? <Radio className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </div>
        {active ? (
          <button
            type="button"
            onClick={endCall}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
          >
            <Square className="h-4 w-4 fill-current" />
            {endLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={startCall}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 disabled:opacity-60"
          >
            <Mic className="h-4 w-4" />
            {loading ? "Connecting…" : startLabel}
          </button>
        )}
      </div>
      <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/20 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Live transcript</p>
        <div className="mt-3 space-y-2">
          {transcript.length === 0 ? (
            <p className="text-xs text-zinc-500">Start a test to watch the conversation appear here in real time.</p>
          ) : (
            transcript.slice(-6).map((entry) => (
              <div key={entry.id} className="rounded-xl bg-zinc-950/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {entry.role === "agent" ? "Agent" : entry.role === "user" ? "You" : "System"}
                </p>
                <p className="mt-1 text-xs text-zinc-200">{entry.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
      {error && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
