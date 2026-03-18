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
    title: "24/7 Call Answering",
    desc: "Never miss a call again. AI answers in under 3 seconds, every time. Nights, weekends, holidays — your AI never sleeps.",
    badge: "$450 avg per call recovered",
  },
  {
    icon: Calendar,
    title: "Intelligent Appointment Booking",
    desc: "Checks your availability in real-time. Books directly into your calendar. Sends confirmation texts to customers automatically.",
    badge: "12% more patients booked",
  },
  {
    icon: MessageSquare,
    title: "Smart Follow-Ups",
    desc: "Automatic SMS/email sequences for no-shows, cancellations, and repeat business. Uses your playbook. Learns over time.",
    badge: "23% revenue per customer increase",
  },
  {
    icon: AlertCircle,
    title: "No-Show Recovery",
    desc: "Recover 10–15% of missed appointments with automated recovery campaigns. Texts sent within 5 minutes of no-show.",
    badge: "10-15% recovery rate",
  },
  {
    icon: BarChart3,
    title: "Revenue Dashboard",
    desc: "See exactly how much money Recall Touch has recovered. Updated in real-time. Exportable for reporting.",
    badge: "Real-time ROI tracking",
  },
  {
    icon: MapPin,
    title: "Multi-Location Support",
    desc: "Scale to multiple business locations. One dashboard, all locations. Per-location analytics and agent customization.",
    badge: "Unlimited locations on Scale+",
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
            Everything You Need to Turn Missed Calls Into Revenue
          </h2>
          <p className="text-base mt-4 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Six capabilities that work together to make sure no revenue slips through the cracks.
          </p>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {FEATURES.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUpVariants}
              className="card-marketing card-feature p-6 md:p-8 flex flex-col group hover:border-emerald-500/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
              <p className="text-sm flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.desc}</p>
              {item.badge && (
                <span className="inline-flex self-start items-center mt-4 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {item.badge}
                </span>
              )}
            </motion.div>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
