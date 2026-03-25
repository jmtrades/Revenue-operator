"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function HomepageRoiCalculator() {
  const t = useTranslations("homepage.roiCalculator");
  const [monthlyOpportunities, setMonthlyOpportunities] = useState(220);
  const [avgDealValue, setAvgDealValue] = useState(1000);
  const [revenueGapPct, setRevenueGapPct] = useState(22);

  const AVG_VALUE_OPTIONS = [
    { label: "$200", value: 200 },
    { label: "$500", value: 500 },
    { label: "$1,000", value: 1000 },
    { label: "$2,500", value: 2500 },
    { label: "$5,000", value: 5000 },
    { label: "$10,000+", value: 10000 },
  ] as const;

  const { monthlyLost, monthlyRecovered, annualRecovered, paysForItself } =
    useMemo(() => {
      const opportunities = Math.max(0, Math.min(4000, monthlyOpportunities));
      const value = Math.max(200, avgDealValue);
      const missed = Math.max(0, Math.min(80, revenueGapPct)) / 100;

      const monthlyLostRaw = opportunities * missed * value;
      const monthlyRecoveredRaw = monthlyLostRaw * 0.7;
      const annualRecoveredRaw = monthlyRecoveredRaw * 12;

      const businessPlan = 297;
      const pays = businessPlan > 0 ? monthlyRecoveredRaw / businessPlan : 0;

      return {
        monthlyLost: monthlyLostRaw,
        monthlyRecovered: monthlyRecoveredRaw,
        annualRecovered: annualRecoveredRaw,
        paysForItself: pays,
      };
    }, [avgDealValue, revenueGapPct, monthlyOpportunities]);

  return (
    <section
      className="py-16 md:py-24"
      style={{
        borderTop: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
      }}
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start max-w-5xl mx-auto">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--accent-primary)" }}
            >
              {t("sectionLabel")}
            </p>
            <h2
              className="font-semibold text-2xl md:text-3xl mb-4"
              style={{
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                color: "var(--text-primary)",
              }}
            >
              {t("heading")}
            </h2>
            <p
              className="text-sm md:text-base max-w-xl leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("description")}
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                t("disclaimer1"),
                t("disclaimer2"),
              ].map((text) => (
                <li
                  key={text}
                  className="flex items-start gap-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <svg
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: "var(--accent-secondary)" }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-xl p-6 md:p-7"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="grid gap-5 mb-6">
              <label className="block">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("sliderMonthlyOpportunitiesLabel")}
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    step={10}
                    value={monthlyOpportunities}
                    onChange={(event) =>
                      setMonthlyOpportunities(Number(event.target.value))
                    }
                    className="flex-1 h-1.5 rounded-lg cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <span
                    className="text-sm font-medium w-16 text-right tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {monthlyOpportunities}
                  </span>
                </div>
              </label>

              <label className="block">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("sliderRevenueGapLabel")}
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={1}
                    value={revenueGapPct}
                    onChange={(event) =>
                      setRevenueGapPct(Number(event.target.value))
                    }
                    className="flex-1 h-1.5 rounded-lg cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <span
                    className="text-sm font-medium w-12 text-right tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {revenueGapPct}%
                  </span>
                </div>
              </label>

              <label className="block">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("sliderAverageDealValueLabel")}
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVG_VALUE_OPTIONS.map((opt) => {
                    const selected = avgDealValue === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className="px-3.5 py-2 rounded-lg text-sm font-medium transition-[background-color,border-color,color,transform]"
                        style={{
                          background: selected
                            ? "var(--accent-primary)"
                            : "transparent",
                          color: selected ? "var(--text-on-accent)" : "var(--text-secondary)",
                          border: selected
                            ? "1px solid var(--accent-primary)"
                            : "1px solid var(--border-default)",
                        }}
                        onClick={() => setAvgDealValue(opt.value)}
                        aria-pressed={selected}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </label>
            </div>

            <div
              className="pt-5 space-y-2 text-sm"
              style={{
                borderTop: "1px solid var(--border-default)",
              }}
            >
              <p style={{ color: "var(--text-secondary)" }}>
                {t("resultMonthlyLost", {
                  amount: monthlyLost.toLocaleString(),
                })}
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                {t("resultMonthlyRecovered", {
                  monthlyAmount: monthlyRecovered.toLocaleString(),
                  annualAmount: annualRecovered.toLocaleString(),
                })}
              </p>
              <p style={{ color: "var(--text-primary)" }}>
                {t("resultPaysForItself", {
                  multiple: paysForItself.toFixed(1),
                })}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={ROUTES.START}
                className="btn-marketing-blue w-full text-center no-underline block"
              >
                {t("ctaButtonText")}
              </Link>
              <p
                className="text-xs text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                {t("ctaDescription")}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
