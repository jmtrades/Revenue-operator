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
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const m = o.message ?? o.error ?? o.reason;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (typeof o.code === "string" && o.code.trim()) return `Connection failed (${o.code}). Try again.`;
  }
  return "Couldn't connect. Check your connection and try again.";
}

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
}

export function HomepageVoiceWidget() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    // NEXT_PUBLIC_ env vars are inlined at build; this reflects whether a public Vapi key is configured.
    setConfigured(Boolean(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY));
  }, []);

  if (configured === null) {
    return (
      <div className="bg-[var(--bg-card,#161B22)] border border-[var(--border-default,rgba(255,255,255,0.08))] rounded-2xl p-6 min-h-[320px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!configured) {
    return <StaticConversationDemo />;
  }

  return <LiveVoiceWidget />;
}

function LiveVoiceWidget() {
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
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Config unavailable"))))
      .then((data: DemoConfig) => setConfig(data ?? { publicKey: null, assistantId: null }))
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
        setError("Agent isn't ready yet.");
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
        if (!publicKey || !assistantId) return finishWithError("Agent isn't ready yet.");
        try {
          const { default: Vapi } = await import("@vapi-ai/web");
          const client = new Vapi(publicKey) as {
            start: (id: string) => Promise<unknown>;
            stop: () => void;
            on: (event: string, handler: (payload?: unknown) => void) => void;
          };
          vapiRef.current = client;

          client.on("error", (payload?: unknown) => {
            const msg =
              payload && typeof payload === "object" && payload !== null && "message" in payload
                ? String((payload as { message?: unknown }).message || "").trim()
                : "";
            // Use the richer helper so Vapi error codes / reasons surface in the UI
            finishWithError(msg || getErrorMessage(payload));
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
            finishWithError("Connection timed out.");
          }, CONNECTION_TIMEOUT_MS);

          await client.start(assistantId);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : typeof err === "string" ? err : "";
          finishWithError(msg.trim() || getErrorMessage(err));
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
  const configLoading = config === null;

  return (
    <div className="flex flex-col">
      <h3 className="text-base font-semibold text-white mb-1">Try it right now — ask anything</h3>
      <p className="text-sm text-white/40 mb-5">
        Tap the mic to start a real conversation.
      </p>

      {/* Voice orb */}
      <div className="flex justify-center mb-5">
        {configLoading ? (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.06] animate-pulse"
            aria-hidden
          >
            <Mic className="h-9 w-9 text-white/30" />
          </div>
        ) : !configured ? (
          <div className="text-center py-4">
            <p className="text-xs text-white/40 mb-3">
              Your own agent is one click away.
            </p>
            <a
              href="/activate"
              className="inline-flex items-center justify-center rounded-xl bg-white text-black font-semibold text-sm px-4 py-2 hover:bg-zinc-100 transition-colors no-underline"
            >
              Start free →
            </a>
          </div>
        ) : active ? (
          <button
            type="button"
            onClick={endCall}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
            aria-label="End call"
          >
            <Square className="h-8 w-8 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startCall()}
            disabled={loading}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-100 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
            aria-label={loading ? "Connecting…" : "Speak to agent"}
          >
            {loading ? (
              <span className="flex h-6 w-6 animate-spin rounded-full border-2 border-[var(--bg-base)] border-t-transparent" aria-hidden />
            ) : (
              <Mic className="h-9 w-9" />
            )}
          </button>
        )}
      </div>

      {configured && suggestedPhrase && (active || transcript.length > 0) && (
        <p className="text-xs text-white/40 mb-2 text-center">
          Try: &ldquo;{suggestedPhrase}&rdquo;
        </p>
      )}

      {/* Scenario chips — only when voice is configured */}
      {configured && (
        <>
          <p className="text-xs font-medium text-white/60 mb-2">Ask anything, e.g.:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SCENARIO_CHIPS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => startCall(label)}
                disabled={loading}
                className="text-sm bg-white/[0.06] border border-white/[0.12] rounded-xl px-3.5 py-2 text-white/70 hover:text-white hover:bg-white/[0.1] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Compact transcript */}
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 h-32 overflow-y-auto text-sm"
        aria-live="polite"
        aria-label="Live transcript"
      >
        {transcript.length === 0 ? (
          <p className="text-white/25 text-center mt-6">
            {configured ? "Tap the mic to talk" : "Your conversation will appear here"}
          </p>
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
        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-xs text-red-400 text-center" role="alert">
            {error}
          </p>
          {configured && (
            <button
              type="button"
              onClick={() => { setError(null); startCall(); }}
              className="text-xs font-medium text-white/60 hover:text-white transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StaticConversationDemo() {
  const [visibleLines, setVisibleLines] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= 6) {
          clearInterval(interval);
          return 6;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const lines = [
    { speaker: "Caller", text: '"Hi, I\'d like to schedule an appointment for Thursday."' },
    {
      speaker: "AI Agent",
      text: '"Of course! I have openings at 10 AM, 2 PM, and 4 PM on Thursday. Which works best?"',
    },
    { speaker: "Caller", text: '"2 PM sounds perfect."' },
    {
      speaker: "AI Agent",
      text: '"Great, I\'ve booked you for Thursday at 2 PM. Can I get your name and phone number?"',
    },
    { speaker: "Caller", text: '"Sarah, 555-0142."' },
    {
      speaker: "AI Agent",
      text: '"You\'re all set, Sarah! You\'ll get a confirmation text shortly. Anything else I can help with?"',
    },
  ];

  return (
    <div className="bg-[var(--bg-card,#161B22)] border border-[var(--border-default,rgba(255,255,255,0.08))] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h3 className="text-base font-semibold text-[var(--text-primary,rgba(255,255,255,0.95))]">
          Live conversation preview
        </h3>
      </div>
      <p className="text-sm text-[var(--text-secondary,rgba(255,255,255,0.6))] mb-5">
        This is how your AI handles a real call.
      </p>

      <div className="space-y-3">
        {lines.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 animate-fadeIn ${
              line.speaker === "Caller"
                ? "bg-white/[0.04] ml-0 mr-8"
                : "bg-[var(--accent-primary-subtle,rgba(79,140,255,0.1))] border border-[var(--border-accent,rgba(79,140,255,0.5))] ml-8 mr-0"
            }`}
          >
            <p
              className={`text-xs font-medium mb-0.5 ${
                line.speaker === "Caller" ? "text-white/40" : "text-[var(--accent-primary,#4F8CFF)]"
              }`}
            >
              {line.speaker}
            </p>
            <p className="text-sm text-[var(--text-primary,rgba(255,255,255,0.95))]">{line.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <a
          href="/sign-in?create=1"
          className="px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors no-underline"
        >
          Build yours free →
        </a>
        <span className="text-xs text-[var(--text-tertiary,rgba(255,255,255,0.35))]">
          No credit card required
        </span>
      </div>
    </div>
  );
}
