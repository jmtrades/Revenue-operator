"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function HomepageRoiCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(8);
  const [avgJobValue, setAvgJobValue] = useState(600);

  const {
    monthlyLost,
    monthlyRecovered,
    annualRecovered,
    paybackWeeks,
  } = useMemo(() => {
    const weekly = Math.max(0, Math.min(100, missedPerWeek));
    const value = Math.max(50, Math.min(5000, avgJobValue));

    const monthlyLostRaw = weekly * 4 * value;
    const monthlyRecoveredRaw = monthlyLostRaw * 0.75;
    const annualRecoveredRaw = monthlyRecoveredRaw * 12;

    const growthPlanMonthly = 297;
    const payback =
      monthlyRecoveredRaw > 0
        ? Math.max(1, Math.ceil(growthPlanMonthly / (monthlyRecoveredRaw / 4)))
        : 0;

    return {
      monthlyLost: monthlyLostRaw,
      monthlyRecovered: monthlyRecoveredRaw,
      annualRecovered: annualRecoveredRaw,
      paybackWeeks: payback,
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
              See how much revenue Recall Touch can recover for you.
            </h2>
            <p
              className="text-sm md:text-base max-w-xl"
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              Plug in rough numbers for your business. We estimate how much
              revenue is slipping through the cracks from missed calls and how
              quickly an AI phone agent pays for itself on the Growth plan.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                ✓ Uses a simple 75% recovery assumption — conservative for most
                service businesses.
              </li>
              <li
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                ✓ Benchmarked against a $297/mo Growth plan, not a hypothetical
                enterprise quote.
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
            <div className="grid gap-5 mb-6">
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
                when those callers don&apos;t get answered or followed up.
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                With Recall Touch handling those calls and follow-ups,{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--accent-primary)" }}
                >
                  you recover around $
                  {monthlyRecovered.toLocaleString()}/month
                </span>{" "}
                and $
                {annualRecovered.toLocaleString()}
                /year in additional booked work.
              </p>
              {paybackWeeks > 0 && (
                <p style={{ color: "var(--text-primary)" }}>
                  On the{" "}
                  <span className="font-semibold">Growth ($297/mo)</span> plan,
                  your payback is roughly{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {paybackWeeks} week{paybackWeeks === 1 ? "" : "s"}
                  </span>{" "}
                  of recovered revenue.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Link
                href={ROUTES.PRICING}
                className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 text-sm text-center hover:bg-zinc-100 transition-colors no-underline"
              >
                See recommended plan →
              </Link>
              <p
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                Real customers typically see 4–10x ROI on the Growth plan within
                the first 30 days.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

