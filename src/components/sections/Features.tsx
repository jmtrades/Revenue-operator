"use client";

import { Phone, PhoneOutgoing, Calendar, Target, AlertCircle, MessageSquare, Brain, BarChart3, RefreshCw } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const CAPABILITIES = [
  { icon: Phone, title: "Answers every call", desc: "24/7, instantly, in a natural human voice." },
  { icon: PhoneOutgoing, title: "Makes outbound calls", desc: "Follows up, reminds, re-engages." },
  { icon: Calendar, title: "Books appointments", desc: "Checks your calendar, books, confirms." },
  { icon: Target, title: "Captures every lead", desc: "Qualifies, scores, texts you instantly." },
  { icon: AlertCircle, title: "Smart routing", desc: "Detects urgency, screens callers, routes to the right person or takes a message." },
  { icon: MessageSquare, title: "Texts automatically", desc: "Confirmations, reminders, follow-ups." },
  { icon: Brain, title: "Learns your world", desc: "Answers questions about your services, hours, policies, pricing — whatever you teach it." },
  { icon: BarChart3, title: "Shows your ROI", desc: "See how many leads were captured, appointments booked, and revenue recovered." },
  { icon: RefreshCw, title: "Never gives up", desc: "Follows up until the lead responds, books, or opts out." },
];

export function Features() {
  return (
    <section id="capabilities" className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>What it does</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Everything a phone team does. Nothing a phone team costs.
          </h2>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {CAPABILITIES.map((item) => (
            <motion.div key={item.title} variants={fadeUpVariants} className="card-marketing card-feature p-6 md:p-8 flex flex-col">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.desc}</p>
            </motion.div>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
