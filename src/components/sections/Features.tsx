"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Phone, PhoneOutgoing, Calendar, Target, AlertCircle, MessageSquare, Brain, BarChart3, RefreshCw, Inbox, Megaphone } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const CAPABILITY_IDS = [
  "answersCalls",
  "unifiedInbox",
  "outbound",
  "campaigns",
  "books",
  "captures",
  "routing",
  "texting",
  "learns",
  "roi",
  "neverGivesUp",
] as const;
const ICONS = [Phone, Inbox, PhoneOutgoing, Megaphone, Calendar, Target, AlertCircle, MessageSquare, Brain, BarChart3, RefreshCw];

export function Features() {
  const t = useTranslations("homepage.features");
  const capabilities = useMemo(
    () =>
      CAPABILITY_IDS.map((id, i) => ({
        icon: ICONS[i],
        title: t(`capabilities.${id}.title`),
        desc: t(`capabilities.${id}.desc`),
      })),
    [t]
  );

  return (
    <section id="capabilities" className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {capabilities.map((item) => (
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
