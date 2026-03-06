"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Phone, User, Bot } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

type DemoLine = { role: "ai" | "caller"; text: string };
type DemoScript = { title: string; lines: DemoLine[]; result: string; resultDetails: string[]; score?: number };

const DEMO_SCRIPTS: DemoScript[] = [
  {
    title: "Inbound Lead (Plumber)",
    lines: [
      { role: "ai", text: "Thanks for calling! How can I help you today?" },
      { role: "caller", text: "Yeah hi, I've got a leak under my kitchen sink." },
      { role: "ai", text: "I can help with that. Can I get your name?" },
      { role: "caller", text: "Mike Johnson." },
      { role: "ai", text: "Thanks Mike. Best number to reach you?" },
      { role: "caller", text: "503-555-0199." },
      { role: "ai", text: "And your address?" },
      { role: "caller", text: "742 Elm Street, Portland." },
      { role: "ai", text: "Is this an active leak or a slow drip?" },
      { role: "caller", text: "Slow drip, but it's getting worse." },
      { role: "ai", text: "Got it. I have tomorrow at 10 AM or Thursday at 2 PM available." },
      { role: "caller", text: "Tomorrow at 10 works." },
      { role: "ai", text: "Perfect! You're booked for tomorrow at 10 AM at 742 Elm St. I'll send a text confirmation right now." },
      { role: "caller", text: "Great, thanks." },
      { role: "ai", text: "See you tomorrow morning, Mike!" },
    ],
    result: "Lead captured and appointment booked.",
    resultDetails: [
      "Contact: Mike Johnson",
      "Phone: (503) 555-0199",
      "Address: 742 Elm St, Portland",
      "Issue: Kitchen sink leak — slow drip",
      "Appointment: Tomorrow 10:00 AM",
      "Text sent: Confirmation ✓",
      "Owner notified: Instantly ✓",
    ],
    score: 92,
  },
  {
    title: "Appointment Booking (Dental)",
    lines: [
      { role: "ai", text: "Good morning, Maple Street Dental! This is Alex. How can I help?" },
      { role: "caller", text: "Hi, I'd like to schedule a cleaning." },
      { role: "ai", text: "Of course! Are you an existing patient?" },
      { role: "caller", text: "Yes, Sarah Chen." },
      { role: "ai", text: "Welcome back, Sarah! Do you prefer mornings or afternoons?" },
      { role: "caller", text: "Mornings are better." },
      { role: "ai", text: "I have Tuesday at 9 AM or Wednesday at 10:30 with Dr. Martinez." },
      { role: "caller", text: "Tuesday at 9 please." },
      { role: "ai", text: "Booked! Tuesday at 9 AM with Dr. Martinez. You'll get a reminder on Monday." },
      { role: "caller", text: "Thank you!" },
      { role: "ai", text: "See you Tuesday, Sarah! Have a great day." },
    ],
    result: "Appointment scheduled.",
    resultDetails: [
      "Patient: Sarah Chen (existing)",
      "Service: Cleaning",
      "Provider: Dr. Martinez",
      "Appointment: Tuesday 9:00 AM",
      "Calendar synced: ✓",
      "Reminder: Monday ✓",
    ],
    score: 88,
  },
  {
    title: "Outbound Follow-up (Roofing)",
    lines: [
      { role: "ai", text: "Hi, is this James? This is Emma from Summit Roofing." },
      { role: "caller", text: "Uh, yeah?" },
      { role: "ai", text: "You submitted a request on our website about 2 minutes ago regarding roof damage. I wanted to follow up right away." },
      { role: "caller", text: "Oh right, yeah. We had storm damage last week." },
      { role: "ai", text: "I'm sorry to hear that. Can you describe what you're seeing?" },
      { role: "caller", text: "There are missing shingles on the south side of the house." },
      { role: "ai", text: "That definitely needs attention. We can send an estimator out tomorrow at 3 PM — would that work?" },
      { role: "caller", text: "Yeah, that works." },
      { role: "ai", text: "Great. Have you started an insurance claim yet?" },
      { role: "caller", text: "No, not yet." },
      { role: "ai", text: "No worries — our estimator can help document everything for your insurance claim while they're there." },
      { role: "caller", text: "Oh that's helpful, thanks." },
      { role: "ai", text: "Sending you a confirmation text now. See you tomorrow at 3, James!" },
    ],
    result: "Speed-to-lead follow-up completed.",
    resultDetails: [
      "Response time: 2 minutes",
      "Contact: James Wilson",
      "Issue: Storm damage — missing shingles, south side",
      "Appointment: Tomorrow 3:00 PM",
      "Insurance: Documentation flagged ✓",
      "Text sent: Confirmation ✓",
    ],
    score: 95,
  },
];

