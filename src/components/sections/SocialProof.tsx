"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { SOCIAL_PROOF } from "@/lib/constants";

const ACCENT_COLORS = [
  "var(--accent-primary)",
  "var(--accent-secondary)",
  "#7C3AED",
];

export function SocialProof() {
  const t = useTranslations("homepage.socialProof");
  return (
    <section
      id="results"
      className="marketing-section pt-16 pb-16 md:pt-24 md:pb-20"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)", letterSpacing: "0.1em" }}
          >
            {t("traction")}
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
            {t("heading")}
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            { stat: SOCIAL_PROOF.businessCount, label: t("stats.0.label"), desc: t("stats.0.desc") },
            { stat: SOCIAL_PROOF.callsHandled, label: t("stats.1.label"), desc: t("stats.1.desc") },
            { stat: SOCIAL_PROOF.revenueRecovered, label: t("stats.2.label"), desc: t("stats.2.desc") },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="relative text-center p-8 rounded-2xl overflow-hidden group"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-xs)",
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{ y: -3, transition: { duration: 0.25 } }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full opacity-60 group-hover:w-12 transition-all duration-300"
                style={{ background: ACCENT_COLORS[i] }}
              />

              {/* Ambient glow */}
              <div
                className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-[0.04] blur-3xl"
                style={{ background: ACCENT_COLORS[i] }}
              />

              <div className="relative z-10">
                <div
                  className="font-bold mb-2"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 2.75rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  {item.stat}
                </div>
                <div
                  className="font-semibold text-sm mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.label}
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
