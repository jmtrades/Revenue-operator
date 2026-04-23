"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

const METRIC_IDS = ["revenueLost", "answerRate", "speedToLead", "inbox", "setupTime"] as const;
const VALUES = ["$126K", "100%", "<3 sec", "1 inbox", "<3 min"] as const;

export function MetricsSection() {
  const t = useTranslations("homepage.metrics");
  const items = useMemo(
    () =>
      METRIC_IDS.map((id, i) => ({
        id,
        value: VALUES[i],
        label: t(`items.${id}`),
      })),
    [t]
  );

  return (
    <section id="what-if" className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-editorial max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
        </AnimateOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
          {items.map((m) => (
            <AnimateOnScroll key={m.id}>
              <div className="text-center p-6 rounded-xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
                <p className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "var(--accent-primary)" }}>{m.value}</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{m.label}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
