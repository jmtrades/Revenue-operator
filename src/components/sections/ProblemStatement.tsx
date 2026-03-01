"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const PROBLEM_INBOUND = {
  title: "Calls go unanswered.",
  stats: [
    { value: "$126K", desc: "Lost per year to missed calls" },
    { value: "80%", desc: "Hang up on voicemail" },
    { value: "93%", desc: "Never call back after busy signal" },
  ],
  accent: "var(--accent-primary)",
};

const PROBLEM_OUTBOUND = {
  title: "Follow-up never happens.",
  stats: [
    { value: "51%", desc: "Of leads are never contacted" },
    { value: "42 hrs", desc: "Average lead response time" },
    { value: "44%", desc: "Of reps give up after 1 try · Leads go to whoever calls first" },
  ],
  accent: "var(--accent-secondary)",
};

const PROBLEM_HUMAN = {
  title: "Hiring doesn't fix it.",
  stats: [
    { value: "$35K", desc: "Receptionist · $55K SDR" },
    { value: "30–45%", desc: "Turnover in phone-heavy roles" },
    { value: "3–6 mo", desc: "To train · They still miss calls and forget follow-ups" },
  ],
  accent: "var(--accent-warning)",
};

const CARDS = [PROBLEM_INBOUND, PROBLEM_OUTBOUND, PROBLEM_HUMAN];

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

        <StaggerChildren className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {CARDS.map((card) => (
            <motion.div key={card.title} variants={fadeUpVariants} className="card-marketing p-6 md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: "var(--text-tertiary)" }}>{card.title}</h3>
              <ul className="space-y-4">
                {card.stats.map((s) => (
                  <li key={s.desc}>
                    <span className="text-xl md:text-2xl font-bold block mb-1" style={{ color: card.accent }}>{s.value}</span>
                    <span className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.desc}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
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
