"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";
import { PhoneMissed, Clock, Layers } from "lucide-react";

export function ProblemStatement() {
  const t = useTranslations("homepage.problem");
  const CARDS = useMemo(
    () => [
      {
        title: t("card1Title"),
        stats: [
          { value: "$126K", desc: t("card1Stat1Desc") },
          { value: "80%", desc: t("card1Stat2Desc") },
          { value: "93%", desc: t("card1Stat3Desc") },
        ],
        accent: "var(--accent-primary)",
      },
      {
        title: t("card2Title"),
        stats: [
          { value: "51%", desc: t("card2Stat1Desc") },
          { value: "42 hrs", desc: t("card2Stat2Desc") },
          { value: "44%", desc: t("card2Stat3Desc") },
        ],
        accent: "var(--accent-secondary)",
      },
      {
        title: t("card3Title"),
        stats: [
          { value: "$35K", desc: t("card3Stat1Desc") },
          { value: "30–45%", desc: t("card3Stat2Desc") },
          { value: "4+", desc: t("card3Stat3Desc") },
        ],
        accent: "var(--accent-warning)",
      },
    ],
    [t]
  );

  return (
    <section id="problem" className="marketing-section" style={{ background: "var(--gradient-problem-bg)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <p className="section-label mb-4" style={{ color: "var(--accent-warning)" }}>{t("sectionLabel")}</p>
          <h2 className="font-semibold max-w-3xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
        </AnimateOnScroll>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {CARDS.map((card, index) => {
            const Icon =
              index === 0 ? PhoneMissed : index === 1 ? Clock : Layers;
            return (
              <motion.div
                key={card.title}
                variants={fadeUpVariants}
                className="card-marketing p-6 md:p-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-7 h-7 text-[var(--accent-primary)]" />
                </div>
                <h3
                  className="text-sm font-semibold uppercase tracking-wider mb-5 text-center md:text-left"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {card.title}
                </h3>
              <ul className="space-y-4">
                {card.stats.map((s) => (
                  <li key={s.desc}>
                    <span className="text-xl md:text-2xl font-bold block mb-1" style={{ color: card.accent }}>{s.value}</span>
                    <span className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.desc}</span>
                  </li>
                ))}
              </ul>
              </motion.div>
            );
          })}
        </StaggerChildren>

        <AnimateOnScroll className="text-center mt-10">
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {t("closing")}
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
