"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

const TESTIMONIAL_IDS = ["amanda", "ryan", "mike", "sarah", "james"] as const;

export function TestimonialsSection() {
  const t = useTranslations("homepage.testimonials");
  const testimonials = useMemo(
    () =>
      TESTIMONIAL_IDS.map((id) => ({
        quote: t(`testimonials.${id}.quote`),
        author: t(`testimonials.${id}.author`),
        role: t(`testimonials.${id}.role`),
        stars: 5,
      })),
    [t]
  );
  const badge = t("badge");

  return (
    <section className="marketing-section py-12 md:py-16" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-10">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            {t("preamble")}
          </p>
          <SectionLabel>{t("label")}</SectionLabel>
        </AnimateOnScroll>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
          {testimonials.map((item, i) => (
            <AnimateOnScroll key={i}>
              <div
                className="p-6 rounded-2xl border h-full flex flex-col"
                style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
              >
                <div className="flex gap-0.5 mb-3" aria-hidden>
                  {Array.from({ length: item.stars }).map((_, j) => (
                    <span key={j} className="text-amber-400" style={{ fontSize: "1rem" }}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm flex-1 mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  &ldquo;{item.quote}&rdquo;
                </p>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  — {item.author}, {item.role}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <span
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}
          >
            {badge}
          </span>
        </div>
      </Container>
    </section>
  );
}
