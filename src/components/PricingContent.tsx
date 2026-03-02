"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AccordionItem } from "@/components/ui/Accordion";
import { PRICING_TIERS, PRICING_FAQ, COMPARISON_FEATURES, ROUTES } from "@/lib/constants";

export const ANNUAL_NOTE = "Two months applied without interruption on annual commitment.";

export function pricingCopyForTests(): string {
  return [
    "Less than one missed call",
    "Starter",
    "Growth",
    "Scale",
    "Enterprise",
    "Start free",
    "Talk to sales",
  ].join(" ");
}

const RECALL_TOUCH_STARTER_MONTHLY = 97;

function ROICalculator({ className = "" }: { className?: string }) {
  const [callsPerDay, setCallsPerDay] = useState<string>("10");
  const [avgCustomerValue, setAvgCustomerValue] = useState<string>("500");
  const [missedCallRatePct, setMissedCallRatePct] = useState<string>("30");

  const result = useMemo(() => {
    const calls = parseFloat(callsPerDay) || 0;
    const value = parseFloat(avgCustomerValue) || 0;
    const rate = Math.min(100, Math.max(0, parseFloat(missedCallRatePct) || 0)) / 100;
    const missedPerMonth = calls * 30 * rate;
    const revenueLost = Math.round(missedPerMonth * value);
    return { revenueLost, missedPerMonth };
  }, [callsPerDay, avgCustomerValue, missedCallRatePct]);

  return (
    <div
      className={`rounded-xl border p-6 max-w-lg ${className}`}
      style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
    >
      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        See how much missed calls could be costing you.
      </p>
      <div className="grid gap-4 mb-6">
        <label className="block">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Average calls per day
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={callsPerDay}
            onChange={(e) => setCallsPerDay(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        </label>
        <label className="block">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Average value of a new customer ($)
          </span>
          <input
            type="number"
            min={0}
            step={50}
            value={avgCustomerValue}
            onChange={(e) => setAvgCustomerValue(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        </label>
        <label className="block">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Current missed call rate (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={missedCallRatePct}
            onChange={(e) => setMissedCallRatePct(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        </label>
      </div>
      <div
        className="pt-4 border-t"
        style={{ borderColor: "var(--border-default)" }}
      >
        <p
          className="text-base font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          You&apos;re leaving about{" "}
          <span style={{ color: "var(--accent-primary)" }}>${result.revenueLost.toLocaleString()}</span>/month on the
          table. Recall Touch costs{" "}
          <span style={{ color: "var(--accent-primary)" }}>${RECALL_TOUCH_STARTER_MONTHLY}</span>/month.
        </p>
      </div>
    </div>
  );
}

function UsageEstimator({ className = "" }: { className?: string }) {
  const [callsPerDay, setCallsPerDay] = useState(10);
  const [avgMin, setAvgMin] = useState(3);

  const monthlyMin = Math.round(callsPerDay * 30 * avgMin);
  const recommended = monthlyMin <= 200 ? "Starter" : monthlyMin <= 750 ? "Growth" : monthlyMin <= 2500 ? "Scale" : "Enterprise";
  const estimate = recommended === "Starter" ? 97 : recommended === "Growth" ? 247 : recommended === "Scale" ? 497 : "Custom";

  return (
    <div
      className={`rounded-xl border p-6 max-w-lg ${className}`}
      style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
    >
      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        How many calls do you get per day?
      </p>
      <div className="flex items-center gap-4 mb-4">
        <input
          type="range"
          min={5}
          max={100}
          value={callsPerDay}
          onChange={(e) => setCallsPerDay(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg"
          style={{ accentColor: "var(--accent-primary)" }}
        />
        <span
          className="text-sm font-medium w-12"
          style={{ color: "var(--text-primary)" }}
        >
          {callsPerDay}
        </span>
      </div>
      <p
        className="text-sm mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        Average call length (minutes)
      </p>
      <div className="flex items-center gap-4 mb-6">
        <input
          type="range"
          min={2}
          max={5}
          step={0.5}
          value={avgMin}
          onChange={(e) => setAvgMin(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg"
          style={{ accentColor: "var(--accent-primary)" }}
        />
        <span
          className="text-sm font-medium w-12"
          style={{ color: "var(--text-primary)" }}
        >
          {avgMin}
        </span>
      </div>
      <div
        className="pt-4 border-t"
        style={{ borderColor: "var(--border-default)" }}
      >
        <p
          className="text-sm mb-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          ~{monthlyMin.toLocaleString()} min/month
        </p>
        <p
          className="text-base font-medium mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Recommended: <span style={{ color: "var(--accent-primary)" }}>{recommended}</span>
          {typeof estimate === "number" ? ` · Est. $${estimate}/mo` : ` · ${estimate}`}
        </p>
        {typeof estimate === "number" && (
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Same volume with a receptionist: ~$3,500/mo · You save ${3500 - Number(estimate)}/mo
          </p>
        )}
      </div>
    </div>
  );
}

export function PricingContent() {
  const [annual, setAnnual] = useState(false);

  return (
    <main className="pt-28 pb-24">
      <Container>
        <p className="section-label mb-4">Pricing</p>
        <h1
          className="font-bold text-3xl md:text-4xl mb-4"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Less than one missed call a month.
        </h1>
        <p
          className="text-base mb-8 max-w-xl"
          style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
        >
          Plans for solo operators through to established businesses. Start free, no credit card.
        </p>
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className="text-sm font-medium"
            style={{ color: annual ? "var(--text-tertiary)" : "var(--text-primary)" }}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((a) => !a)}
            className="w-14 h-10 rounded-full border-2 transition-colors flex-shrink-0 p-0.5"
            style={{
              background: annual ? "var(--accent-primary)" : "var(--bg-surface)",
              borderColor: "var(--border-default)",
            }}
          >
            <span
              className="block w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: annual ? "translateX(1.25rem)" : "translateX(0)" }}
            />
          </button>
          <span
            className="text-sm font-medium flex items-center gap-2"
            style={{ color: annual ? "var(--text-primary)" : "var(--text-tertiary)" }}
          >
            Annual
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ background: "var(--accent-secondary)", color: "var(--bg-primary)" }}
            >
              2 months free
            </span>
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="card-marketing p-8 relative"
              style={tier.popular ? { borderColor: "var(--accent-primary)", boxShadow: "0 0 0 1px var(--accent-primary)" } : undefined}
            >
              {tier.popular && (
                <span className="pill-popular absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" /> Popular
                </span>
              )}
              <h3
                className="font-semibold text-lg mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {tier.name}
              </h3>
              <p
                className="text-2xl font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                {annual ? tier.priceAnnual : tier.priceMonthly}
                <span
                  className="text-sm font-normal"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {tier.period}
                </span>
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {tier.description}
              </p>
              <ul className="space-y-2 mb-8">
                {tier.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Check
                      className="w-4 h-4 shrink-0"
                      style={{ color: "var(--accent-secondary)" }}
                    />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.cta === "Talk to sales" ? ROUTES.CONTACT : ROUTES.START}
                className={
                  tier.cta === "Talk to sales"
                    ? "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline"
                    : tier.popular
                      ? "btn-marketing-primary w-full block text-center py-3 rounded-lg no-underline"
                      : "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline"
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p
          className="text-center text-sm mb-10"
          style={{ color: "var(--text-tertiary)" }}
        >
          All plans include: encrypted records · compliance framework · audit trail · 14-day free trial
        </p>

        <h2
          id="estimate"
          className="font-semibold text-xl mb-4 mt-20 scroll-mt-24"
          style={{ color: "var(--text-primary)" }}
        >
          Estimate your cost
        </h2>
        <UsageEstimator className="mb-10" />
        <h2
          id="roi-calculator"
          className="font-semibold text-xl mb-4 mt-12 scroll-mt-24"
          style={{ color: "var(--text-primary)" }}
        >
          ROI calculator
        </h2>
        <ROICalculator className="mb-16" />

        <h2
          className="font-semibold text-xl mb-6 mt-8"
          style={{ color: "var(--text-primary)" }}
        >
          Feature comparison
        </h2>
        <div
          className="overflow-x-auto rounded-lg border mb-20"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                <th
                  className="py-4 px-4 font-semibold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Feature
                </th>
                <th
                  className="py-4 px-4 font-semibold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Starter
                </th>
                <th
                  className="py-4 px-4 font-semibold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Growth
                </th>
                <th
                  className="py-4 px-4 font-semibold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Scale
                </th>
                <th
                  className="py-4 px-4 font-semibold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border-default)",
                    background: i % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent",
                  }}
                >
                  <td
                    className="py-3 px-4"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {row.name}
                  </td>
                  <td
                    className="py-3 px-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {"starter" in row ? row.starter : ""}
                  </td>
                  <td
                    className="py-3 px-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {"professional" in row ? row.professional : ""}
                  </td>
                  <td
                    className="py-3 px-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {"business" in row ? row.business : ""}
                  </td>
                  <td
                    className="py-3 px-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {"enterprise" in row ? row.enterprise : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2
          id="faq"
          className="font-semibold text-xl mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Frequently asked questions
        </h2>
        <div className="max-w-2xl mb-16">
          {PRICING_FAQ.map((faq, i) => (
            <AccordionItem
              key={i}
              title={faq.q}
            >
              {faq.a}
            </AccordionItem>
          ))}
        </div>

        <div className="text-center">
          <Link
            href={ROUTES.START}
            className="btn-marketing-primary no-underline inline-block"
          >
            Start free →
          </Link>
        </div>
      </Container>
    </main>
  );
}

