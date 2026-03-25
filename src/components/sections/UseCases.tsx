"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Building2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const CASE_IDS = ["inbound", "outbound", "regulated"] as const;
const ICONS = [ArrowDownToLine, ArrowUpFromLine, Building2];
const HREFS = ["/product#inbound", "/product#outbound", "/product#regulated"] as const;

export function UseCases() {
  const t = useTranslations("homepage.useCasesAlt");
  const cases = useMemo(
    () =>
      CASE_IDS.map((id, i) => ({
        icon: ICONS[i],
        title: t(`cases.${id}.title`),
        desc: t(`cases.${id}.desc`),
        href: HREFS[i],
      })),
    [t]
  );

  return (
    <section id="built-for" className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}
          >
            {t("heading")}
          </h2>
        </AnimateOnScroll>
        <StaggerChildren className="grid md:grid-cols-3 gap-6">
          {cases.map((c) => (
            <motion.div key={c.title} variants={fadeUpVariants} className="card-marketing p-8 flex flex-col">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
              >
                <c.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                {c.title}
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                {c.desc}
              </p>
              <Link href={c.href} className="text-sm font-medium mt-auto inline-block" style={{ color: "var(--accent-primary)" }}>
                {t("cta.link")}
              </Link>
            </motion.div>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
