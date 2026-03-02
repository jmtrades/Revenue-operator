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
    title: "Inbound Lead",
    lines: [
      { role: "ai", text: "Good morning, Acme Plumbing! This is Sarah. How can I help you today?" },
      { role: "caller", text: "Hi, I've got a leaky faucet under my kitchen sink." },
      { role: "ai", text: "Oh no, I can definitely help with that. Can I get your name?" },
      { role: "caller", text: "Mike Johnson." },
      { role: "ai", text: "Thanks Mike. What's the best address for the service call?" },
      { role: "caller", text: "742 Elm Street, Portland." },
      { role: "ai", text: "Got it. And a good number to reach you?" },
      { role: "caller", text: "503-555-0199." },
      { role: "ai", text: "Perfect. Is this actively flooding, or more of a slow drip?" },
      { role: "caller", text: "Just a slow drip. Not an emergency." },
      { role: "ai", text: "Great. I have tomorrow morning at 10 AM or Thursday at 2 PM. What works best?" },
      { role: "caller", text: "Tomorrow at 10 is perfect." },
      { role: "ai", text: "You're all set. I'm sending you a confirmation text right now. Anything else I can help with?" },
      { role: "caller", text: "Nope, that's all. Thanks!" },
      { role: "ai", text: "Thank you Mike, we'll see you tomorrow." },
    ],
    result: "Lead captured and appointment booked.",
    resultDetails: [
      "Lead: Mike Johnson · (503) 555-0199",
      "Address: 742 Elm Street, Portland",
      "Service: Leak repair (non‑emergency)",
      "Appointment: Tomorrow 10:00 AM",
      "Confirmation text sent",
      "Owner notified via SMS + push",
      "Lead score: 92/100",
      "Added to your system automatically",
    ],
  },
  {
    title: "Appointment",
    lines: [
      { role: "ai", text: "Thank you for calling Bright Smile Dental, this is Alex. How can I help today?" },
      { role: "caller", text: "I need to schedule a cleaning." },
      { role: "ai", text: "Happy to help. Are you an existing patient?" },
      { role: "caller", text: "Yes, Sarah Chen." },
      { role: "ai", text: "Welcome back Sarah. Do you prefer mornings or afternoons?" },
      { role: "caller", text: "Mornings are best." },
      { role: "ai", text: "I have next Tuesday at 9 AM or Wednesday at 10:30 AM. Which works better?" },
      { role: "caller", text: "Tuesday at 9 works." },
      { role: "ai", text: "Perfect. You're booked with Dr. Martinez on Tuesday at 9 AM." },
      { role: "caller", text: "Great, thank you." },
      { role: "ai", text: "We’ll send a reminder the day before and a text when we’re ready for you. Anything else I can help with?" },
      { role: "caller", text: "No, that's everything." },
    ],
    result: "Existing patient appointment scheduled.",
    resultDetails: [
      "Patient matched: Sarah Chen",
      "Appointment: Tuesday 9:00 AM with Dr. Martinez",
      "Synced to Google/Outlook calendar",
      "Reminder scheduled the day before",
      "AI handled the entire intake without staff",
    ],
  },
  {
    title: "Outbound Follow‑up",
    lines: [
      { role: "ai", text: "Hi, this is Emma from Peak Roofing. Am I speaking with James?" },
      { role: "caller", text: "Yeah, this is James." },
      { role: "ai", text: "Great. I'm following up on the roof inspection request you just submitted on our website. Is now a good time?" },
      { role: "caller", text: "Wow, that was fast. Yeah, sure." },
      { role: "ai", text: "We try to call within a couple of minutes. Can you tell me a bit about what's going on with your roof?" },
      { role: "caller", text: "I've got some missing shingles after the storm last week." },
      { role: "ai", text: "Got it. Storm damage can be urgent. Would you like us to send an estimator out?" },
      { role: "caller", text: "Yes, please." },
      { role: "ai", text: "I have tomorrow at 11 AM or 3 PM. Which works better?" },
      { role: "caller", text: "3 PM." },
      { role: "ai", text: "Done. Our estimator Mike will be there tomorrow at 3 PM." },
      { role: "caller", text: "Perfect." },
      { role: "ai", text: "He can also help you start the insurance claim if you’d like. Anything else before I let you go?" },
      { role: "caller", text: "No, that’s all. Thanks." },
      { role: "ai", text: "Thank you James, we’ll take great care of you." },
    ],
    result: "Speed‑to‑lead outbound follow‑up completed.",
    resultDetails: [
      "New web lead called back in under 2 minutes",
      "Estimate scheduled for tomorrow at 3 PM",
      "Insurance assistance noted on the lead",
      "Lead score: 95/100",
      "Owner notified and calendar updated",
    ],
  },
];

const TYPING_DELAY_MS = 1200;
const CHAR_DELAY_MS = 25;

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

  const reset = useCallback(() => {
    setVisibleLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setShowResult(false);
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
  }, [isActive, script.title, reset]);

  useEffect(() => {
    if (!isActive || showResult || currentLineIndex >= script.lines.length) return;
    const line = script.lines[currentLineIndex];
    const fullText = line?.text ?? "";

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
    }, TYPING_DELAY_MS);
    return () => clearTimeout(t);
  }, [isActive, script.lines, currentLineIndex, currentCharIndex, showResult]);

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
          <span>Call in progress — 0:00</span>
        </div>
        {!showResult && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium shrink-0"
            style={{ color: "var(--accent-primary)" }}
          >
            Skip →
          </button>
        )}
      </div>

      <div className="space-y-3 min-h-[220px]">
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
  const [completed, setCompleted] = useState(false);
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
      <h1
        className="font-bold text-3xl md:text-4xl mb-2 text-center"
        style={{ letterSpacing: "-0.02em" }}
      >
        See Recall Touch in action
      </h1>
      <p
        className="text-center text-base mb-8"
        style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
      >
        Watch AI answer a real business call — live.
      </p>

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
            {t === "inbound" ? "Inbound Lead" : t === "appointment" ? "Appointment" : "Outbound Follow‑up"}
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
        <h2
          className="font-semibold text-lg mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Try it yourself
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Live phone demo coming soon. Get started free and set up your own AI in a few minutes.
        </p>
        <Link
          href={ROUTES.START}
          className="text-sm font-medium"
          style={{ color: "var(--accent-primary)" }}
        >
          Start free →
        </Link>
      </section>

      <section
        className="mt-12 pt-8 border-t text-center"
        style={{ borderColor: "var(--border-default)" }}
      >
        <h2
          className="font-semibold text-lg mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Ready to stop missing calls?
        </h2>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href={ROUTES.START}
            className="btn-marketing-primary btn-lg no-underline inline-block"
          >
            Start free — 5 minutes →
          </Link>
          <Link
            href={ROUTES.CONTACT}
            className="btn-marketing-ghost btn-lg no-underline inline-block"
          >
            Talk to a human →
          </Link>
        </div>
      </section>
    </Container>
  );
}

