"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { StatCountUp } from "@/components/shared/StatCountUp";
import { motion } from "framer-motion";

const STATS = [
  { target: 67, suffix: "%", desc: "of sales calls have no compliance record" },
  { target: 3.2, suffix: "×", decimals: 1, desc: "higher dispute rate without call governance" },
  { target: 47, prefix: "$", suffix: "K", desc: "average cost of a single compliance violation" },
];

export function ProblemStatement() {
  return (
    <section id="problem" className="marketing-section" style={{ background: "var(--gradient-problem-bg)" }}>
      <Container className="max-w-[640px]">
        <AnimateOnScroll>
          <p className="section-label mb-4" style={{ color: "var(--accent-warning)" }}>
            The problem
          </p>
          <h2
            className="font-semibold mb-6"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}
          >
            Unstructured calls are operational risk.
          </h2>
          <p className="text-base md:text-lg mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            When revenue depends on conversation, every unrecorded call is a liability.
          </p>
          <p className="text-base md:text-lg mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Reps improvise pricing. Follow-ups get forgotten. Escalations happen without documentation. Disputes arise with no record.
          </p>
          <p className="text-base md:text-lg mb-12" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Most teams solve this with scattered notes and good intentions. That&apos;s not infrastructure. That&apos;s hope.
          </p>
        </AnimateOnScroll>

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 sm:mt-16">
          {STATS.map((stat) => (
            <motion.div
              key={stat.desc}
              variants={fadeUpVariants}
              className="card-marketing p-8"
            >
              <div className="text-4xl sm:text-5xl font-bold mb-2" style={{ color: "var(--accent-primary)" }}>
                <StatCountUp
                  target={stat.target}
                  prefix={stat.prefix ?? ""}
                  suffix={stat.suffix ?? ""}
                  decimals={stat.decimals ?? 0}
                />
              </div>
              <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                {stat.desc}
              </p>
            </motion.div>
          ))}
        </StaggerChildren>
        <p className="text-xs mt-6 text-center" style={{ color: "var(--text-tertiary)" }}>
          Industry averages. Sources: Gartner, compliance industry reports.
        </p>
      </Container>
    </section>
  );
}
