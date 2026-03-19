"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function HomepageRoiCalculator() {
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

  const { monthlyLost, monthlyRecovered, annualRecovered, paysForItself } = useMemo(() => {
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
      className="py-12 md:py-16 border-t"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-base)",
      }}
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
          <div>
            <p
              className="text-sm font-medium mb-2 tracking-wide uppercase"
              style={{ color: "var(--accent-primary)" }}
            >
              Revenue math
            </p>
            <h2
              className="font-semibold text-2xl md:text-3xl mb-4"
              style={{
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                color: "var(--text-primary)",
              }}
            >
              Calculate your revenue operations gap.
            </h2>
            <p
              className="text-sm md:text-base max-w-xl"
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              Drag the sliders. We estimate your monthly revenue operations gap, then show what Recall Touch can recover with consistent automation and follow-up execution.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                ✓ Uses conservative recovery assumptions based on real call data.
              </li>
              <li
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                ✓ Shows monthly recovery and whether Business pays for itself.
              </li>
            </ul>
          </div>

          <div
            className="rounded-2xl p-6 md:p-7"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="grid gap-4 mb-6">
              <label className="block">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Monthly opportunities
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    step={10}
                    value={monthlyOpportunities}
                    onChange={(event) => setMonthlyOpportunities(Number(event.target.value))}
                    className="flex-1 h-2 rounded-lg cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <span className="text-sm font-medium w-16 text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {monthlyOpportunities}
                  </span>
                </div>
              </label>

              <label className="block">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Revenue gap (%)
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={1}
                    value={revenueGapPct}
                    onChange={(event) => setRevenueGapPct(Number(event.target.value))}
                    className="flex-1 h-2 rounded-lg cursor-pointer"
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
                  Average deal value
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVG_VALUE_OPTIONS.map((opt) => {
                  const selected = avgDealValue === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          selected
                            ? "bg-white text-black"
                            : "border border-zinc-700 text-zinc-300 hover:bg-[var(--bg-inset)]"
                        }`}
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
              className="pt-4 border-t space-y-2 text-sm"
              style={{ borderColor: "var(--border-default)" }}
            >
              <p style={{ color: "var(--text-secondary)" }}>
                You&apos;re currently{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--accent-primary)" }}
                >
                  losing about ${monthlyLost.toLocaleString()}/month
                </span>{" "}
                in revenue leak.
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                With Recall Touch answering 24/7 and running recovery follow-up, you could recover around{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--accent-primary)" }}
                >
                  ${monthlyRecovered.toLocaleString()}/month
                </span>{" "}
                and ${annualRecovered.toLocaleString()}/year in recovered bookings
                and no-show rescue.
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                We base this on your average booking value, then estimate the share that slips away without automated follow-up.
              </p>
              <p style={{ color: "var(--text-primary)" }}>
                Business plan pays for itself at{" "}
                <span className="font-semibold" style={{ color: "var(--accent-primary)" }}>
                  {paysForItself.toFixed(1)}x
                </span>
                .
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={ROUTES.START}
                className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 text-sm text-center hover:bg-zinc-100 transition-colors no-underline"
              >
                Get full ROI report →
              </Link>
              <p
                className="text-xs text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                Share your email on the next step and we&apos;ll send a detailed
                breakdown by call volume, channel, and plan.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

