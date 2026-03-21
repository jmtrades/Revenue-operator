"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic2 } from "lucide-react";
import { Container } from "@/components/ui/Container";

const USE_CASE_IDS = ["missedCall", "appointment", "followUp", "afterHours", "screening"] as const;

export function HomepageLiveDemo() {
  const t = useTranslations("homepage.liveDemo");
  const [activeId, setActiveId] = useState<(typeof USE_CASE_IDS)[number]>("missedCall");

  const useCases = useMemo(
    () =>
      USE_CASE_IDS.map((id) => ({
        id,
        label: t(`useCases.${id}.label`),
        caller: t(`useCases.${id}.caller`),
        agent: t(`useCases.${id}.agent`),
        result: t(`useCases.${id}.result`),
      })),
    [t]
  );
  const active = useCases.find((u) => u.id === activeId) ?? useCases[0];

  return (
    <section
      id="live-audio-demo"
      className="py-16 md:py-20 border-t border-[var(--border-default)]/60"
      style={{ background: "#020617" }}
    >
      <Container>
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-semibold text-white">
              {t("heading")}
            </h2>
            <p className="mt-2 text-sm md:text-base text-[var(--text-tertiary)]">
              {t("subheading")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {useCases.map((u) => {
              const isActive = u.id === activeId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setActiveId(u.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm border transition-colors ${
                    isActive
                      ? "bg-white text-black border-white"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-default)]"
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase text-[var(--text-tertiary)] mb-3">{active.label}</p>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl px-3 py-2 bg-[var(--bg-inset)]/80 border border-[var(--border-default)]/60 text-[var(--text-primary)]">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t("cardLabels.caller")}</p>
                <p>{active.caller}</p>
              </div>
              <div className="rounded-xl px-3 py-2 bg-[var(--bg-inset)]/80 border border-emerald-900/50 text-emerald-100 ml-4">
                <p className="text-[11px] uppercase tracking-wide text-emerald-400/80 mb-1">{t("cardLabels.agent")}</p>
                <p>{active.agent}</p>
              </div>
              <div className="rounded-xl px-3 py-2 bg-[var(--bg-inset)]/50 border border-dashed border-[var(--border-default)] text-[var(--text-tertiary)]">
                <p className="text-[11px] uppercase tracking-wide mb-1">{t("cardLabels.result")}</p>
                <p>{active.result}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-4">
              {t("sampleNote")}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-default)] pt-4">
            <p className="text-sm text-[var(--text-tertiary)]">
              {t("cta.text")}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/demo";
                }}
                className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] hover:text-white transition-colors"
                aria-label={t("cta.ariaLabel")}
              >
                <Mic2 className="w-4 h-4" />
              </button>
              <a
                href="/activate"
                className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 text-sm hover:opacity-90 transition-colors"
              >
                {t("cta.button")}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
