"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

export function TestimonialsSection() {
  return (
    <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
      <Container>
        <AnimateOnScroll className="text-center">
          <SectionLabel>Early Access</SectionLabel>
          <h2
            className="font-bold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary, #1A1A1A)",
            }}
          >
            Now accepting early customers
          </h2>
          <p
            className="text-base mt-3 max-w-lg mx-auto"
            style={{ color: "var(--text-secondary, #4A4A4A)" }}
          >
            We&apos;re onboarding service businesses one at a time to ensure every
            customer gets an exceptional experience. Start your 14-day free
            trial.
          </p>
          <a
            href="/activate"
            className="inline-flex mt-6 px-6 py-3 rounded-lg font-medium text-white transition-colors"
            style={{ background: "var(--accent-primary, #0D6E6E)" }}
          >
            Try it free for 14 days
          </a>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
