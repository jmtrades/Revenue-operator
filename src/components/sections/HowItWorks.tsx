"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PhoneForwarded, Zap, MessageSquareText } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

export function HowItWorks() {
  const t = useTranslations("homepage.howItWorks");
  const steps = useMemo(
    () => [
      {
        num: 1,
        icon: PhoneForwarded,
        title: t("steps.0.title"),
        subtitle: t("steps.0.subtitle"),
        desc: t("steps.0.description"),
      },
      {
        num: 2,
        icon: Zap,
        title: t("steps.1.title"),
        subtitle: t("steps.1.subtitle"),
        desc: t("steps.1.description"),
      },
      {
        num: 3,
        icon: MessageSquareText,
        title: t("steps.2.title"),
        subtitle: t("steps.2.subtitle"),
        desc: t("steps.2.description"),
      },
    ],
    [t]
  );

  return (
    <section
      id="how-it-works"
      className="marketing-section py-20 md:py-28"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-16 md:mb-20">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label")}
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
            {t("title")}
          </h2>
          <p
            className="text-base mt-4 max-w-xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("description")}
          </p>
        </AnimateOnScroll>

        <div className="max-w-[900px] mx-auto">
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {steps.map((step) => (
              <div
                key={step.num}
                className="rounded-xl p-8 text-center"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {t("stepLabel", { num: step.num })}
                </p>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 mx-auto"
                  style={{
                    background: "var(--bg-hover)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <step.icon className="w-5 h-5" />
                </div>
                <h3
                  className="font-semibold text-base mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Setup timeline */}
        <div
          className="mt-12 flex flex-wrap justify-center gap-6 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          {[
            { label: t("timeline.0.label"), value: t("timeline.0.value") },
            { label: t("timeline.1.label"), value: t("timeline.1.value") },
            { label: t("timeline.2.label"), value: t("timeline.2.value") },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                style={{ color: "var(--accent-secondary)" }}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {label}{" "}
                <strong style={{ color: "var(--text-primary)" }}>{value}</strong>
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
