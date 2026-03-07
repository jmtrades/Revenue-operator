"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Square } from "lucide-react";

interface DemoConfig {
  publicKey: string | null;
  assistantId: string | null;
}

const SCENARIO_CHIPS = [
  "Schedule appointment",
  "Ask about pricing",
  "After-hours call",
];

const CONNECTION_TIMEOUT_MS = 15000;

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return "Voice call failed. Please try again.";
}

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
}

export function HomepageVoiceWidget() {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [suggestedPhrase, setSuggestedPhrase] = useState<string | null>(null);
  const vapiRef = useRef<{ start: (id: string) => Promise<unknown>; stop: () => void; on: (event: string, handler: (payload?: unknown) => void) => void } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/vapi/demo-config", { credentials: "include" })
      .then((r) => r.json())
      .then((data: DemoConfig) => setConfig(data))
      .catch(() => setConfig({ publicKey: null, assistantId: null }));
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const clearConnectionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startCall = useCallback(
    (phraseHint?: string) => {
      if (!config?.publicKey || !config?.assistantId) {
        setError("Voice demo not configured");
        return;
      }
      setError(null);
      setTranscript([]);
      setSuggestedPhrase(phraseHint ?? null);
      setLoading(true);
      clearConnectionTimeout();

      const finishWithError = (msg: string) => {
        clearConnectionTimeout();
        setError(msg);
        setLoading(false);
        setActive(false);
        vapiRef.current = null;
      };

      (async () => {
        const publicKey = config.publicKey;
        const assistantId = config.assistantId;
        if (!publicKey || !assistantId) return finishWithError("Voice demo not configured");
        try {
          const { default: Vapi } = await import("@vapi-ai/web");
          const client = new Vapi(publicKey) as {
            start: (id: string) => Promise<unknown>;
            stop: () => void;
            on: (event: string, handler: (payload?: unknown) => void) => void;
          };
          vapiRef.current = client;

          client.on("error", () => {
            finishWithError(getErrorMessage(null));
          });
          client.on("call-start", () => {
            clearConnectionTimeout();
            setActive(true);
            setLoading(false);
            setError(null);
          });
          client.on("call-end", () => {
            setActive(false);
            vapiRef.current = null;
          });
          client.on("message", (payload?: unknown) => {
            const data = payload as
              | {
                  role?: string;
                  transcript?: string;
                  text?: string;
                  transcriptType?: string;
                }
              | undefined;
            const text = data?.transcript ?? data?.text ?? "";
            if (!text || data?.transcriptType === "partial") return;
            const role = data?.role === "assistant" ? "assistant" : "user";
            setTranscript((prev) => [...prev, { role, text }]);
          });

          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            finishWithError("Connection timed out. Try again.");
          }, CONNECTION_TIMEOUT_MS);

          await client.start(assistantId);
        } catch (err) {
          finishWithError(
            err instanceof Error ? err.message : "Could not start voice call."
          );
        }
      })();
    },
    [config, clearConnectionTimeout]
  );

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setActive(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      vapiRef.current?.stop();
    };
  }, []);

  const configured = Boolean(config?.publicKey && config?.assistantId);

  return (
    <div className="flex flex-col">
      <h3 className="text-base font-semibold text-white mb-1">Talk to our AI</h3>
      <p className="text-sm text-white/40 mb-5">
        Tap the mic and ask anything. This is a real AI agent.
      </p>

      {/* Voice orb */}
      <div className="flex justify-center mb-5">
        {!configured && config !== null ? (
          <p className="text-xs text-white/40 text-center py-6">
            Voice demo — configure in app
          </p>
        ) : active ? (
          <button
            type="button"
            onClick={endCall}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
            aria-label="End call"
          >
            <Square className="h-8 w-8 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startCall()}
            disabled={loading}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-100 disabled:opacity-60 transition-colors"
            aria-label="Start voice call"
          >
            <Mic className="h-9 w-9" />
          </button>
        )}
      </div>

      {suggestedPhrase && (active || transcript.length > 0) && (
        <p className="text-xs text-white/40 mb-2 text-center">
          Try: &ldquo;{suggestedPhrase}&rdquo;
        </p>
      )}

      {/* Scenario chips */}
      <p className="text-xs text-white/40 mb-2">Or try a scenario:</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SCENARIO_CHIPS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => startCall(label)}
            disabled={!configured || loading}
            className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/50 hover:text-white/70 hover:border-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Compact transcript */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 h-32 overflow-y-auto text-sm">
        {transcript.length === 0 ? (
          <p className="text-white/25 text-center mt-6">Tap the mic to start</p>
        ) : (
          <div className="space-y-2">
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={entry.role === "user" ? "text-right" : "text-left"}
              >
                <span className="text-white/40 text-[11px] mr-1">
                  {entry.role === "user" ? "You" : "AI"}:
                </span>
                <span className="text-white/80">{entry.text}</span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
