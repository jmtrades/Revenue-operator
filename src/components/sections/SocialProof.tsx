"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { ROUTES } from "@/lib/constants";

export function SocialProof() {
  const t = useTranslations("hero.trust");

  return (
    <section id="results" className="marketing-section pt-16 pb-16 md:pt-24 md:pb-20" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <SectionLabel>Proven Results</SectionLabel>
          <h2
            className="font-bold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            The Numbers Speak for Themselves
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {/* Stat 1: Businesses Live */}
          <AnimateOnScroll>
            <div className="text-center p-8 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
              <div
                className="font-bold mb-2"
                style={{
                  fontSize: "3rem",
                  lineHeight: 1,
                  color: "var(--accent-primary)",
                }}
              >
                12,400+
              </div>
              <div className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                Businesses Live
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Across 200+ industries in 47 states
              </div>
            </div>
          </AnimateOnScroll>

          {/* Stat 2: Calls Handled */}
          <AnimateOnScroll>
            <div className="text-center p-8 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
              <div
                className="font-bold mb-2"
                style={{
                  fontSize: "3rem",
                  lineHeight: 1,
                  color: "var(--accent-primary)",
                }}
              >
                8.7M+
              </div>
              <div className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                Calls Handled
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                And counting. Every single one answered.
              </div>
            </div>
          </AnimateOnScroll>

          {/* Stat 3: Revenue Recovered */}
          <AnimateOnScroll>
            <div className="text-center p-8 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
              <div
                className="font-bold mb-2"
                style={{
                  fontSize: "3rem",
                  lineHeight: 1,
                  color: "var(--accent-primary)",
                }}
              >
                $340M+
              </div>
              <div className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                Revenue Recovered
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                For businesses that used to lose calls to voicemail
              </div>
            </div>
          </AnimateOnScroll>
        </div>

        <div className="text-center">
          <Link
            href={ROUTES.START}
            className="inline-flex items-center justify-center bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-200 transition-colors"
          >
            {t("ctaStartFree")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
