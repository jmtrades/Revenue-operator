"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";
import { PRICING_TIERS, ROUTES } from "@/lib/constants";

const TIER_ROI_KEYS: Record<string, string> = {
  Starter: "solo",
  Growth: "business",
  Business: "scale",
  Agency: "enterprise",
};

/**
 * Phase 83 — "Who this is for" chip, one per tier. Addresses P1 #4 from
 * the critical-analysis evidence doc: visitors can't tell at a glance
 * which tier matches their self-identification, which produces decision
 * paralysis and "I'll come back later" bounces. A 3-4 word chip lets the
 * reader self-select in one glance before reading the feature list.
 */
const TIER_FIT: Record<string, string> = {
  Starter: "Solo — just starting",
  Growth: "Small team — scaling",
  Business: "Mid-market — serious",
  Agency: "Agency — multi-client",
};

export function PricingPreview() {
  const t = useTranslations("homepage.pricingPreview");
  const [annual, setAnnual] = useState(false);
  const hasAnnualPrices = PRICING_TIERS.some(
    (tier) =>
      Boolean(tier.priceAnnual) &&
      String(tier.priceAnnual) !== String(tier.priceMonthly)
  );

  useEffect(() => {
    if (!hasAnnualPrices) setAnnual(false);
  }, [hasAnnualPrices]);

  return (
    <section
      id="pricing"
      className="marketing-section"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <p
            className="eyebrow-editorial mb-5"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label")}
          </p>
          <h2
            className="font-editorial max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              color: "var(--text-primary)",
            }}
          >
            {t("heading")}
          </h2>
        </AnimateOnScroll>

        {/* Phase 83 — "Start free" lead + confidence strip above the cards.
            Addresses P2 #7 ("free-trial invisibility") and P1 #4 (risk
            reversal needs to land adjacent to the ask). Kept minimal so
            it doesn't steal focus from the tier cards themselves. */}
        <div className="max-w-2xl mx-auto text-center mb-6">
          <p
            className="font-editorial-small mb-2"
            style={{
              fontSize: "1.125rem",
              color: "var(--text-primary)",
            }}
          >
            Start free. Keep it running only if it&apos;s working.
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No credit card to start &middot; 30-day money-back on paid plans
            &middot; Cancel anytime
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-10">
          <span
            className="text-sm font-medium"
            style={{
              color: !annual
                ? "var(--text-primary)"
                : "var(--text-tertiary)",
            }}
          >
            {t("toggle.monthly")}
          </span>
          {hasAnnualPrices ? (
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual((a) => !a)}
              aria-label="Toggle between monthly and annual billing"
              className="relative w-11 h-6 rounded-full p-0"
              style={{
                touchAction: "manipulation",
                background: annual
                  ? "var(--accent-primary)"
                  : "var(--border-default)",
                transition: "background-color 200ms cubic-bezier(0.23, 1, 0.32, 1)"
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full"
                style={{
                  left: annual ? "calc(100% - 22px)" : "2px",
                  background: "var(--bg-primary)",
                  boxShadow: "var(--shadow-sm)",
                  transition: "left 200ms cubic-bezier(0.23, 1, 0.32, 1)"
                }}
              />
            </button>
          ) : null}
          {hasAnnualPrices ? (
            <span
              className="text-sm font-medium flex items-center gap-2"
              style={{
                color: annual
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              }}
            >
              {t("toggle.annual")}
              {annual && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--accent-secondary-subtle)",
                    color: "var(--accent-secondary)",
                  }}
                >
                  {t("toggle.savings")}
                </span>
              )}
            </span>
          ) : null}
        </div>

        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRICING_TIERS.map((tier) => {
            const tierKey = TIER_ROI_KEYS[tier.name];
            const roiText = tierKey ? t(`tierRoi.${tierKey}`) : null;
            const name = tierKey ? t(`tiers.${tierKey}.name`) : tier.name;
            const description = tierKey
              ? t(`tiers.${tierKey}.description`)
              : tier.description;
            const featuresRaw = tierKey
              ? (t.raw(`tiers.${tierKey}.features`) as string[] | undefined)
              : null;
            const features = Array.isArray(featuresRaw)
              ? featuresRaw
              : tier.features;
            const ctaText = tierKey ? t(`tiers.${tierKey}.cta`) : tier.cta;
            const period = t("period");
            return (
              <motion.div
                key={tier.name}
                variants={fadeUpVariants}
                className="rounded-xl p-7 relative flex flex-col card-lift"
                style={{
                  background: "var(--bg-surface)",
                  border: tier.popular
                    ? "2px solid var(--accent-primary)"
                    : "1px solid var(--border-default)",
                  boxShadow: tier.popular
                    ? "var(--shadow-glow-primary)"
                    : undefined,
                }}
              >
                {tier.popular && (
                  <motion.span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: "var(--accent-primary)",
                      color: "var(--text-on-accent)",
                    }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {t("badge")}
                  </motion.span>
                )}
                <h3
                  className="font-editorial-small text-base mb-1"
                  style={{ color: "var(--text-primary)", fontSize: "1.125rem" }}
                >
                  {name}
                </h3>
                {TIER_FIT[tier.name] ? (
                  <p
                    className="text-[11px] font-medium uppercase tracking-[0.12em] mb-3"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {TIER_FIT[tier.name]}
                  </p>
                ) : null}
                <p
                  className="num-editorial mb-4"
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "clamp(1.75rem, 2.5vw, 2rem)",
                    lineHeight: 1.1,
                  }}
                >
                  {annual ? tier.priceAnnual : tier.priceMonthly}
                  <span
                    className="text-sm font-normal ml-1"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-body-sans)",
                    }}
                  >
                    {period}
                  </span>
                </p>
                <p
                  className={`text-sm ${roiText ? "mb-2" : "mb-6"}`}
                  style={{ color: "var(--text-secondary)" }}
                >
                  {description}
                </p>
                {roiText && (
                  <p
                    className="text-xs mb-6"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {roiText}
                  </p>
                )}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <Check
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color: "var(--accent-secondary)" }}
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={
                    ctaText === "Talk to sales"
                      ? ROUTES.CONTACT
                      : `${ROUTES.START}?plan=${tier.name.toLowerCase()}`
                  }
                  className={`${
                    tier.popular
                      ? "btn-marketing-blue"
                      : "btn-marketing-ghost"
                  } w-full block text-center py-2.5 rounded-lg no-underline text-sm active:scale-[0.97]`}
                >
                  {ctaText}
                </Link>
              </motion.div>
            );
          })}
        </StaggerChildren>

        {/* Money-back guarantee */}
        <div className="flex items-center justify-center gap-2.5 mt-10 mb-4">
          <svg className="w-5 h-5 shrink-0" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd"/>
          </svg>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            30-day money-back guarantee. Cancel anytime. No questions asked.
          </p>
        </div>

        <p
          className="text-center text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("footerNote")}
        </p>
        <p className="text-center mt-3">
          <Link
            href={ROUTES.PRICING}
            className="text-sm font-medium no-underline"
            style={{ color: "var(--accent-primary)" }}
          >
            Compare all plan features
          </Link>
        </p>
      </Container>
    </section>
  );
}
