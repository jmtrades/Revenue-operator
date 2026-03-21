"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PhoneForwarded, Zap, MessageSquareText, Clock, CheckCircle2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

function ConnectorLine() {
  return (
    <div className="hidden md:flex flex-shrink-0 w-6 md:w-10 items-center justify-center self-stretch">
      <div className="w-full h-px md:h-px md:w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </div>
  );
}

export function HowItWorks() {
  const _t = useTranslations("homepage.howItWorks");
  const steps = useMemo(
    () => [
      {
        num: 1,
        icon: PhoneForwarded,
        title: "Connect Your Number",
        subtitle: "in minutes",
        desc: "Keep your existing business number or get a new one. Forward calls to Recall Touch and your AI agent picks up instantly — no hardware, no apps, no IT team needed.",
      },
      {
        num: 2,
        icon: Zap,
        title: "AI Handles Everything",
        subtitle: "Automatically",
        desc: "Every call is answered in under a second. Leads are qualified, appointments are booked, follow-ups are scheduled, and high-value calls are routed to the right person — automatically.",
      },
      {
        num: 3,
        icon: MessageSquareText,
        title: "Revenue Shows Up in Your Dashboard",
        subtitle: "Live",
        desc: "See exactly which calls converted, how much revenue your AI recovered, and where every lead stands. Real attribution, not guesswork.",
      },
    ],
    []
  );

  return (
    <section id="how-it-works" className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16 md:mb-20">
          <SectionLabel>How it works</SectionLabel>
          <h2
            className="font-bold max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}
          >
            Live in 3 Minutes. Recovering Revenue in 24 Hours.
          </h2>
          <p className="text-base mt-4 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            No engineers. No complicated setup. No new phone number.
          </p>
        </AnimateOnScroll>

        <div className="max-w-[900px] mx-auto">
          <StaggerChildren className="flex flex-col md:flex-row md:items-stretch gap-8 md:gap-0">
            {steps.map((step, i) => (
              <div key={step.num} className="flex flex-col md:flex-row md:flex-1 items-center">
                <motion.div
                  variants={fadeUpVariants}
                  className="card-marketing p-8 md:p-10 text-center md:text-left flex-1 w-full flex flex-col items-center md:items-start group hover:border-emerald-500/30 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold mb-4"
                    style={{ background: "var(--accent-primary)", color: "#fff" }}
                  >
                    {step.num}
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 mb-3">
                    <Clock className="w-3 h-3" />
                    {step.subtitle}
                  </span>
                  <p className="text-sm max-w-[280px]" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                    {step.desc}
                  </p>
                </motion.div>
                {i < steps.length - 1 && <ConnectorLine />}
              </div>
            ))}
          </StaggerChildren>
        </div>

        {/* Setup timeline micro-copy */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Average setup time: <strong className="text-white/70">2 minutes 47 seconds</strong></span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>First test call: <strong className="text-white/70">instant</strong></span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Average time to first recovered lead: <strong className="text-white/70">4 hours</strong></span>
          </div>
        </div>
      </Container>
    </section>
  );
}
