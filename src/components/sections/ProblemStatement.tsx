"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const LEFT_STATS = [
  { value: "$126,000", desc: "Average annual revenue lost to missed calls" },
  { value: "80%", desc: "Of callers who hit voicemail hang up" },
  { value: "93%", desc: "Who get a busy signal never call back" },
];

const RIGHT_STATS = [
  { value: "$35,000/yr", desc: "Average receptionist salary" },
  { value: "$4,200/yr", desc: "Traditional answering service" },
  { value: "—", desc: "They still miss calls. They still forget follow-ups." },
];

export function ProblemStatement() {
  return (
    <section id="problem" className="marketing-section" style={{ background: "var(--gradient-problem-bg)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <p className="section-label mb-4" style={{ color: "var(--accent-warning)" }}>The problem</p>
          <h2 className="font-semibold max-w-3xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Every missed call costs you money. Every human you hire costs you more.
          </h2>
        </AnimateOnScroll>

        <StaggerChildren className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto">
          <motion.div variants={fadeUpVariants} className="card-marketing p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: "var(--text-tertiary)" }}>The cost of missed calls</h3>
            <ul className="space-y-5">
              {LEFT_STATS.map((s) => (
                <li key={s.desc}>
                  <span className="text-2xl md:text-3xl font-bold block mb-1" style={{ color: "var(--accent-primary)" }}>{s.value}</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.desc}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div variants={fadeUpVariants} className="card-marketing p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: "var(--text-tertiary)" }}>The cost of humans</h3>
            <ul className="space-y-5">
              {RIGHT_STATS.map((s) => (
                <li key={s.desc}>
                  <span className="text-2xl md:text-3xl font-bold block mb-1" style={{ color: "var(--accent-warning)" }}>{s.value}</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.desc}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </StaggerChildren>

        <AnimateOnScroll className="text-center mt-10">
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            What if you could answer every call, follow up on every lead, and never pay another salary to do it?
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
