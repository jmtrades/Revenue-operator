"use client";

/**
 * Phase 84 — Mini ROI bar for the pricing section.
 *
 * Addresses deterrent P2 #8 from
 * docs/superpowers/evidence/phase-83-critical-analysis.md: visitors who
 * navigated past the hero ROI calculator lose access to their personal
 * $-figure exactly when they're being asked to pay. This compact strip
 * lives directly above the pricing tier cards and re-anchors the personal
 * proof-of-value math in two interactions: (1) drag the slider, (2) see
 * the recovered figure update.
 *
 * Reuses the same conservative recovery rate (70%) and Business plan price
 * ($297/mo) as the hero so the "pays for itself N.Nx" arithmetic is
 * self-consistent across the page. No new i18n keys; copy is in-component
 * because it's display-numeric heavy and the calculator labels
 * already exist on the hero.
 */

import { useEffect, useMemo, useRef, useState } from "react";

const RECOVERY_RATE = 0.7;
const BUSINESS_PLAN_USD = 297;

function formatMoney(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** RAF-driven counter that eases from prev → target in ~400ms.
 *  Identical pattern to the hero's useAnimatedNumber so the page
 *  reads as one cohesive interactive surface. */
function useAnimatedNumber(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const duration = 400;
    let raf = 0;
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const t = Math.min(1, (timestamp - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

export function PricingMiniRoi() {
  // Defaults match the hero so visitors see consistent numbers if they
  // haven't tweaked anything.
  const [opps, setOpps] = useState(220);
  const [gap, setGap] = useState(22);
  const [deal, setDeal] = useState(1000);

  const { recovered, paysForItself } = useMemo(() => {
    const o = Math.max(0, Math.min(4000, opps));
    const g = Math.max(0, Math.min(80, gap)) / 100;
    const d = Math.max(200, deal);
    const lost = o * g * d;
    const r = lost * RECOVERY_RATE;
    return { recovered: r, paysForItself: r / BUSINESS_PLAN_USD };
  }, [opps, gap, deal]);

  const animated = useAnimatedNumber(recovered);

  return (
    <div
      className="max-w-4xl mx-auto rounded-2xl px-6 py-5 mb-10"
      style={{
        background: "var(--bg-inset)",
        border: "1px solid var(--border-default)",
      }}
      aria-label="Personal ROI estimate"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-center">
        {/* Left: three compact controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Monthly opportunities
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {opps}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2000}
              step={10}
              value={opps}
              onChange={(e) => setOpps(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer"
              style={{ accentColor: "var(--accent-primary)" }}
              aria-label="Monthly opportunities"
            />
          </label>
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Revenue gap
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {gap}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer"
              style={{ accentColor: "var(--accent-primary)" }}
              aria-label="Revenue gap percentage"
            />
          </label>
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Avg deal value
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                ${deal.toLocaleString("en-US")}
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={10000}
              step={100}
              value={deal}
              onChange={(e) => setDeal(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer"
              style={{ accentColor: "var(--accent-primary)" }}
              aria-label="Average deal value"
            />
          </label>
        </div>

        {/* Right: the answer */}
        <div className="text-center lg:text-right lg:border-l lg:border-[var(--border-default)] lg:pl-5">
          <p
            className="text-[10px] font-semibold uppercase mb-1"
            style={{
              letterSpacing: "0.16em",
              color: "var(--text-tertiary)",
            }}
          >
            You&apos;d recover
          </p>
          <p
            className="num-editorial"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)",
              color: "var(--accent-secondary)",
              lineHeight: 1,
            }}
            aria-live="polite"
          >
            ${formatMoney(animated)}
            <span
              className="text-sm font-normal ml-1.5 align-middle"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-body-sans)",
              }}
            >
              / month
            </span>
          </p>
          {paysForItself >= 1 ? (
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                {paysForItself.toFixed(1)}× ROI
              </span>{" "}
              on the Business plan
            </p>
          ) : (
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Adjust the sliders to your real numbers
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
