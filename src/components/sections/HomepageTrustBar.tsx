"use client";

import { Container } from "@/components/ui/Container";

export function HomepageTrustBar() {
  return (
    <section className="py-6 border-t border-[var(--border-default,#E5E5E0)]" style={{ background: "var(--bg-surface, #FAFAF8)" }}>
      <Container>
        <p className="text-center text-sm md:text-base" style={{ color: "var(--text-secondary, #4A4A4A)" }}>
          Set up in 5 minutes · Works with your existing number · 14-day free trial
        </p>
        <p className="text-center text-xs md:text-sm mt-2" style={{ color: "var(--text-secondary, #4A4A4A)" }}>
          Trusted by revenue teams that can&apos;t afford stalled follow-up.
        </p>
      </Container>
    </section>
  );
}
