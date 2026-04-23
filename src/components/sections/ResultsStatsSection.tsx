"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

export function ResultsStatsSection() {
  const t = useTranslations("homepage.results");

  const stats = [
    {
      number: "24/7",
      label: t("stats.0.label", { default: "Autonomous Coverage" }),
      accentColor: "var(--accent-primary)",
    },
    {
      number: "< 0.8s",
      label: t("stats.1.label", { default: "AI Response Time" }),
      accentColor: "var(--accent-secondary)",
    },
    {
      number: "36",
      label: t("stats.2.label", { default: "Industry-Tuned Voices" }),
      accentColor: "var(--accent-warning)",
    },
    {
      number: "100%",
      label: t("stats.3.label", { default: "Calls Answered" }),
      accentColor: "var(--accent-success, #10B981)",
    },
  ];

  return (
    <section
      className="marketing-section py-16 md:py-24"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <p
            className="eyebrow-editorial mb-5"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label", { default: "Proven Results" })}
          </p>
          <h2
            className="font-editorial max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              color: "var(--text-primary)",
            }}
          >
            {t("title", { default: "Metrics that matter" })}
          </h2>
        </AnimateOnScroll>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-8 text-center relative overflow-hidden"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
              }}
            >
              {/* Accent gradient background */}
              <div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 blur-3xl"
                style={{ background: stat.accentColor }}
              />

              {/* Content */}
              <div className="relative z-10">
                <div
                  className="num-editorial mb-3"
                  style={{
                    fontSize: "clamp(2.75rem, 5.5vw, 3.75rem)",
                    lineHeight: 1,
                    color: stat.accentColor,
                  }}
                >
                  {stat.number}
                </div>
                <p
                  className="eyebrow-editorial"
                  style={{ color: "var(--text-primary)", letterSpacing: "0.14em" }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
