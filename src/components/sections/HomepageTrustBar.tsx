"use client";

import { Container } from "@/components/ui/Container";

export function HomepageTrustBar() {
  return (
    <section className="py-6 border-t border-[var(--border-default,#E5E5E0)]" style={{ background: "var(--bg-surface, #FAFAF8)" }}>
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: "var(--text-secondary, #4A4A4A)" }}>
          <span className="flex items-center gap-1.5">
            <strong style={{ color: "var(--text-primary)" }}>Nationwide</strong> coverage
          </span>
          <span>·</span>
          <span>3-minute setup</span>
          <span>·</span>
          <span>Works with your existing number</span>
          <span>·</span>
          <span>Cancel anytime</span>
          <span>·</span>
          <span>Enterprise-grade security</span>
        </div>
      </Container>
    </section>
  );
}
