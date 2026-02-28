"use client";

import { Phone, Calendar, FileText, ArrowRightLeft, MessageSquare } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";
import {
  WaveformVisual,
  TimelineVisual,
  ComplianceRecordPreview,
  EscalationFlowVisual,
  ChannelIconsVisual,
} from "./BentoVisuals";

const items = [
  {
    icon: Phone,
    title: "Call governance",
    desc: "Every call is recorded, transcribed, and tagged under your compliance framework. No manual logging. No missed calls.",
    wide: false,
    visual: WaveformVisual,
  },
  {
    icon: Calendar,
    title: "Automated follow-ups",
    desc: "Commitments made during calls become scheduled actions — not forgotten promises. Deadlines are enforced automatically.",
    wide: false,
    visual: TimelineVisual,
  },
  {
    icon: FileText,
    title: "Compliance record",
    desc: "Jurisdiction-aware records that can be forwarded, audited, or submitted to regulatory review without modification. Full chain of custody on every record.",
    wide: true,
    visual: ComplianceRecordPreview,
  },
  {
    icon: ArrowRightLeft,
    title: "Escalation control",
    desc: "Escalations are routed through defined paths — L1, L2, L3 — with full documentation at every step. No undocumented handoffs.",
    wide: false,
    visual: EscalationFlowVisual,
  },
  {
    icon: MessageSquare,
    title: "Multi-channel",
    desc: "Voice calls, payment confirmations, follow-up conversations — all governed under a single compliance layer.",
    wide: false,
    visual: ChannelIconsVisual,
  },
];

export function Features() {
  return (
    <section id="capabilities" className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>Capabilities</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Infrastructure for every commercial conversation.
          </h2>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 gap-4 md:gap-6">
          {items.map((item) => {
            const Visual = item.visual;
            if (item.wide) {
              return (
                <motion.div
                  key={item.title}
                  variants={fadeUpVariants}
                  className="card-marketing card-feature group sm:col-span-2 md:p-10 relative flex flex-col"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
                    <div>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                      <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.desc}</p>
                    </div>
                    <div className="min-w-0">
                      <Visual />
                    </div>
                  </div>
                </motion.div>
              );
            }
            return (
              <motion.div
                key={item.title}
                variants={fadeUpVariants}
                className="card-marketing card-feature group p-8 flex flex-col"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                <p className="text-sm flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.desc}</p>
                <Visual />
              </motion.div>
            );
          })}
        </StaggerChildren>
      </Container>
    </section>
  );
}
