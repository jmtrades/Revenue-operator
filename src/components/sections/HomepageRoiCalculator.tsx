"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

type IndustryKey = "homeServices" | "health" | "legal" | "auto" | "other";

const INDUSTRY_PRESETS: Record<
  IndustryKey,
  { label: string; missedPerWeek: number; avgJobValue: number }
> = {
  homeServices: { label: "Home services", missedPerWeek: 14, avgJobValue: 650 },
  health: { label: "Health & wellness", missedPerWeek: 18, avgJobValue: 180 },
  legal: { label: "Legal & professional", missedPerWeek: 10, avgJobValue: 1200 },
  auto: { label: "Auto & repair", missedPerWeek: 16, avgJobValue: 450 },
  other: { label: "Other / custom", missedPerWeek: 8, avgJobValue: 400 },
};

export function HomepageRoiCalculator() {
  const [industry, setIndustry] = useState<IndustryKey>("homeServices");
  const [missedPerWeek, setMissedPerWeek] = useState(
    INDUSTRY_PRESETS.homeServices.missedPerWeek,
  );
  const [avgJobValue, setAvgJobValue] = useState(
    INDUSTRY_PRESETS.homeServices.avgJobValue,
  );

  const {
    monthlyLost,
    monthlyRecovered,
    annualRecovered,
    roiMultiple,
  } = useMemo(() => {
    const weekly = Math.max(0, Math.min(100, missedPerWeek));
    const value = Math.max(50, Math.min(5000, avgJobValue));

    const monthlyLostRaw = weekly * 4 * value;
    const monthlyRecoveredRaw = monthlyLostRaw * 0.7;
    const annualRecoveredRaw = monthlyRecoveredRaw * 12;

    const soloCost = 49;
    const businessCost = 297;
    const scaleCost = 997;

    const bestCost =
      monthlyRecoveredRaw <= 4000
        ? soloCost
        : monthlyRecoveredRaw <= 12000
        ? businessCost
        : scaleCost;

    const roi =
      bestCost > 0 && monthlyRecoveredRaw > 0
        ? Number((monthlyRecoveredRaw / bestCost).toFixed(1))
        : 0;

    return {
      monthlyLost: monthlyLostRaw,
      monthlyRecovered: monthlyRecoveredRaw,
      annualRecovered: annualRecoveredRaw,
      roiMultiple: roi,
    };
  }, [avgJobValue, missedPerWeek]);

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
              Revenue math, not vibes
            </p>
            <h2
              className="font-semibold text-2xl md:text-3xl mb-4"
              style={{
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                color: "var(--text-primary)",
              }}
            >
              See how much missed-call revenue you can recover.
            </h2>
            <p
              className="text-sm md:text-base max-w-xl"
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              Choose your industry and drag the sliders. We estimate how much revenue
              is currently leaking from missed calls — and how much Recall Touch can
              put back in your pipeline every month.
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
                ✓ Shows estimated monthly recovery and ROI multiple on your plan.
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
                  Industry
                </span>
                <select
                  className="mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-white"
                  value={industry}
                  onChange={(event) => {
                    const key = event.target.value as IndustryKey;
                    setIndustry(key);
                    const preset = INDUSTRY_PRESETS[key];
                    setMissedPerWeek(preset.missedPerWeek);
                    setAvgJobValue(preset.avgJobValue);
                  }}
                >
                  {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Missed or mishandled calls per week
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={1}
                    value={missedPerWeek}
                    onChange={(event) =>
                      setMissedPerWeek(Number(event.target.value))
                    }
                    className="flex-1 h-2 rounded-lg cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <span
                    className="text-sm font-medium w-12 text-right tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {missedPerWeek}
                  </span>
                </div>
              </label>

              <label className="block">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Average value of a booked job
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={avgJobValue}
                    onChange={(event) =>
                      setAvgJobValue(Number(event.target.value))
                    }
                    className="flex-1 h-2 rounded-lg cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <span
                    className="text-sm font-medium w-20 text-right tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ${avgJobValue.toLocaleString()}
                  </span>
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
                in missed-call revenue.
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                With Recall Touch answering 24/7, you could recover around{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--accent-primary)" }}
                >
                  ${monthlyRecovered.toLocaleString()}/month
                </span>{" "}
                and ${annualRecovered.toLocaleString()}/year in additional booked
                work.
              </p>
              {roiMultiple > 0 && (
                <p style={{ color: "var(--text-primary)" }}>
                  That&apos;s roughly a{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {roiMultiple}x ROI
                  </span>{" "}
                  on a typical Recall Touch plan.
                </p>
              )}
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

