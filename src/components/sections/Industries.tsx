"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Wrench, Heart, Scale, Home, Smile, Sparkles, Stethoscope, Building2, Users } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const INDUSTRY_IDS = ["plumbing", "healthcare", "legal", "realEstate", "dental", "roofing", "medspa", "recruiting"] as const;
const ICONS = [Wrench, Stethoscope, Scale, Home, Smile, Building2, Heart, Users];
const SLUGS = ["plumbing-hvac", "healthcare", "legal", "real-estate", "dental", "roofing", "med-spa", "recruiting"] as const;

export function Industries() {
  const t = useTranslations("homepage.industries");
  const industries = useMemo(
    () =>
      INDUSTRY_IDS.map((id, i) => ({
        icon: ICONS[i],
        name: t(`industries.${id}.name`),
        slug: SLUGS[i],
        desc: t(`industries.${id}.desc`),
      })),
    [t]
  );

  return (
    <section id="industries" className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
          <p className="mt-3 text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {t("subheading")}
          </p>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-2">
          {industries.map((ind) => (
            <Link key={ind.name} href={`/industries/${ind.slug}`}>
              <motion.div
                variants={fadeUpVariants}
                className="card-marketing p-6 flex flex-col min-w-[260px] hover:border-[var(--accent-primary)] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                  <ind.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{ind.name}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ind.desc}</p>
              </motion.div>
            </Link>
          ))}
          <Link href="/activate">
            <motion.div
              variants={fadeUpVariants}
              className="card-marketing p-6 flex flex-col min-w-[260px] hover:border-[var(--accent-primary)] transition-colors border-dashed h-full"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{t("industries.custom.name")}</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{t("industries.custom.desc")}</p>
            </motion.div>
          </Link>
        </StaggerChildren>
      </Container>
    </section>
  );
}
