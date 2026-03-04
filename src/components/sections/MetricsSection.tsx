"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

const WHAT_IF_ITEMS = [
  { value: "$126K", label: "Average revenue lost per year to missed calls", id: "revenue-lost" },
  { value: "100%", label: "Answer rate with Recall Touch (up from ~60% national average)", id: "answer-rate" },
  { value: "60 sec", label: "Average time for Recall Touch to follow up on a new lead via call or text", id: "speed-to-lead" },
  { value: "1 inbox", label: "All calls, texts, and follow-ups in one place (vs 4+ tools for most teams)", id: "inbox" },
  { value: "5 min", label: "Setup time (vs 6 weeks for enterprise solutions)", id: "setup-time" },
];

export function MetricsSection() {
  return (
    <section id="what-if" className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <SectionLabel>What if?</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            The numbers that matter
          </h2>
        </AnimateOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
          {WHAT_IF_ITEMS.map((m) => (
            <AnimateOnScroll key={m.id}>
              <div className="text-center p-6 rounded-xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
                <p className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "var(--accent-primary)" }}>{m.value}</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{m.label}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
