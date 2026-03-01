"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { Phone, User, Bot, Check } from "lucide-react";

type DemoLine = { role: "ai" | "caller"; text: string };
type DemoScript = { title: string; lines: DemoLine[]; result: string; resultDetails: string[] };

const DEMO_SCRIPTS: DemoScript[] = [
  {
    title: "Inbound Lead",
    lines: [
      { role: "ai", text: "Thanks for calling Acme Plumbing, this is Sarah. How can I help you today?" },
      { role: "caller", text: "Yeah, I need someone to look at a leak under my kitchen sink. It's been dripping." },
      { role: "ai", text: "I can help with that! Let me get a few details. What's your address?" },
      { role: "caller", text: "742 Elm Street." },
      { role: "ai", text: "Got it. And what's the best number to reach you at?" },
      { role: "caller", text: "555-234-5678." },
      { role: "ai", text: "Perfect. We can have someone out tomorrow morning between 8 and 10. Does that work?" },
      { role: "caller", text: "Yes, that works." },
      { role: "ai", text: "You're all set. We'll send a text confirmation and the tech will call when they're on the way." },
    ],
    result: "Lead captured. Score: 87/100.",
    resultDetails: [
      "Text sent to caller with business info",
      "Owner notified via push + SMS",
      "Added to activity feed",
    ],
  },
  {
    title: "Appointment",
    lines: [
      { role: "ai", text: "Bright Smile Dental, this is Sarah. How can I help you?" },
      { role: "caller", text: "I'd like to schedule a cleaning." },
      { role: "ai", text: "Sure. Are you an existing patient or new to our office?" },
      { role: "caller", text: "Existing. James Cooper." },
      { role: "ai", text: "Found you, James. We have openings next Tuesday at 9 AM or Thursday at 2 PM. Which do you prefer?" },
      { role: "caller", text: "Tuesday at 9 works." },
      { role: "ai", text: "Tuesday, March 4 at 9 AM — you're booked. We'll send a reminder the day before and a text when we're ready for you." },
      { role: "caller", text: "Great, thanks." },
    ],
    result: "Appointment booked.",
    resultDetails: [
      "Confirmation text sent",
      "Calendar updated",
      "Reminder scheduled: Monday 2pm",
    ],
  },
  {
    title: "Outbound",
    lines: [
      { role: "ai", text: "Hi, this is Sarah calling from Acme Plumbing. You reached out about a kitchen sink leak earlier — is this still a good time?" },
      { role: "caller", text: "Oh yeah, thanks for calling back so fast." },
      { role: "ai", text: "No problem. We have a slot tomorrow morning between 8 and 10. Would that work for you?" },
      { role: "caller", text: "Yes, that's perfect." },
      { role: "ai", text: "You're all set. We'll send a confirmation text. The tech will call when they're on the way. Anything else?" },
      { role: "caller", text: "No, that's it. Thanks." },
    ],
    result: "Follow-up completed.",
    resultDetails: [
      "Called within 60 seconds of lead",
      "Appointment confirmed",
      "Confirmation text sent",
    ],
  },
];

const TYPING_DELAY_MS = 1500;
const CHAR_DELAY_MS = 25;

function DemoTranscript({ script, isActive, onComplete }: { script: DemoScript; isActive: boolean; onComplete: () => void }) {
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

  // Advance to next line after a delay when current line is fully shown
  useEffect(() => {
    if (!isActive || showResult || currentLineIndex >= script.lines.length) return;

    const line = script.lines[currentLineIndex];
    const fullText = line?.text ?? "";

    if (currentCharIndex < fullText.length) {
      const t = setTimeout(() => {
        setVisibleLines((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.index === currentLineIndex) {
            return [
              ...prev.slice(0, -1),
              { index: currentLineIndex, text: fullText.slice(0, currentCharIndex + 1) },
            ];
          }
          return [...prev, { index: currentLineIndex, text: fullText.slice(0, currentCharIndex + 1) }];
        });
        setCurrentCharIndex((c) => c + 1);
      }, CHAR_DELAY_MS);
      return () => clearTimeout(t);
    }

    // Line complete; wait then move to next line or show result
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

  if (!isActive) return null;

  return (
    <div className="rounded-xl border p-4 md:p-6 space-y-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
        <Phone className="w-4 h-4" />
        <span>Incoming call — (555) 234-5678</span>
      </div>

      <div className="space-y-3 min-h-[200px]">
        {visibleLines.map(({ index, text }) => {
          const line = script.lines[index];
          if (!line) return null;
          const isAi = line.role === "ai";
          return (
            <div key={index} className="flex gap-2">
              <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: isAi ? "var(--accent-primary-subtle)" : "var(--bg-elevated)" }}>
                {isAi ? <Bot className="w-4 h-4" style={{ color: "var(--accent-primary)" }} /> : <User className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium block mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {isAi ? "AI" : "Caller"}
                </span>
                <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.5 }}>
                  &ldquo;{text}
                  {currentLineIndex === index && currentCharIndex < line.text.length && (
                    <span className="animate-pulse" style={{ color: "var(--accent-primary)" }}>|</span>
                  )}
                  &rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {showResult && (
        <div className="pt-4 border-t space-y-2" style={{ borderColor: "var(--border-default)" }}>
          <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--meaning-green)" }}>
            <Check className="w-4 h-4" />
            RESULT: {script.result}
          </p>
          <ul className="text-xs space-y-1 pl-6" style={{ color: "var(--text-secondary)" }}>
            {script.resultDetails.map((d, i) => (
              <li key={i}>→ {d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [tab, setTab] = useState<"inbound" | "appointment" | "outbound">("inbound");
  const [key, setKey] = useState(0);
  const [completed, setCompleted] = useState(false);

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
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container className="max-w-2xl">
          <h1 className="font-bold text-3xl md:text-4xl mb-2 text-center" style={{ letterSpacing: "-0.02em" }}>
            Hear Recall Touch in action
          </h1>
          <p className="text-center text-base mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Simulated call. Messages appear as the AI and caller talk.
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
                {t === "inbound" ? "Inbound Lead" : t === "appointment" ? "Appointment" : "Outbound"}
              </button>
            ))}
          </div>

          <DemoTranscript key={key} script={script} isActive={true} onComplete={handleComplete} />

          <p className="text-center mt-8">
            <Link href={ROUTES.START} className="btn-marketing-primary btn-lg no-underline inline-block">
              Start free — takes 5 minutes →
            </Link>
          </p>
          <p className="mt-4 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            <Link href={ROUTES.CONTACT} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded" style={{ color: "var(--text-tertiary)" }}>
              Book a live walkthrough
            </Link>
          </p>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
