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
        <p className="text-xs text-zinc-500 mb-4">
          You are hearing Recall Touch's real AI assistant responding live, not a recording.
        </p>
        <Link href={ROUTES.START} className="text-sm font-medium text-zinc-300 hover:text-white transition-colors" aria-label={t("getThisForYourNumber")}>
          {t("getThisForYourNumber")}
        </Link>
      </div>

      {/* "See the full product" mockups */}
      <div className="max-w-5xl mx-auto px-4 mt-16">
        <div className="max-w-2xl text-center mx-auto mb-10">
          <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">See the full product</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Beyond voice: dashboard, campaigns, and timeline proof
          </h2>
          <p className="mt-3 text-sm text-zinc-400" style={{ lineHeight: 1.7 }}>
            These mockups show the non-voice parts you get when Recall Touch runs end-to-end: tracking, follow-up execution,
            and contact activity you can audit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Dashboard KPIs",
              caption: "Calls answered, appointments booked, and revenue recovered.",
            },
            {
              title: "Campaign builder",
              caption: "Sequence templates with audiences, scheduling, and review.",
            },
            {
              title: "Contact timeline",
              caption: "Every touch is captured: calls, texts, bookings, and outcomes.",
            },
            {
              title: "Analytics + attribution",
              caption: "Conversion rates and revenue attribution you can act on.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {card.title}
                </h3>
                <span className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-zinc-400">
                  Mockup
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {card.caption}
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="h-2 w-2/3 bg-white/10 rounded-full mb-2" />
                <div className="h-2 w-full bg-white/10 rounded-full mb-2" />
                <div className="h-2 w-3/4 bg-white/10 rounded-full mb-2" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="h-12 rounded-lg bg-white/5 border border-white/10" />
                  <div className="h-12 rounded-lg bg-white/5 border border-white/10" />
                  <div className="h-12 rounded-lg bg-white/5 border border-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
