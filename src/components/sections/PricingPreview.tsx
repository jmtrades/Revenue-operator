"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Check } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";
import { PRICING_TIERS, ROUTES } from "@/lib/constants";

const TIER_ROI_KEYS: Record<string, string> = {
  Starter: "starter",
  Growth: "growth",
  Scale: "scale",
  Enterprise: "enterprise",
};

export function PricingPreview() {
  const t = useTranslations("homepage.pricingPreview");
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>{t("label")}</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
        </AnimateOnScroll>
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="text-sm font-medium" style={{ color: !annual ? "var(--text-primary)" : "var(--text-tertiary)" }}>{t("toggle.monthly")}</span>
          <button type="button" role="switch" aria-checked={annual} onClick={() => setAnnual((a) => !a)} className="relative w-12 h-7 rounded-full border transition-colors" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
            <span className="absolute top-0.5 w-6 h-6 rounded-full transition-all duration-200" style={{ left: annual ? "calc(100% - 26px)" : "2px", background: annual ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
          </button>
          <span className="text-sm font-medium flex items-center gap-2" style={{ color: annual ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {t("toggle.annual")}
            {annual && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#22C55E20", color: "#22C55E" }}>{t("toggle.savings")}</span>}
          </span>
        </div>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => {
            const tierKey = TIER_ROI_KEYS[tier.name];
            const roiText = tierKey ? t(`tierRoi.${tierKey}`) : null;
            const name = tierKey ? t(`tiers.${tierKey}.name`) : tier.name;
            const description = tierKey ? t(`tiers.${tierKey}.description`) : tier.description;
            const featuresRaw = tierKey ? (t.raw(`tiers.${tierKey}.features`) as string[] | undefined) : null;
            const features = Array.isArray(featuresRaw) ? featuresRaw : tier.features;
            const ctaText = tierKey ? t(`tiers.${tierKey}.cta`) : tier.cta;
            const period = t("period");
            return (
              <motion.div
                key={tier.name}
                variants={fadeUpVariants}
                className="card-marketing p-8 relative"
                style={tier.popular ? { borderColor: "var(--accent-primary)", boxShadow: "0 0 0 1px var(--accent-primary)" } : undefined}
              >
                {tier.popular && (
                  <span className="pill-popular absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" /> {t("badge")}
                  </span>
                )}
                <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>{name}</h3>
                <p className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                  {annual ? tier.priceAnnual : tier.priceMonthly}
                  <span className="text-sm font-normal" style={{ color: "var(--text-tertiary)" }}>{period}</span>
                </p>
                <p className={`text-sm ${roiText ? "mb-2" : "mb-6"}`} style={{ color: "var(--text-secondary)" }}>{description}</p>
                {roiText && (
                  <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>{roiText}</p>
                )}
                <ul className="space-y-2 mb-8">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent-secondary)" }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={ctaText === "Talk to sales" ? ROUTES.CONTACT : ROUTES.START}
                  className={ctaText === "Talk to sales" ? "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline" : tier.popular ? "btn-marketing-primary w-full block text-center py-3 rounded-lg no-underline" : "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline"}
                >
                  {ctaText}
                </Link>
              </motion.div>
            );
          })}
        </StaggerChildren>
        <p className="text-center text-sm mt-8" style={{ color: "var(--text-tertiary)" }}>
          {t("footerNote")}
        </p>
        <p className="text-center mt-3">
          <Link href={ROUTES.PRICING} className="text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 rounded" style={{ color: "var(--accent-primary)" }}>
            {t("cta.link")}
          </Link>
        </p>
      </Container>
    </section>
  );
}
