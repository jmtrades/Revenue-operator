"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

function AnimatedStatNumber({ value, suffix = "" }: { value: string; suffix?: string }) {
  const numericPart = value.replace(/[^0-9.]/g, "");
  const prefix = value.replace(/[0-9.]+.*/, "");
  const target = parseFloat(numericPart) || 0;
  const isDecimal = numericPart.includes(".");
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * target);
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const display = isDecimal ? count.toFixed(1) : Math.round(count).toString();

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display}{suffix}
    </span>
  );
}

export function ResultsStatsSection() {
  const t = useTranslations("homepage.results");

  const stats = [
    {
      number: "24/7",
      isAnimated: false,
      label: t("stats.0.label", { default: "Autonomous Coverage" }),
      accentColor: "var(--accent-primary)",
    },
    {
      number: "< 0.8",
      suffix: "s",
      isAnimated: true,
      animValue: "0.8",
      animPrefix: "< ",
      animSuffix: "s",
      label: t("stats.1.label", { default: "AI Response Time" }),
      accentColor: "var(--accent-secondary)",
    },
    {
      number: "36",
      isAnimated: true,
      animValue: "36",
      label: t("stats.2.label", { default: "Industry-Tuned Voices" }),
      accentColor: "var(--accent-warning)",
    },
    {
      number: "100%",
      isAnimated: true,
      animValue: "100",
      animSuffix: "%",
      label: t("stats.3.label", { default: "Calls Answered" }),
      accentColor: "var(--accent-success, #10B981)",
    },
  ];

  return (
    <section
      className="marketing-section py-16 md:py-24 relative overflow-hidden"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container className="relative z-10">
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)", letterSpacing: "0.1em" }}
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="rounded-2xl p-6 md:p-8 text-center relative overflow-hidden group"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-xs)",
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{
                y: -3,
                transition: { duration: 0.25 },
              }}
            >
              {/* Ambient glow */}
              <div
                className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-[0.06] blur-3xl transition-opacity duration-500 group-hover:opacity-[0.12]"
                style={{ background: stat.accentColor }}
              />

              {/* Top accent line */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full opacity-60 group-hover:w-12 transition-all duration-300"
                style={{ background: stat.accentColor }}
              />

              <div className="relative z-10">
                <div
                  className="font-bold mb-2"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: stat.accentColor,
                  }}
                >
                  {stat.isAnimated ? (
                    <AnimatedStatNumber
                      value={stat.animValue ?? stat.number}
                      suffix={stat.animSuffix ?? ""}
                    />
                  ) : (
                    stat.number
                  )}
                </div>
                <p
                  className="font-medium text-[13px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
