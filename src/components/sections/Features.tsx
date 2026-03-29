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
  const t = useTranslations("marketing.features");

  return (
    <section id="capabilities" className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-bold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
          <p className="text-base mt-4 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            {t("description")}
          </p>
        </AnimateOnScroll>
        <StaggerChildren className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <motion.div variants={fadeUpVariants} className="card-marketing p-6 md:p-8">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("messageOnlyTitle")}
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {t("messageOnlyDesc")}
            </p>
          </motion.div>
          <motion.div variants={fadeUpVariants} className="card-marketing p-6 md:p-8">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("revenueOperatorTitle")}
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {t("revenueOperatorDesc")}
            </p>
          </motion.div>
        </StaggerChildren>

        <StaggerChildren className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: RefreshCw, key: "automatedFollowUp" },
            { icon: Calendar, key: "noShowRecovery" },
            { icon: Phone, key: "deadLeadReactivation" },
            { icon: BarChart3, key: "revenueAttribution" },
            { icon: MessageSquare, key: "industryWorkflows" },
          ].map((item) => (
            <motion.div key={item.key} variants={fadeUpVariants} className="card-marketing p-5 flex gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                <item.icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t(`${item.key}.title`)}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{t(`${item.key}.desc`)}</p>
              </div>
            </motion.div>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
