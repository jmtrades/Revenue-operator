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
        <h1
          className="font-semibold text-3xl md:text-4xl mb-2"
          style={{ letterSpacing: "-0.025em", color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {t("subtitle")}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-8 items-start">
        <div
          className="rounded-xl p-6 flex flex-col items-center gap-4"
          style={{ border: "1px solid var(--border-default)", background: "var(--bg-surface)" }}
        >
          <div
            className="w-32 h-56 rounded-3xl flex flex-col items-center justify-center gap-3 p-4"
            style={{ border: "2px solid var(--border-default)", background: "var(--bg-primary)", boxShadow: "var(--shadow-lg)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg-inset)", color: "var(--text-tertiary)" }}
            >
              <Mic className="h-5 w-5" />
            </div>
            <p className="text-[10px] text-center" style={{ color: "var(--text-tertiary)" }}>{t("tapMic")}</p>
          </div>
          <DemoVoiceButton />
          <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>{t("orTryScenario")}</p>
          <div className="flex flex-wrap justify-center gap-2 w-full">
            {SCENARIO_KEYS.map((key) => {
              const label = t(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chatRef.current?.send(label)}
                  aria-label={`Try scenario: ${label}`}
                  className="rounded-full px-3 py-1.5 text-xs transition-colors"
                  style={{
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-primary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{ border: "1px solid var(--border-default)", background: "var(--bg-surface)" }}
        >
          <div
            className="px-4 py-2 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--border-default)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{t("liveTranscript")}</span>
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
        <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-tertiary)" }}>{t("voiceStyle")}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t("voiceStyleHelp")}</p>
      </div>

      {messageCount >= 3 && (
        <div
          className="max-w-5xl mx-auto px-4 mt-8 rounded-xl p-6"
          style={{ border: "1px solid var(--border-default)", background: "var(--bg-surface)" }}
        >
          <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{t("whatJustHappened")}</h3>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("whatJustHappenedDesc")}</p>
          <ul className="text-sm space-y-1 list-disc list-inside mb-4" style={{ color: "var(--text-secondary)" }}>
            <li>{t("bullet1")}</li>
            <li>{t("bullet2")}</li>
            <li>{t("bullet3")}</li>
          </ul>
          <Link
            href={ROUTES.START}
            className="btn-marketing-primary no-underline inline-flex items-center justify-center"
          >
            {t("setThisUp")}
          </Link>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 mt-8 text-center">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{t("voiceWidgetHint")}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          You are hearing Revenue Operator&apos;s real AI assistant responding live, not a recording.
        </p>
        <Link
          href={ROUTES.START}
          className="text-sm font-medium mt-2 inline-block no-underline"
          style={{ color: "var(--accent-primary)" }}
          aria-label={t("getThisForYourNumber")}
        >
          {t("getThisForYourNumber")}
        </Link>
      </div>

      {/* Product mockups */}
      <div className="max-w-5xl mx-auto px-4 mt-16">
        <div className="max-w-2xl text-center mx-auto mb-10">
          <p className="eyebrow-editorial mb-4" style={{ color: "var(--accent-primary)" }}>
            See the full product
          </p>
          <h2
            className="text-2xl md:text-3xl font-semibold"
            style={{ letterSpacing: "-0.025em", lineHeight: 1.2, color: "var(--text-primary)" }}
          >
            Beyond voice: dashboard, campaigns, and timeline proof
          </h2>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            These mockups show the non-voice parts you get when Revenue Operator runs end-to-end: tracking, follow-up execution,
            and contact activity you can audit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Dashboard KPIs", caption: "Calls answered, appointments booked, and revenue recovered." },
            { title: "Campaign builder", caption: "Sequence templates with audiences, scheduling, and review." },
            { title: "Contact timeline", caption: "Every touch is captured: calls, texts, bookings, and outcomes." },
            { title: "Analytics + attribution", caption: "Conversion rates and revenue attribution you can act on." },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl p-5 overflow-hidden"
              style={{ border: "1px solid var(--border-default)", background: "var(--bg-surface)" }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{card.title}</h3>
                <span
                  className="text-[10px] px-2 py-1 rounded-full"
                  style={{ border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}
                >
                  Mockup
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{card.caption}</p>
              <div className="mt-4 rounded-lg p-3" style={{ border: "1px solid var(--border-default)", background: "var(--bg-inset)" }}>
                <div className="h-2 w-2/3 rounded-full mb-2" style={{ background: "var(--border-default)" }} />
                <div className="h-2 w-full rounded-full mb-2" style={{ background: "var(--border-default)" }} />
                <div className="h-2 w-3/4 rounded-full mb-2" style={{ background: "var(--border-default)" }} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="h-12 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }} />
                  <div className="h-12 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }} />
                  <div className="h-12 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
