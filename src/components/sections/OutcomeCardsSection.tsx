"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Phone, UserPlus, CalendarCheck } from "lucide-react";

export function OutcomeCardsSection() {
  const t = useTranslations("homepage.outcomes");

  const cards = useMemo(
    () => [
      { icon: Phone, title: t("cards.missedCalls.title"), description: t("cards.missedCalls.desc") },
      { icon: UserPlus, title: t("cards.leads.title"), description: t("cards.leads.desc") },
      { icon: CalendarCheck, title: t("cards.appointments.title"), description: t("cards.appointments.desc") },
    ],
    [t]
  );

  const pricingTiers = useMemo(
    () => [
      {
        name: t("pricingTiers.starter.name"),
        price: "$97",
        tagline: t("pricingTiers.starter.tagline"),
        features: [t("pricingTiers.starter.f1"), t("pricingTiers.starter.f2"), t("pricingTiers.starter.f3"), t("pricingTiers.starter.f4")],
        badge: null as string | null,
      },
      {
        name: t("pricingTiers.growth.name"),
        price: "$297",
        tagline: t("pricingTiers.growth.tagline"),
        features: [t("pricingTiers.growth.f1"), t("pricingTiers.growth.f2"), t("pricingTiers.growth.f3"), t("pricingTiers.growth.f4")],
        badge: t("pricingTiers.badgePopular"),
      },
      {
        name: t("pricingTiers.scale.name"),
        price: "$597",
        tagline: t("pricingTiers.scale.tagline"),
        features: [t("pricingTiers.scale.f1"), t("pricingTiers.scale.f2"), t("pricingTiers.scale.f3"), t("pricingTiers.scale.f4")],
        badge: null as string | null,
      },
    ],
    [t]
  );

  return (
    <section className="py-16 md:py-20 border-t border-[var(--border-default)] bg-[var(--bg-base)]">
      <Container>
        <div className="max-w-3xl mb-10">
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            {t("heading")}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            {t("subheading")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-white/80" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                {t("pricing.heading")}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-tertiary)] max-w-xl">
                {t("pricing.subheading")}
              </p>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("pricing.trialNote")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border bg-[var(--bg-card)] p-6 flex flex-col ${
                  tier.badge
                    ? "border-[var(--border-default)] shadow-[0_0_40px_rgba(15,23,42,0.8)] relative overflow-hidden"
                    : "border-[var(--border-default)]"
                }`}
              >
                {tier.badge && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                )}
                {tier.badge && (
                  <span className="self-start mb-3 inline-flex items-center rounded-full bg-white text-black text-[11px] font-semibold px-2.5 py-1">
                    {tier.badge}
                  </span>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-white">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-tertiary)]">{tier.tagline}</p>
                </div>
                <div className="mb-5">
                  <span className="text-3xl font-semibold text-white">
                    {tier.price}
                  </span>
                  <span className="text-sm text-[var(--text-tertiary)] ml-1">/month</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-[var(--text-secondary)]">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/50" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-colors"
                >
                  {t("cta.button")}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
