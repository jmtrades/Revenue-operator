"use client";

import Link from "next/link";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function FinalCTA() {
  return (
    <section className="marketing-section py-24 md:py-32" style={{ background: "var(--gradient-cta-section)", borderTop: "1px solid var(--border-default)" }}>
      <Container>
        <AnimateOnScroll className="text-center max-w-2xl mx-auto">
          <h2 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Your next customer is calling right now. Is anyone answering?
          </h2>
          <p className="text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Start free — takes 5 minutes.
          </p>
          <Link href={ROUTES.START} className="btn-marketing-primary btn-lg no-underline inline-block">
            Start free — takes 5 minutes →
          </Link>
          <p className="text-sm mt-6" style={{ color: "var(--text-tertiary)" }}>
            Or: <Link href={ROUTES.BOOK_DEMO} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded" style={{ color: "var(--text-tertiary)" }}>Book a demo</Link>
            {" · "}
            <Link href={ROUTES.DOCS} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded" style={{ color: "var(--text-tertiary)" }}>View documentation</Link>
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
