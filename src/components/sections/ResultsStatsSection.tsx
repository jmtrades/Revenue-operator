"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

export function ResultsStatsSection() {
  const t = useTranslations("homepage.results");

  const stats = [
    {
      number: "$47M+",
      label: t("stats.0.label", { default: "Revenue Recovered" }),
      accentColor: "var(--accent-primary)",
    },
    {
      number: "2.3M+",
      label: t("stats.1.label", { default: "Calls Handled" }),
      accentColor: "var(--accent-secondary)",
    },
    {
      number: "340%",
      label: t("stats.2.label", { default: "Average ROI" }),
      accentColor: "var(--accent-warning)",
    },
    {
      number: "< 2 sec",
      label: t("stats.3.label", { default: "Response Time" }),
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
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label", { default: "Proven Results" })}
          </p>
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
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
                  className="font-bold mb-3"
                  style={{
                    fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: stat.accentColor,
                  }}
                >
                  {stat.number}
                </div>
                <p
                  className="font-semibold text-sm"
                  style={{ color: "var(--text-primary)" }}
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
