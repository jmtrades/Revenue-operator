"use client";

import Link from "next/link";
import { ArrowRight, Headphones } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { VoicePreviewWidget } from "@/components/VoicePreviewWidget";
import { ROUTES } from "@/lib/constants";

export function HomepageVoicePreview() {
  return (
    <section className="marketing-section py-16 md:py-24" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-10">
          <SectionLabel>Hear It to Believe It</SectionLabel>
          <h2
            className="font-bold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary, #1A1A1A)",
            }}
          >
            This isn&apos;t your grandma&apos;s phone tree
          </h2>
          <p className="text-base md:text-lg max-w-xl mx-auto mt-3" style={{ color: "var(--text-secondary)" }}>
            Our AI sounds indistinguishable from a real human. Don&apos;t take our word for it — listen to a live demo call across 5 industries.
          </p>
        </AnimateOnScroll>

        <div className="max-w-3xl mx-auto">
          <VoicePreviewWidget />
        </div>

        <div className="text-center mt-8">
          <Link
            href={ROUTES.DEMO}
            className="inline-flex items-center gap-2 border border-[var(--border-default)] text-[var(--text-primary)] font-semibold rounded-xl px-6 py-3 no-underline hover:bg-white/5 transition-all"
          >
            <Headphones className="w-4 h-4" />
            Try the full interactive demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
