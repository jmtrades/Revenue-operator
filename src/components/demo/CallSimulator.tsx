"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Phone, User, Bot } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

type DemoLine = { role: "ai" | "caller"; text: string };
type DemoScript = { title: string; lines: DemoLine[]; result: string; resultDetails: string[]; score?: number };

function buildScripts(t: (key: string) => string): DemoScript[] {
  const line = (script: number, index: number) => t(`simulator.script${script}Line${index}`);
  const detail = (script: number, index: number) => t(`simulator.script${script}Detail${index}`);
  return [
    {
      title: t("simulator.script0Title"),
      lines: [
        { role: "ai", text: line(0, 0) },
        { role: "caller", text: line(0, 1) },
        { role: "ai", text: line(0, 2) },
        { role: "caller", text: line(0, 3) },
        { role: "ai", text: line(0, 4) },
        { role: "caller", text: line(0, 5) },
        { role: "ai", text: line(0, 6) },
        { role: "caller", text: line(0, 7) },
        { role: "ai", text: line(0, 8) },
        { role: "caller", text: line(0, 9) },
        { role: "ai", text: line(0, 10) },
        { role: "caller", text: line(0, 11) },
        { role: "ai", text: line(0, 12) },
        { role: "caller", text: line(0, 13) },
        { role: "ai", text: line(0, 14) },
      ],
      result: t("simulator.script0Result"),
      resultDetails: [detail(0, 0), detail(0, 1), detail(0, 2), detail(0, 3), detail(0, 4), detail(0, 5), detail(0, 6)],
      score: 92,
    },
    {
      title: t("simulator.script1Title"),
      lines: [
        { role: "ai", text: line(1, 0) },
        { role: "caller", text: line(1, 1) },
        { role: "ai", text: line(1, 2) },
        { role: "caller", text: line(1, 3) },
        { role: "ai", text: line(1, 4) },
        { role: "caller", text: line(1, 5) },
        { role: "ai", text: line(1, 6) },
        { role: "caller", text: line(1, 7) },
        { role: "ai", text: line(1, 8) },
        { role: "caller", text: line(1, 9) },
        { role: "ai", text: line(1, 10) },
      ],
      result: t("simulator.script1Result"),
      resultDetails: [detail(1, 0), detail(1, 1), detail(1, 2), detail(1, 3), detail(1, 4), detail(1, 5)],
      score: 88,
    },
    {
      title: t("simulator.script2Title"),
      lines: [
        { role: "ai", text: line(2, 0) },
        { role: "caller", text: line(2, 1) },
        { role: "ai", text: line(2, 2) },
        { role: "caller", text: line(2, 3) },
        { role: "ai", text: line(2, 4) },
        { role: "caller", text: line(2, 5) },
        { role: "ai", text: line(2, 6) },
        { role: "caller", text: line(2, 7) },
        { role: "ai", text: line(2, 8) },
        { role: "caller", text: line(2, 9) },
        { role: "ai", text: line(2, 10) },
        { role: "caller", text: line(2, 11) },
        { role: "ai", text: line(2, 12) },
      ],
      result: t("simulator.script2Result"),
      resultDetails: [detail(2, 0), detail(2, 1), detail(2, 2), detail(2, 3), detail(2, 4), detail(2, 5)],
      score: 95,
    },
  ];
}

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
  forceShowResult,
}: {
  script: DemoScript;
  isActive: boolean;
  onComplete: (elapsedSeconds: number) => void;
  skipCount: number;
  onSkip: () => void;
  forceShowResult: boolean;
}) {
  const t = useTranslations("hero");
  const [visibleLines, setVisibleLines] = useState<{ index: number; text: string }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (forceShowResult) setShowResult(true);
  }, [forceShowResult]);

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
      setStarted(false);
      return;
    }
    const t = window.setTimeout(() => setStarted(true), 150);
    return () => window.clearTimeout(t);
  }, [isActive, reset]);

  useEffect(() => {
    if (!isActive || !started) return;
    setVisibleLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setShowResult(false);
    setShowTyping(script.lines[0]?.role === "ai");
    setElapsed(0);
  }, [isActive, started, script.title, script.lines]);

  useEffect(() => {
    if (!isActive || !started || showResult) return;
    // Demo call simulator: live timer counts up from 0:00
     
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [isActive, started, showResult]);

  useEffect(() => {
    if (!showTyping) return;
    const t = setTimeout(() => setShowTyping(false), TYPING_INDICATOR_MS);
    return () => clearTimeout(t);
  }, [showTyping]);

  useEffect(() => {
    if (!isActive || !started || showResult || currentLineIndex >= script.lines.length) return;
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
  }, [isActive, started, script.lines, currentLineIndex, currentCharIndex, showResult, showTyping]);

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
          <span>{t("simulator.callInProgress")}{formatTimer(elapsed)}</span>
        </div>
        {!showResult && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium shrink-0"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("simulator.skipToResult")}
          </button>
        )}
      </div>

      <div className="space-y-3 min-h-[220px]">
        {(!started || showTyping) && (
          <div className="flex gap-2 items-center">
            <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-inset)]/50">
              <Bot className="w-4 h-4 text-[var(--text-tertiary)]" />
            </span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--bg-inset)] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-[var(--bg-inset)] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-[var(--bg-inset)] animate-bounce" style={{ animationDelay: "300ms" }} />
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
                  {isAi ? t("simulator.aiAgent") : t("simulator.caller")}
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
        <div className="mt-4 p-6 rounded-2xl bg-[var(--bg-inset)]/80 border border-[var(--border-default)] animate-slide-up">
          <h3 className="text-lg font-semibold text-white mb-3">{t("simulator.resultsHeading")}</h3>
          <div className="h-px bg-[var(--bg-inset)] mb-4" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
            {script.resultDetails.map((d, i) => {
              const idx = d.indexOf(": ");
              const label = idx >= 0 ? d.slice(0, idx) : "";
              const value = idx >= 0 ? d.slice(idx + 2) : d;
              return (
                <div key={i}>
                  <span className="text-xs text-[var(--text-tertiary)] block">{label || t("simulator.detailLabel")}</span>
                  <span className="text-sm text-white font-medium">{value}</span>
                </div>
              );
            })}
          </div>
          {script.score != null && (
            <>
              <div className="h-px bg-[var(--bg-inset)] mb-3" />
              <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("simulator.leadScore")}</p>
              <p className="text-green-400 font-bold text-lg">{script.score}</p>
              <div className="h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-green-500 transition-[width]"
                  style={{ width: `${script.score}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {script.score >= 80 ? t("simulator.highQualityLead") : script.score >= 60 ? t("simulator.qualifiedLead") : t("simulator.followUp")}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function CallSimulator() {
  const t = useTranslations("hero");
  const scripts = useMemo(() => buildScripts(t), [t]);
  const [tab, setTab] = useState<"inbound" | "appointment" | "outbound">("inbound");
  const [key, setKey] = useState(0);
  const [_completed, setCompleted] = useState(false);
  const [skipToResult, setSkipToResult] = useState(false);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);

  const script =
    tab === "inbound"
      ? scripts[0]
      : tab === "appointment"
        ? scripts[1]
        : scripts[2];

  const handleComplete = useCallback((elapsedSeconds: number) => {
    setCompleted(true);
    setCompletedSeconds(elapsedSeconds);
  }, []);
  const handleTabChange = (t: "inbound" | "appointment" | "outbound") => {
    setTab(t);
    setKey((k) => k + 1);
    setCompleted(false);
    setSkipToResult(false);
    setCompletedSeconds(null);
  };
  const handleSkipToResult = useCallback(() => setSkipToResult(true), []);

  return (
    <Container className="max-w-2xl">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["inbound", "appointment", "outbound"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => handleTabChange(tabKey)}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              background: tab === tabKey ? "var(--accent-primary-subtle)" : "var(--bg-surface)",
              borderColor: tab === tabKey ? "var(--accent-primary)" : "var(--border-default)",
              color: tab === tabKey ? "var(--accent-primary)" : "var(--text-secondary)",
            }}
          >
            {tabKey === "inbound" ? t("simulator.tabInbound") : tabKey === "appointment" ? t("simulator.tabAppointment") : t("simulator.tabFollowUp")}
          </button>
        ))}
      </div>

      <DemoTranscript
        key={key}
        script={script}
        isActive={true}
        onComplete={handleComplete}
        skipCount={0}
        onSkip={handleSkipToResult}
        forceShowResult={skipToResult}
      />

      {completedSeconds != null ? (
        <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">
            {t("simulator.thatCallTook", { seconds: completedSeconds })}
          </p>
        </div>
      ) : null}

      <section
        className="mt-12 pt-8 border-t text-center"
        style={{ borderColor: "var(--border-default)" }}
      >
        <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
          {t("simulator.readyHeading")}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {t("simulator.readySubtext")}
        </p>
        <Link
          href={ROUTES.START}
          className="btn-marketing-blue no-underline inline-block"
        >
          {t("simulator.ctaStartFree")}
        </Link>
      </section>
    </Container>
  );
}

