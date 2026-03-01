"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";
import { PRICING_TIERS, ROUTES } from "@/lib/constants";

const TIER_ROI: Record<string, string> = {
  Starter: "Less than one missed service call",
  Professional: "One recovered lead pays for 6 months",
  Business: "Replace a $55K/year SDR for $4,200/year",
  Enterprise: "Custom ROI and dedicated support",
};

export function PricingPreview() {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Less than one missed call a month.
          </h2>
        </AnimateOnScroll>
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="text-sm font-medium" style={{ color: !annual ? "var(--text-primary)" : "var(--text-tertiary)" }}>Monthly</span>
          <button type="button" role="switch" aria-checked={annual} onClick={() => setAnnual((a) => !a)} className="relative w-12 h-7 rounded-full border transition-colors" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
            <span className="absolute top-0.5 w-6 h-6 rounded-full transition-all duration-200" style={{ left: annual ? "calc(100% - 26px)" : "2px", background: annual ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
          </button>
          <span className="text-sm font-medium flex items-center gap-2" style={{ color: annual ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            Annual
            {annual && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--accent-secondary-subtle)", color: "var(--accent-secondary)" }}>Save 20%</span>}
          </span>
        </div>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeUpVariants}
              className="card-marketing p-8 relative"
              style={tier.popular ? { borderColor: "var(--accent-primary)", boxShadow: "0 0 0 1px var(--accent-primary)" } : undefined}
            >
              {tier.popular && (
                <span className="pill-popular absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" /> Popular
                </span>
              )}
              <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>{tier.name}</h3>
              <p className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                {annual ? tier.priceAnnual : tier.priceMonthly}
                <span className="text-sm font-normal" style={{ color: "var(--text-tertiary)" }}>{tier.period}</span>
              </p>
              <p className={`text-sm ${TIER_ROI[tier.name] ? "mb-2" : "mb-6"}`} style={{ color: "var(--text-secondary)" }}>{tier.description}</p>
              {TIER_ROI[tier.name] && (
                <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>{TIER_ROI[tier.name]}</p>
              )}
              <ul className="space-y-2 mb-8">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent-secondary)" }} />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.cta === "Talk to sales" ? ROUTES.CONTACT : ROUTES.START}
                className={tier.cta === "Talk to sales" ? "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline" : tier.popular ? "btn-marketing-primary w-full block text-center py-3 rounded-lg no-underline" : "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline"}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </StaggerChildren>
        <p className="text-center text-sm mt-8" style={{ color: "var(--text-tertiary)" }}>
          All plans include: encrypted records · compliance framework · audit trail · 14-day free trial
        </p>
        <p className="text-center mt-3">
          <Link href={ROUTES.PRICING} className="text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 rounded" style={{ color: "var(--accent-primary)" }}>
            View full plan comparison →
          </Link>
        </p>
      </Container>
    </section>
  );
}
