"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Phone, User, Bot, Check } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

type DemoLine = { role: "ai" | "caller"; text: string };
type DemoScript = { title: string; lines: DemoLine[]; result: string; resultDetails: string[] };

const DEMO_SCRIPTS: DemoScript[] = [
  {
    title: "Inbound Lead (Plumber)",
    lines: [
      { role: "ai", text: "Thanks for calling Riverside Plumbing! This is Sarah. How can I help?" },
      { role: "caller", text: "Yeah hi, I've got a leak under my kitchen sink." },
      { role: "ai", text: "Oh no, let me get some info so we can get someone out quickly. What's your name?" },
      { role: "caller", text: "Mike Johnson." },
      { role: "ai", text: "Thanks Mike. Best phone number to reach you?" },
      { role: "caller", text: "503-555-0199." },
      { role: "ai", text: "Got it. And the property address?" },
      { role: "caller", text: "742 Elm Street, Portland." },
      { role: "ai", text: "Is this an active leak or more of a slow drip?" },
      { role: "caller", text: "Slow drip, but getting worse." },
      { role: "ai", text: "Understood. We have tomorrow at 10 AM or Thursday at 2 PM. Which works better?" },
      { role: "caller", text: "Tomorrow at 10." },
      { role: "ai", text: "Booked! Mike Johnson, tomorrow 10 AM, 742 Elm St, kitchen sink leak. Sending a text confirmation to 503-555-0199 now. Anything else?" },
      { role: "caller", text: "No, that's great." },
      { role: "ai", text: "We'll see you tomorrow morning Mike!" },
    ],
    result: "Lead captured and appointment booked.",
    resultDetails: [
      "Lead captured: Mike Johnson",
      "Phone: (503) 555-0199",
      "Address: 742 Elm St Portland",
      "Service: Kitchen sink leak repair",
      "Appointment: Tomorrow 10:00 AM",
      "Confirmation text sent",
      "Owner notified instantly",
      "Lead score: 92/100",
    ],
  },
  {
    title: "Appointment Booking (Dental)",
    lines: [
      { role: "ai", text: "Good morning, Maple Street Dental! This is Alex. How can I help?" },
      { role: "caller", text: "Hi, I'd like to schedule a cleaning." },
      { role: "ai", text: "Of course! Are you an existing patient?" },
      { role: "caller", text: "Yes, Sarah Chen." },
      { role: "ai", text: "Welcome back Sarah! Morning or afternoon preference?" },
      { role: "caller", text: "Mornings are better." },
      { role: "ai", text: "We have Tuesday at 9 AM or Wednesday at 10:30 with Dr. Martinez. Either work?" },
      { role: "caller", text: "Tuesday at 9." },
      { role: "ai", text: "You're booked — Tuesday 9 AM, Dr. Martinez, cleaning. I'll send a reminder the day before." },
      { role: "caller", text: "Thank you!" },
      { role: "ai", text: "See you Tuesday Sarah!" },
    ],
    result: "Appointment scheduled.",
    resultDetails: [
      "Patient identified: Sarah Chen (existing)",
      "Appointment: Tuesday 9:00 AM",
      "Provider: Dr. Martinez",
      "Service: Cleaning",
      "Calendar synced",
      "Reminder scheduled (Monday)",
    ],
  },
  {
    title: "Outbound Follow-up (Roofing)",
    lines: [
      { role: "ai", text: "Hi, is this James? This is Emma from Summit Roofing." },
      { role: "caller", text: "Uh yeah, who?" },
      { role: "ai", text: "Summit Roofing — you filled out a request on our website about 2 minutes ago about roof damage. I wanted to follow up right away." },
      { role: "caller", text: "Oh right yeah, we had storm damage last week." },
      { role: "ai", text: "I'm sorry to hear that. What are you seeing?" },
      { role: "caller", text: "Some shingles missing on the south side. Might be water getting in." },
      { role: "ai", text: "That needs attention soon. We can send an estimator out — would tomorrow at 3 PM work?" },
      { role: "caller", text: "Yeah, 3 works." },
      { role: "ai", text: "Great. Before they come, have you started an insurance claim?" },
      { role: "caller", text: "Not yet, was going to call them next." },
      { role: "ai", text: "Our estimator can help document everything for the claim. You're set for tomorrow at 3 PM James. I'll text a confirmation." },
      { role: "caller", text: "Perfect, thanks." },
    ],
    result: "Speed-to-lead follow-up completed.",
    resultDetails: [
      "Speed-to-lead: 2 minutes",
      "Contact: James (web form lead)",
      "Issue: Storm damage — missing shingles, south side",
      "Estimate scheduled: Tomorrow 3:00 PM",
      "Insurance: Not yet filed — estimator will assist",
      "Confirmation text sent",
      "Lead score: 95/100",
    ],
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
  onComplete: () => void;
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
    if (showResult && isActive) onComplete();
  }, [showResult, isActive, onComplete]);

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
        <div
          className="pt-4 border-t space-y-2"
          style={{ borderColor: "var(--border-default)" }}
        >
          <p
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--meaning-green)" }}
          >
            <Check className="w-4 h-4" />
            CALL SUMMARY: {script.result}
          </p>
          <ul
            className="text-xs space-y-1 pl-6"
            style={{ color: "var(--text-secondary)" }}
          >
            {script.resultDetails.map((d, i) => (
              <li key={i}>→ {d}</li>
            ))}
          </ul>
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

  const script =
    tab === "inbound"
      ? DEMO_SCRIPTS[0]
      : tab === "appointment"
        ? DEMO_SCRIPTS[1]
        : DEMO_SCRIPTS[2];

  const handleComplete = useCallback(() => setCompleted(true), []);
  const handleTabChange = (t: "inbound" | "appointment" | "outbound") => {
    setTab(t);
    setKey((k) => k + 1);
    setCompleted(false);
    setSkipCount(0);
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

