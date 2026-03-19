"use client";

import { useTranslations } from "next-intl";
import {
  Phone,
  Calendar,
  MessageSquare,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

export function Features() {
  const t = useTranslations("homepage.features");

  return (
    <section id="capabilities" className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-bold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            AI Revenue Operations that closes the loop.
          </h2>
          <p className="text-base mt-4 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Message-only assistants answer calls and take messages. Recall Touch answers calls, books appointments, and runs follow-up until revenue is recovered.
          </p>
        </AnimateOnScroll>
        <StaggerChildren className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <motion.div variants={fadeUpVariants} className="card-marketing p-6 md:p-8">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Message-only answering
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Answers calls, takes messages, and stops.
            </p>
          </motion.div>
          <motion.div variants={fadeUpVariants} className="card-marketing p-6 md:p-8">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Recall Touch
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Answers calls and follows up until the lead books, converts, or opts out.
            </p>
          </motion.div>
        </StaggerChildren>

        <StaggerChildren className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: RefreshCw, title: "Automated follow-up", desc: "Missed calls, quotes, no-shows, reactivation — without manual chasing." },
            { icon: Calendar, title: "No-show recovery", desc: "Reminders + rescue follow-ups that protect bookings." },
            { icon: Phone, title: "Dead lead reactivation", desc: "Re-engage cold contacts with controlled cadence and guardrails." },
            { icon: BarChart3, title: "Revenue attribution", desc: "Tie outcomes to activity so ROI is visible and credible." },
            { icon: MessageSquare, title: "Industry workflows", desc: "Scripts and defaults built around how service businesses actually sell." },
          ].map((item) => (
            <motion.div key={item.title} variants={fadeUpVariants} className="card-marketing p-5 flex gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                <item.icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
