"use client";

import { Link2, Brain, Sparkles } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const steps = [
  {
    num: 1,
    icon: Link2,
    title: "Connect",
    desc: "Forward your business number or get a new one.",
  },
  {
    num: 2,
    icon: Brain,
    title: "Teach",
    desc: "Tell us your services, hours, and how you want calls handled. Or paste your website — we'll figure it out.",
  },
  {
    num: 3,
    icon: Sparkles,
    title: "Relax",
    desc: "Every call answered. Every lead captured. Every appointment booked. Check your phone when you're ready.",
  },
];

function ConnectorLine() {
  return (
    <div className="hidden md:flex flex-shrink-0 w-6 md:w-10 items-center justify-center self-stretch">
      <div className="w-full h-px md:h-px md:w-full" style={{ background: "var(--border-default)" }} />
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16 md:mb-20">
          <SectionLabel>How it works</SectionLabel>
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}
          >
            Setup takes 5 minutes. Then it runs itself.
          </h2>
        </AnimateOnScroll>
        <div className="max-w-[900px] mx-auto">
          <StaggerChildren className="flex flex-col md:flex-row md:items-stretch gap-8 md:gap-0">
            {steps.map((step, i) => (
              <div key={step.num} className="flex flex-col md:flex-row md:flex-1 items-center">
                <motion.div
                  variants={fadeUpVariants}
                  className="card-marketing p-8 md:p-10 text-center md:text-left flex-1 w-full flex flex-col items-center md:items-start"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold mb-4"
                    style={{ background: "var(--accent-primary)", color: "#fff" }}
                  >
                    {step.num}
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm max-w-[280px]" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                    {step.desc}
                  </p>
                </motion.div>
                {i < steps.length - 1 && <ConnectorLine />}
              </div>
            ))}
          </StaggerChildren>
        </div>
      </Container>
    </section>
  );
}
