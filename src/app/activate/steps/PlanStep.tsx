"use client";

import { useTranslations } from "next-intl";
import { BILLING_PLANS } from "@/lib/billing-plans";
import type { PlanSlug } from "@/lib/billing-plans";

interface PlanStepProps {
  selectedPlan: PlanSlug | null;
  onSelectPlan: (plan: PlanSlug) => void;
  onNext: () => void;
  canGoNext: boolean;
}

export function PlanStep({ selectedPlan, onSelectPlan, onNext, canGoNext }: PlanStepProps) {
  const t = useTranslations("activate");

  const plans: PlanSlug[] = ["solo", "business", "scale", "enterprise"];

  const getKeyFeatures = (slug: PlanSlug): string[] => {
    const plan = BILLING_PLANS[slug];
    const features = [];

    if (plan.maxAgents > 0) {
      features.push(`${plan.maxAgents} AI Agent${plan.maxAgents > 1 ? "s" : ""}`);
    }
    if (plan.includedMinutes > 0) {
      features.push(`${plan.includedMinutes} min/month`);
    }
    if (plan.maxPhoneNumbers > 0) {
      features.push(`${plan.maxPhoneNumbers} Phone Number${plan.maxPhoneNumbers > 1 ? "s" : ""}`);
    }
    if (plan.features.appointmentBooking) {
      features.push("Appointment Booking");
    }

    return features;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          {t("planSelection.title", { defaultValue: "Choose Your Plan" })}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("planSelection.subtitle", { defaultValue: "Get started today and upgrade or downgrade anytime." })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((planSlug) => {
          const plan = BILLING_PLANS[planSlug];
          const isSelected = selectedPlan === planSlug;
          const isMostPopular = planSlug === "business";

          return (
            <button
              key={planSlug}
              type="button"
              onClick={() => onSelectPlan(planSlug)}
              className={`relative p-5 rounded-xl border-2 transition-[border-color,box-shadow,transform] duration-200 text-left
                ${
                  isSelected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 shadow-md shadow-[var(--accent-primary)]/20"
                    : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-hover)]"
                }
              `}
            >
              {isMostPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-primary)] text-white">
                    {t("planSelection.mostPopular", { defaultValue: "Most Popular" })}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {plan.label}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    ${(plan.monthlyPrice / 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]/70">
                    {t("planSelection.perMonth", { defaultValue: "/month" })}
                  </span>
                </div>
              </div>

              <div className="mb-4 pb-4 border-b border-[var(--border-default)]">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {t("planSelection.getStartedLabel", { defaultValue: "Get started today" })}
                </p>
              </div>

              <div className="space-y-2">
                {getKeyFeatures(planSlug).map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--accent-primary)]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-[var(--text-secondary)]">{feature}</span>
                  </div>
                ))}
              </div>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-[var(--accent-primary)]/30">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--accent-primary)]">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {t("planSelection.selected", { defaultValue: "Selected" })}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("continue", { defaultValue: "Continue" })}
        </button>
      </div>
    </div>
  );
}