const TYPING_DELAY_MS = 1200;
const TYPING_INDICATOR_MS = 800;
const CHAR_DELAY_MS = 25;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function DemoTranscript({
  script,
  isActive,
  onComplete,
  skipCount,
  onSkip,
}: {
  script: DemoScript;
  isActive: boolean;
  onComplete: (elapsedSeconds: number) => void;
  skipCount: number;
  onSkip: () => void;
}) {
  const [visibleLines, setVisibleLines] = useState<{ index: number; text: string }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const reset = useCallback(() => {
    setVisibleLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setShowResult(false);
    setShowTyping(false);
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (!isActive) {
      reset();
      return;
    }
    setVisibleLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setShowResult(false);
    setShowTyping(script.lines[0]?.role === "ai");
    setElapsed(0);
  }, [isActive, script.title, reset, script.lines]);

  useEffect(() => {
    if (!isActive || showResult) return;
    // Demo call simulator: live timer is required by product spec (FIX 2 — "timer counts up from 0:00")
    // eslint-disable-next-line ui-doctrine/no-live-ui -- demo simulator only
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [isActive, showResult]);

  useEffect(() => {
    if (!showTyping) return;
    const t = setTimeout(() => setShowTyping(false), TYPING_INDICATOR_MS);
    return () => clearTimeout(t);
  }, [showTyping]);

  useEffect(() => {
    if (!isActive || showResult || currentLineIndex >= script.lines.length) return;
    const line = script.lines[currentLineIndex];
    const fullText = line?.text ?? "";
    if (line?.role === "ai" && showTyping) return;

    if (currentCharIndex < fullText.length) {
      const t = setTimeout(() => {
        setVisibleLines((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.index === currentLineIndex) {
            return [...prev.slice(0, -1), { index: currentLineIndex, text: fullText.slice(0, currentCharIndex + 1) }];
          }
          return [...prev, { index: currentLineIndex, text: fullText.slice(0, currentCharIndex + 1) }];
        });
        setCurrentCharIndex((c) => c + 1);
      }, CHAR_DELAY_MS);
      return () => clearTimeout(t);
    }

    const nextIndex = currentLineIndex + 1;
    if (nextIndex >= script.lines.length) {
      const t = setTimeout(() => setShowResult(true), TYPING_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCurrentLineIndex(nextIndex);
      setCurrentCharIndex(0);
      const nextLine = script.lines[nextIndex];
      if (nextLine?.role === "ai") setShowTyping(true);
    }, TYPING_DELAY_MS);
    return () => clearTimeout(t);
  }, [isActive, script.lines, currentLineIndex, currentCharIndex, showResult, showTyping]);

  useEffect(() => {
    if (showResult && isActive) onComplete(elapsed);
  }, [showResult, isActive, onComplete, elapsed]);

  useEffect(() => {
    if (!isActive || showResult || skipCount === 0) return;
    const line = script.lines[currentLineIndex];
    const fullText = line?.text ?? "";
    setVisibleLines((prev) => {
      const idx = prev.findIndex((p) => p.index === currentLineIndex);
      if (idx >= 0) return [...prev.slice(0, idx), { index: currentLineIndex, text: fullText }, ...prev.slice(idx + 1)];
      return [...prev, { index: currentLineIndex, text: fullText }];
    });
    setCurrentCharIndex(fullText.length);
  }, [skipCount, isActive, showResult, script.lines, currentLineIndex]);

  if (!isActive) return null;

  return (
    <div
      className="rounded-xl border p-4 md:p-6 space-y-4"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          <Phone className="w-4 h-4" />
          <span>Call in progress — {formatTimer(elapsed)}</span>
        </div>
        {!showResult && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium shrink-0"
            style={{ color: "var(--accent-primary)" }}
          >
            Skip to result →
          </button>
        )}
      </div>

      <div className="space-y-3 min-h-[220px]">
        {showTyping && (
          <div className="flex gap-2 items-center">
            <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-zinc-700/50">
              <Bot className="w-4 h-4 text-zinc-400" />
            </span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        {visibleLines.map(({ index, text }) => {
          const line = script.lines[index];
          if (!line) return null;
          const isAi = line.role === "ai";
          return (
            <div
              key={index}
              className="flex gap-2"
            >
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: isAi ? "var(--accent-primary-subtle)" : "var(--bg-elevated)" }}
              >
                {isAi ? (
                  <Bot
                    className="w-4 h-4"
                    style={{ color: "var(--accent-primary)" }}
                  />
                ) : (
                  <User
                    className="w-4 h-4"
                    style={{ color: "var(--text-secondary)" }}
                  />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  className="text-xs font-medium block mb-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isAi ? "AI Agent" : "Caller"}
                </span>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-primary)", lineHeight: 1.5 }}
                >
                  &ldquo;{text}
                  {currentLineIndex === index && currentCharIndex < line.text.length && (
                    <span
                      className="animate-pulse"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      |
                    </span>
                  )}
                  &rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {showResult && (
        <div className="mt-4 p-6 rounded-2xl bg-zinc-800/80 border border-zinc-700 animate-slide-up">
          <h3 className="text-lg font-semibold text-white mb-3">Call Complete — Results</h3>
          <div className="h-px bg-zinc-700 mb-4" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
            {script.resultDetails.map((d, i) => {
              const idx = d.indexOf(": ");
              const label = idx >= 0 ? d.slice(0, idx) : "";
              const value = idx >= 0 ? d.slice(idx + 2) : d;
              return (
                <div key={i}>
                  <span className="text-xs text-zinc-500 block">{label || "Detail"}</span>
                  <span className="text-sm text-white font-medium">{value}</span>
                </div>
              );
            })}
          </div>
          {script.score != null && (
            <>
              <div className="h-px bg-zinc-700 mb-3" />
              <p className="text-xs text-zinc-500 mb-1">Lead Score</p>
              <p className="text-green-400 font-bold text-lg">{script.score}</p>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${script.score}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {script.score >= 80 ? "High-quality lead" : script.score >= 60 ? "Qualified lead" : "Follow up"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function CallSimulator() {
  const [tab, setTab] = useState<"inbound" | "appointment" | "outbound">("inbound");
  const [key, setKey] = useState(0);
  const [_completed, setCompleted] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);

  const script =
    tab === "inbound"
      ? DEMO_SCRIPTS[0]
      : tab === "appointment"
        ? DEMO_SCRIPTS[1]
        : DEMO_SCRIPTS[2];

  const handleComplete = useCallback((elapsedSeconds: number) => {
    setCompleted(true);
    setCompletedSeconds(elapsedSeconds);
  }, []);
  const handleTabChange = (t: "inbound" | "appointment" | "outbound") => {
    setTab(t);
    setKey((k) => k + 1);
    setCompleted(false);
    setSkipCount(0);
    setCompletedSeconds(null);
  };

  return (
    <Container className="max-w-2xl">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["inbound", "appointment", "outbound"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabChange(t)}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              background: tab === t ? "var(--accent-primary-subtle)" : "var(--bg-surface)",
              borderColor: tab === t ? "var(--accent-primary)" : "var(--border-default)",
              color: tab === t ? "var(--accent-primary)" : "var(--text-secondary)",
            }}
          >
            {t === "inbound" ? "Inbound Lead" : t === "appointment" ? "Appointment" : "Follow-up"}
          </button>
        ))}
      </div>

      <DemoTranscript
        key={key}
        script={script}
        isActive={true}
        onComplete={handleComplete}
        skipCount={skipCount}
        onSkip={() => setSkipCount((c) => c + 1)}
      />

      {completedSeconds != null ? (
        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 text-center">
          <p className="text-sm text-zinc-400">
            That call took <span className="font-medium text-white">{completedSeconds} seconds</span>. Your AI handles this 24/7.
          </p>
        </div>
      ) : null}

      <section
        className="mt-12 pt-8 border-t text-center"
        style={{ borderColor: "var(--border-default)" }}
      >
        <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
          Ready?
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Start free — 5 minute setup. No credit card · 14-day trial
        </p>
        <Link
          href={ROUTES.START}
          className="btn-marketing-primary no-underline inline-block"
        >
          Start free — 5 minute setup →
        </Link>
      </section>
    </Container>
  );
}

