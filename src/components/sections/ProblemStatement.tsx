"use client";

import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";
import { PhoneMissed, Clock, Layers } from "lucide-react";

const PROBLEM_INBOUND = {
  title: "Calls fall through the cracks",
  stats: [
    { value: "$126K", desc: "Lost per year to missed calls" },
    { value: "80%", desc: "Hang up on voicemail" },
    { value: "93%", desc: "Never call back after busy signal" },
  ],
  accent: "var(--accent-primary)",
};

const PROBLEM_OUTBOUND = {
  title: "Follow-up is broken",
  stats: [
    { value: "51%", desc: "Of leads never contacted" },
    { value: "42 hrs", desc: "Average response time" },
    { value: "44%", desc: "Of reps give up after 1 try" },
  ],
  accent: "var(--accent-secondary)",
};

const PROBLEM_HUMAN = {
  title: "Communication doesn't scale",
  stats: [
    { value: "$35K", desc: "Receptionist + $55K SDR salaries" },
    { value: "30–45%", desc: "Turnover in phone-heavy roles" },
    { value: "4+", desc: "Average tools businesses juggle for calls, texts, scheduling, and follow-up" },
  ],
  accent: "var(--accent-warning)",
};

const CARDS = [PROBLEM_INBOUND, PROBLEM_OUTBOUND, PROBLEM_HUMAN] as const;

export function ProblemStatement() {
  return (
    <section id="problem" className="marketing-section" style={{ background: "var(--gradient-problem-bg)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <p className="section-label mb-4" style={{ color: "var(--accent-warning)" }}>The problem</p>
          <h2 className="font-semibold max-w-3xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Phone communication is broken. For everyone.
          </h2>
        </AnimateOnScroll>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {CARDS.map((card, index) => {
            const Icon =
              index === 0 ? PhoneMissed : index === 1 ? Clock : Layers;
            return (
              <motion.div
                key={card.title}
                variants={fadeUpVariants}
                className="card-marketing p-6 md:p-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-7 h-7 text-[#4F8CFF]" />
                </div>
                <h3
                  className="text-sm font-semibold uppercase tracking-wider mb-5 text-center md:text-left"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {card.title}
                </h3>
              <ul className="space-y-4">
                {card.stats.map((s) => (
                  <li key={s.desc}>
                    <span className="text-xl md:text-2xl font-bold block mb-1" style={{ color: card.accent }}>{s.value}</span>
                    <span className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.desc}</span>
                  </li>
                ))}
              </ul>
              </motion.div>
            );
          })}
        </StaggerChildren>

        <AnimateOnScroll className="text-center mt-10">
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            What if every call, text, and follow-up was handled automatically — and you could see exactly what happened?
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
