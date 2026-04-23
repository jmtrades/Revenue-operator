"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { SOCIAL_PROOF } from "@/lib/constants";

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
            className="eyebrow-editorial mb-5"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("traction")}
          </p>
          <h2
            className="font-editorial max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              color: "var(--text-primary)",
            }}
          >
            {t("heading")}
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              stat: SOCIAL_PROOF.businessCount,
              label: t("stats.0.label"),
              desc: t("stats.0.desc"),
            },
            {
              stat: SOCIAL_PROOF.callsHandled,
              label: t("stats.1.label"),
              desc: t("stats.1.desc"),
            },
            {
              stat: SOCIAL_PROOF.revenueRecovered,
              label: t("stats.2.label"),
              desc: t("stats.2.desc"),
            },
          ].map((item) => (
            <AnimateOnScroll key={item.label}>
              <div
                className="text-center p-8 rounded-xl"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div
                  className="font-semibold mb-2"
                  style={{
                    fontSize: "2.5rem",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  {item.stat}
                </div>
                <div
                  className="font-semibold text-base mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.label}
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.desc}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
