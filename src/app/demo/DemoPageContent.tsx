"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";
import { LiveAgentChat } from "@/components/LiveAgentChat";
import { DemoVoiceButton } from "@/components/demo/DemoVoiceButton";
import { ROUTES } from "@/lib/constants";

const SCENARIO_KEYS = ["scenario1", "scenario2", "scenario3", "scenario4", "scenario5"] as const;

export function DemoPageContent() {
  const t = useTranslations("demoPage");
  const chatRef = useRef<{ send: (text: string) => void } | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 text-center mb-8">
        <h1 className="font-bold text-3xl md:text-4xl mb-2" style={{ letterSpacing: "-0.02em" }}>
          {t("title")}
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {t("subtitle")}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-8 items-start">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 flex flex-col items-center gap-4">
          <div className="w-32 h-56 rounded-3xl border-2 border-[var(--border-medium)] bg-[var(--bg-card)] flex flex-col items-center justify-center gap-3 p-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl" aria-hidden>
              <Mic className="h-5 w-5 text-zinc-300" />
            </div>
            <p className="text-[10px] text-zinc-500 text-center">{t("tapMic")}</p>
          </div>
          <DemoVoiceButton />
          <p className="text-xs text-zinc-500 text-center">{t("orTryScenario")}</p>
          <div className="flex flex-wrap justify-center gap-2 w-full">
            {SCENARIO_KEYS.map((key) => {
              const label = t(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chatRef.current?.send(label)}
                  aria-label={`Try scenario: ${label}`}
                  className="rounded-full border border-[var(--border-medium)] bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-[var(--border-default)] flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">{t("liveTranscript")}</span>
          </div>
          <LiveAgentChat
            ref={chatRef}
            variant="demo"
            initialAgent="sarah"
            showMic
            greeting={t("greeting")}
            onUserMessage={() => setMessageCount((c) => c + 1)}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">{t("voiceStyle")}</p>
        <p className="text-sm text-zinc-400 mb-4">{t("voiceStyleHelp")}</p>
      </div>

      {messageCount >= 3 && (
        <div className="max-w-5xl mx-auto px-4 mt-8 rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-card)]/80 p-6">
          <h3 className="font-semibold text-white mb-3">{t("whatJustHappened")}</h3>
          <p className="text-sm text-zinc-400 mb-2">{t("whatJustHappenedDesc")}</p>
          <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside mb-4">
            <li>{t("bullet1")}</li>
            <li>{t("bullet2")}</li>
            <li>{t("bullet3")}</li>
          </ul>
          <Link
            href={ROUTES.START}
            className="inline-flex items-center justify-center rounded-xl bg-white text-black font-semibold px-5 py-2.5 text-sm hover:bg-zinc-100"
          >
            {t("setThisUp")}
          </Link>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 mt-8 text-center">
        <p className="text-sm text-zinc-500 mb-2">{t("voiceWidgetHint")}</p>
        <Link href={ROUTES.START} className="text-sm font-medium text-zinc-300 hover:text-white transition-colors" aria-label={t("getThisForYourNumber")}>
          {t("getThisForYourNumber")}
        </Link>
      </div>
    </>
  );
}
