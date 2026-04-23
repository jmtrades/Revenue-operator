"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { User, Users, Building2, Moon, Megaphone, Phone } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const PERSONA_IDS = ["solo", "growing", "agencies", "afterHours", "outbound", "anyone"] as const;
const ICONS = [User, Users, Building2, Moon, Megaphone, Phone];

export function WhoUsesSection() {
  const t = useTranslations("homepage.whoUses");
  const personas = useMemo(
    () =>
      PERSONA_IDS.map((id, i) => ({
        icon: ICONS[i],
        name: t(`personas.${id}.name`),
        desc: t(`personas.${id}.desc`),
      })),
    [t]
  );

  return (
    <section id="who-uses" className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-editorial max-w-2xl mx-auto" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {personas.map((persona) => {
            const Icon = persona.icon;
            return (
              <Link key={persona.name} href="/activate">
                <motion.div
                  variants={fadeUpVariants}
                  className="card-marketing p-6 flex flex-col h-full hover:border-[var(--border-default)] transition-colors min-w-0"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{persona.name}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{persona.desc}</p>
                </motion.div>
              </Link>
            );
          })}
        </StaggerChildren>
        <AnimateOnScroll className="text-center mt-10">
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            {t("additionalNote")}
          </p>
          <Link href="/activate" className="inline-block font-semibold text-sm" style={{ color: "var(--accent-primary)" }}>
            {t("cta.link")}
          </Link>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
