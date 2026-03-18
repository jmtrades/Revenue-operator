"use client";

import { useTranslations } from "next-intl";
import {
  Phone, Calendar, MessageSquare, AlertCircle, BarChart3, MapPin,
} from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Phone,
    title: "AI answers every call",
    desc: "Your phone gets answered 24/7 so leads don’t slip away when you’re busy, after hours, or on weekends.",
  },
  {
    icon: Calendar,
    title: "Books appointments",
    desc: "Captures intent and books appointments with confirmations and reminders so fewer people fall through the cracks.",
  },
  {
    icon: MessageSquare,
    title: "Follows up automatically",
    desc: "Multi-step follow-up across SMS and calls — no-shows, missed calls, quotes, and reactivation — without manual chasing.",
  },
  {
    icon: AlertCircle,
    title: "Routes urgency correctly",
    desc: "Escalates emergencies and time-sensitive requests to your team while the AI handles routine scheduling and intake.",
  },
  {
    icon: BarChart3,
    title: "Shows revenue impact",
    desc: "A revenue dashboard that ties outcomes back to activity so you can see what was recovered — not just what happened.",
  },
  {
    icon: MapPin,
    title: "Works for real businesses",
    desc: "Industry-aware workflows for service businesses — designed around bookings, follow-up, and repeat revenue.",
  },
] as const;

export function Features() {
  const t = useTranslations("homepage.features");

  return (
    <section id="capabilities" className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-bold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Not Just Another AI Receptionist
          </h2>
          <p className="text-base mt-4 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Recall Touch answers calls and follows up until the revenue is recovered.
          </p>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {FEATURES.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUpVariants}
              className="card-marketing card-feature p-6 md:p-8 flex flex-col group transition-all"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
              <p className="text-sm flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.desc}</p>
            </motion.div>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
