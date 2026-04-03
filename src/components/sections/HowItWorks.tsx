"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PhoneForwarded, Zap, MessageSquareText } from "lucide-react";
import { motion } from "framer-motion";
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
        accent: "var(--accent-primary)",
      },
      {
        num: 2,
        icon: Zap,
        title: t("steps.1.title"),
        subtitle: t("steps.1.subtitle"),
        desc: t("steps.1.description"),
        accent: "var(--accent-secondary)",
      },
      {
        num: 3,
        icon: MessageSquareText,
        title: t("steps.2.title"),
        subtitle: t("steps.2.subtitle"),
        desc: t("steps.2.description"),
        accent: "#7C3AED",
      },
    ],
    [t],
  );

  return (
    <section
      id="how-it-works"
      className="marketing-section py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <Container className="relative z-10">
        <AnimateOnScroll className="text-center mb-16 md:mb-20">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)", letterSpacing: "0.1em" }}
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
            className="text-base mt-4 max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("description")}
          </p>
        </AnimateOnScroll>

        <div className="max-w-[960px] mx-auto">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[280px]" style={{ width: "480px", height: "2px" }}>
            <div
              className="w-full h-full"
              style={{
                background: "linear-gradient(90deg, transparent 0%, var(--border-default) 20%, var(--border-default) 80%, transparent 100%)",
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative rounded-2xl p-8 text-center group"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                whileHover={{
                  y: -4,
                  boxShadow: "0 12px 40px -12px rgba(0,0,0,0.08)",
                  transition: { duration: 0.3 },
                }}
              >
                {/* Step number badge */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: step.accent,
                    color: "#fff",
                    boxShadow: `0 2px 8px ${step.accent}33`,
                  }}
                >
                  {step.num}
                </div>

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 mx-auto transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `${step.accent}0D`,
                    color: step.accent,
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
              </motion.div>
            ))}
          </div>
        </div>

        {/* Setup timeline */}
        <motion.div
          className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm"
          style={{ color: "var(--text-tertiary)" }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {[
            { label: t("timeline.0.label"), value: t("timeline.0.value") },
            { label: t("timeline.1.label"), value: t("timeline.1.value") },
            { label: t("timeline.2.label"), value: t("timeline.2.value") },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0"
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
        </motion.div>
      </Container>
    </section>
  );
}
