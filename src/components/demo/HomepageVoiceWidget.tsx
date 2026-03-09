// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";

type DemoMode = "mic" | "connecting" | "active" | "static-fallback";

export function HomepageVoiceWidget() {
  const [mode, setMode] = useState<DemoMode>("mic");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vapiRef = useRef<{ stop: () => void } | null>(null);

  function clearConnectionTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  async function handleMicClick() {
    // Immediately show connecting state so the button never feels dead
    setMode("connecting");

    // 5s timeout → auto-fallback to static conversation
    clearConnectionTimeout();
    timeoutRef.current = setTimeout(() => {
      console.warn("[HomepageVoiceWidget] Connection timed out after 5s — falling back to static demo");
      setMode("static-fallback");
    }, 5000);

    try {
      const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      if (!vapiKey) {
        clearConnectionTimeout();
        setMode("static-fallback");
        return;
      }

      const { default: Vapi } = await import("@vapi-ai/web");
      const client = new Vapi(vapiKey) as { start: (id: string) => Promise<unknown>; stop: () => void; on: (event: string, handler: (payload?: unknown) => void) => void };
      vapiRef.current = client;

      let assistantId: string | undefined;
      try {
        const res = await fetch("/api/agent/demo-assistant", { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as { assistantId?: string | null };
          if (data?.assistantId) assistantId = data.assistantId;
        }
      } catch {
        // ignore; will fall back below
      }

      if (!assistantId) {
        clearConnectionTimeout();
        setMode("static-fallback");
        return;
      }

      client.on("call-start", () => {
        clearConnectionTimeout();
        setMode("active");
      });
      client.on("call-end", () => {
        setMode("mic");
        vapiRef.current = null;
      });
      client.on("error", () => {
        clearConnectionTimeout();
        setMode("static-fallback");
        vapiRef.current = null;
      });

      await client.start(assistantId);
    } catch (err) {
      console.error("[HomepageVoiceWidget] Failed to start demo call", err);
      clearConnectionTimeout();
      setMode("static-fallback");
    }
  }

  useEffect(() => {
    return () => {
      clearConnectionTimeout();
      vapiRef.current?.stop();
    };
  }, []);

  if (mode === "static-fallback") {
    return <StaticConversationDemo />;
  }

  if (mode === "connecting" || mode === "active") {
    return (
      <div className="bg-[var(--bg-card,#161B22)] border border-[var(--border-default,rgba(255,255,255,0.08))] rounded-2xl p-6 text-center">
        <h3 className="text-base font-semibold text-[var(--text-primary,rgba(255,255,255,0.95))] mb-4">
          {mode === "connecting" ? "Connecting to AI agent..." : "Call in progress"}
        </h3>
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse mb-4">
          <svg
            className="w-7 h-7 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-secondary,rgba(255,255,255,0.6))]">
          {mode === "connecting"
            ? "Setting up your demo call..."
            : "You can keep browsing while your AI handles the call."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card,#161B22)] border border-[var(--border-default,rgba(255,255,255,0.08))] rounded-2xl p-6">
      <h3 className="text-base font-semibold text-[var(--text-primary,rgba(255,255,255,0.95))] mb-1">
        Try it right now — ask anything
      </h3>
      <p className="text-sm text-[var(--text-secondary,rgba(255,255,255,0.6))] mb-4">
        Tap the mic to start a real conversation.
      </p>
      <div className="flex justify-center mb-4">
        <button
          type="button"
          onClick={handleMicClick}
          className="w-16 h-16 rounded-full bg-[var(--bg-hover,#1F2937)] border border-[var(--border-medium,rgba(255,255,255,0.12))] flex items-center justify-center hover:bg-[var(--accent-blue,#3B82F6)]/20 hover:border-[var(--accent-blue,#3B82F6)]/40 transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50"
          aria-label="Start voice demo"
        >
          <svg
            className="w-7 h-7 text-[var(--text-primary,rgba(255,255,255,0.95))]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-14 0"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18v4m0 0H9m3 0h3"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs text-[var(--text-tertiary,rgba(255,255,255,0.35))] text-center mb-3">Ask anything, e.g.:</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {["Schedule appointment", "Ask about pricing", "After-hours call"].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={handleMicClick}
            className="px-3 py-1.5 text-xs border border-[var(--border-default,rgba(255,255,255,0.08))] rounded-full text-[var(--text-secondary,rgba(255,255,255,0.6))] hover:bg-white/[0.04] transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function StaticConversationDemo() {
  const [visibleLines, setVisibleLines] = useState(1);

  useEffect(() => {
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    const maxLines = 6;
    const delayMs = 1200;

    for (let i = 2; i <= maxLines; i += 1) {
      const handle = setTimeout(() => {
        setVisibleLines((prev) => (prev >= i ? prev : i));
      }, delayMs * (i - 1));
      timeouts.push(handle);
    }

    return () => {
      for (const id of timeouts) clearTimeout(id);
    };
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
