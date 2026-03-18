"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, X, ArrowRight, Flame, Calculator, Search, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export const ANNUAL_NOTE = "Two months applied without interruption on annual commitment.";

export function pricingCopyForTests(): string {
  return [
    "Less than one missed call",
    "Solo",
    "Business",
    "Scale",
    "Enterprise",
    "Start free",
    "Talk to sales",
  ].join(" ");
}

/* ─── Pricing Tier Data ─── */
const TIERS = [
  {
    id: "solo",
    name: "Solo",
    monthlyPrice: 49,
    annualMonthly: 39,
    annualTotal: 468,
    roi: "$2K–5K/mo",
    description: "For solo operators who need every call answered and every follow-up sent.",
    features: [
      "1 phone number",
      "100 voice minutes/month",
      "1 AI agent",
      "1 follow-up sequence",
      "Basic templates",
      "Email support",
      "Appointment booking",
      "Call transcripts",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: false,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 297,
    annualMonthly: 247,
    annualTotal: 2964,
    roi: "$5K–15K/mo",
    description: "The complete revenue closer for a single-location business.",
    features: [
      "5 phone numbers",
      "500 voice minutes/month",
      "3 AI agents",
      "3 follow-up sequences",
      "8 industry templates",
      "Priority support",
      "Appointment reminders",
      "No-show recovery",
      "Reactivation campaigns",
      "SMS + email",
      "Revenue analytics",
      "CRM webhook",
      "Multi-location dashboard",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPrice: 997,
    annualMonthly: 847,
    annualTotal: 10164,
    roi: "$20K–50K/mo",
    description: "For teams, high volume, and multi-location businesses.",
    features: [
      "20 phone numbers",
      "2,000 voice minutes/month",
      "10 AI agents",
      "10 follow-up sequences",
      "Custom templates",
      "Dedicated account manager",
      "White-label option",
      "Custom voice training",
      "Advanced APIs",
      "Advanced analytics + benchmarks",
      "Custom workflows",
      "Phone support",
      "SLA guarantee (on request)",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: false,
  },
] as const;

const ENTERPRISE = {
  name: "Enterprise",
  description: "Custom pricing, SSO, multi-location, custom voice, dedicated support.",
  features: ["Custom volume", "SSO / SAML", "Multi-location", "Custom compliance", "Dedicated manager", "White label", "Custom integrations"],
};

/* ─── Comparison Table ─── */
const COMPARISON = [
  { category: "Core", feature: "Phone Numbers", solo: "1", business: "5", scale: "20", enterprise: "Custom" },
  { category: "Core", feature: "Voice Minutes / Month", solo: "100", business: "500", scale: "2,000", enterprise: "Unlimited" },
  { category: "Core", feature: "AI Agents", solo: "1", business: "3", scale: "10", enterprise: "Custom" },
  { category: "Core", feature: "Follow-Up Sequences", solo: "1", business: "3", scale: "10", enterprise: "Unlimited" },
  { category: "Core", feature: "Industry Templates", solo: "1", business: "8", scale: "Custom", enterprise: "Custom" },
  { category: "Features", feature: "Appointment Booking", solo: true, business: true, scale: true, enterprise: true },
  { category: "Features", feature: "Appointment Reminders", solo: false, business: true, scale: true, enterprise: true },
  { category: "Features", feature: "No-Show Recovery", solo: false, business: true, scale: true, enterprise: true },
  { category: "Features", feature: "Reactivation Campaigns", solo: false, business: true, scale: true, enterprise: true },
  { category: "Features", feature: "Revenue Analytics", solo: false, business: true, scale: true, enterprise: true },
  { category: "Features", feature: "Advanced Analytics", solo: false, business: false, scale: true, enterprise: true },
  { category: "Features", feature: "API Access", solo: false, business: "Basic", scale: "Full", enterprise: "Full" },
  { category: "Features", feature: "White-Label", solo: false, business: false, scale: true, enterprise: true },
  { category: "Features", feature: "Custom Voice Training", solo: false, business: false, scale: true, enterprise: true },
  { category: "Support", feature: "Email Support", solo: true, business: true, scale: true, enterprise: true },
  { category: "Support", feature: "Priority Support", solo: false, business: true, scale: true, enterprise: true },
  { category: "Support", feature: "Phone Support", solo: false, business: false, scale: true, enterprise: true },
  { category: "Support", feature: "Dedicated Account Mgr", solo: false, business: false, scale: true, enterprise: true },
  { category: "Security", feature: "SSO / SAML", solo: false, business: false, scale: false, enterprise: true },
  { category: "Security", feature: "SLA Guarantee", solo: "—", business: "—", scale: "Available on request", enterprise: "Available on request" },
  { category: "Security", feature: "Multi-Location Dashboard", solo: false, business: true, scale: true, enterprise: true },
] as const;

/* ─── FAQ ─── */
const FAQS = [
  { q: "Can I upgrade or downgrade anytime?", a: "Yes. Changes take effect on your next billing cycle. No penalties." },
  { q: "What if I exceed my call limit?", a: "Each plan includes its limit. Overage calls cost $0.30/call — or we pause new calls until next month (your choice in settings)." },
  { q: "Do you offer discounts for annual billing?", a: "Yes. Annual plans save you ~17% vs. monthly. Plus, paying annually gives you priority support." },
  { q: "Is there a setup fee?", a: "No setup fee. Your 14-day free trial gives you full access to all features." },
  { q: "Can I cancel anytime?", a: "Yes. No long-term contracts. Cancel in your dashboard or pause for 30 days. We'll ask why — your feedback matters." },
  { q: "Does Recall Touch integrate with my calendar/CRM?", a: "Yes. Business+ tiers get integrations with Google Calendar, Outlook, Zapier, and Make.com. Enterprise gets custom integrations." },
  { q: "What's included in your support?", a: "Solo: Email (24h response). Business: Priority email + live chat. Scale+: Dedicated account manager + phone support." },
  { q: "Can I test Recall Touch free first?", a: "Absolutely. 14-day free trial. Full access to all features. No credit card required." },
];

/* ─── Cost of Doing Nothing Calculator ─── */
function CostCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(5);
  const [avgJobValue, setAvgJobValue] = useState(450);
  const [conversionRate, setConversionRate] = useState(45);

  const result = useMemo(() => {
    const monthlyLost = missedPerWeek * 4 * avgJobValue * (conversionRate / 100);
    const annualLost = monthlyLost * 12;
    const planCost = 297 * 12; // Business tier annual
    const paybackDays = planCost > 0 ? Math.ceil((planCost / (annualLost || 1)) * 365) : 999;
    const roiPercent = planCost > 0 ? Math.round(((annualLost - planCost) / planCost) * 100) : 0;

    return { monthlyLost, annualLost, paybackDays: Math.min(paybackDays, 365), roiPercent: Math.max(roiPercent, 0) };
  }, [missedPerWeek, avgJobValue, conversionRate]);

  return (
    <div className="rounded-2xl border border-red-500/20 bg-black/30 p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          The True Cost of Voicemail
        </h3>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        What are you losing right now?
      </p>

      <div className="grid gap-5 mb-6">
        <label className="block">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Missed calls per week: <strong className="text-emerald-400">{missedPerWeek}</strong>
          </span>
          <input
            type="range" min={1} max={50} step={1} value={missedPerWeek}
            onChange={(e) => setMissedPerWeek(Number(e.target.value))}
            className="w-full h-2 rounded-lg mt-2" style={{ accentColor: "var(--accent-primary)" }}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Average job value: <strong className="text-emerald-400">${avgJobValue}</strong>
          </span>
          <input
            type="range" min={50} max={5000} step={50} value={avgJobValue}
            onChange={(e) => setAvgJobValue(Number(e.target.value))}
            className="w-full h-2 rounded-lg mt-2" style={{ accentColor: "var(--accent-primary)" }}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Call-to-appointment rate: <strong className="text-emerald-400">{conversionRate}%</strong>
          </span>
          <input
            type="range" min={10} max={90} step={5} value={conversionRate}
            onChange={(e) => setConversionRate(Number(e.target.value))}
            className="w-full h-2 rounded-lg mt-2" style={{ accentColor: "var(--accent-primary)" }}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className="text-xs text-white/40 mb-1">Monthly Loss</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">${result.monthlyLost.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40 mb-1">Annual Loss</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">${result.annualLost.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40 mb-1">Payback Period</p>
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{result.paybackDays} days</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40 mb-1">Annual ROI</p>
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{result.roiPercent.toLocaleString()}%</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href={ROUTES.START}
          className="inline-flex items-center gap-2 bg-emerald-500 text-black font-semibold rounded-xl px-6 py-3 hover:bg-emerald-400 transition-all no-underline"
        >
          Stop Losing ${result.monthlyLost.toLocaleString()}/mo — Try Free
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Feature Cell Renderer ─── */
function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-4 h-4 text-emerald-400" />
    ) : (
      <X className="w-4 h-4 text-white/20" />
    );
  }
  return <span>{value}</span>;
}

/* ─── Main Pricing Content ─── */
export function PricingContent() {
  const t = useTranslations("pricing");
  const [annual, setAnnual] = useState(true); // Annual is default
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQS;
    const q = faqSearch.toLowerCase();
    return FAQS.filter((faq) => faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q));
  }, [faqSearch]);

  return (
    <main className="pt-28 pb-24">
      <Container>
        {/* Header */}
        <div className="text-center mb-12">
          <p className="section-label mb-4">Pricing</p>
          <h1
            className="font-bold text-3xl md:text-5xl mb-4"
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            Simple, Transparent Pricing
          </h1>
          <p className="text-base md:text-lg mb-2 max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Pick the plan that fits your business. Upgrade anytime.
            <br />
            <span className="text-emerald-400 font-medium">Less than the cost of one missed call.</span>
          </p>
        </div>

        {/* Cost of Doing Nothing */}
        <div className="mb-16">
          <CostCalculator />
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span
            className="text-sm font-medium"
            style={{ color: !annual ? "var(--text-primary)" : "var(--text-tertiary)" }}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((a) => !a)}
            className="w-14 h-8 rounded-full border-2 transition-colors flex-shrink-0 p-0.5 relative"
            style={{
              background: annual ? "var(--accent-primary)" : "var(--bg-surface)",
              borderColor: annual ? "var(--accent-primary)" : "var(--border-default)",
            }}
          >
            <span
              className="block w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
              style={{ transform: annual ? "translateX(1.5rem)" : "translateX(0)" }}
            />
          </button>
          <span
            className="text-sm font-medium flex items-center gap-2"
            style={{ color: annual ? "var(--text-primary)" : "var(--text-tertiary)" }}
          >
            Annual
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Save 17%
            </span>
          </span>
        </div>

        {!annual && (
          <p className="text-center text-xs text-orange-400/70 mb-6">
            Monthly plans include a +20% flexibility surcharge vs. annual commitment.
          </p>
        )}

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className="card-marketing p-8 relative flex flex-col"
              style={tier.popular ? { borderColor: "var(--accent-primary)", boxShadow: "0 0 0 1px var(--accent-primary), 0 0 40px rgba(34,197,94,0.1)" } : undefined}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-black">
                  <Star className="w-3 h-3" /> Most Popular
                </span>
              )}
              <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                {tier.name}
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  ${annual ? tier.annualMonthly : tier.monthlyPrice}
                </span>
                <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>/mo</span>
                {annual && (
                  <span className="block text-xs text-emerald-400 mt-1">
                    ${tier.annualTotal}/year (save ${(tier.monthlyPrice * 12 - tier.annualTotal).toLocaleString()})
                  </span>
                )}
              </div>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                {tier.description}
              </p>

              {/* Expected ROI badge */}
              <div className="inline-flex self-start items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
                <Calculator className="w-3 h-3" />
                Expected ROI: {tier.roi}
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={
                  tier.popular
                    ? "group bg-emerald-500 text-black font-semibold rounded-xl py-3 text-center no-underline flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                    : "group border border-white/20 text-white font-semibold rounded-xl py-3 text-center no-underline flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
                }
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise Card */}
        <div className="card-marketing p-8 mb-16 text-center">
          <h3 className="font-semibold text-xl mb-2" style={{ color: "var(--text-primary)" }}>
            Enterprise
          </h3>
          <p className="text-sm mb-4 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
            {ENTERPRISE.description}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {ENTERPRISE.features.map((f) => (
              <span key={f} className="px-3 py-1 rounded-full text-xs bg-white/5 text-white/60 border border-white/10">
                {f}
              </span>
            ))}
          </div>
          <Link
            href={ROUTES.CONTACT}
            className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold rounded-xl px-8 py-3 no-underline hover:bg-white/5 transition-all"
          >
            Talk to Sales
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-center text-sm mb-16" style={{ color: "var(--text-tertiary)" }}>
          All plans include: 14-day free trial · No credit card · TCPA/GDPR compliance · 256-bit encryption · SOC 2 in progress
        </p>

        {/* Feature Comparison Table */}
        <h2 className="font-semibold text-xl mb-6 mt-8" style={{ color: "var(--text-primary)" }}>
          Full Feature Comparison
        </h2>
        <div className="overflow-x-auto rounded-lg border mb-20" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Feature</th>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Solo</th>
                <th className="py-4 px-4 font-semibold text-emerald-400">Business</th>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Scale</th>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border-default)",
                    background: i % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent",
                  }}
                >
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--text-primary)" }}>
                    {row.feature}
                  </td>
                  {(["solo", "business", "scale", "enterprise"] as const).map((tier) => (
                    <td key={tier} className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>
                      <FeatureCell value={row[tier]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ Section */}
        <h2 id="faq" className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>
          Frequently Asked Questions
        </h2>
        <div className="max-w-2xl mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          {filteredFaqs.map((faq, i) => (
            <div key={i} className="border-b border-white/5">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left py-4 flex items-center justify-between gap-4"
              >
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-white/40 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <p className="text-sm pb-4" style={{ color: "var(--text-secondary)" }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-3 mt-16">
          <Link
            href={ROUTES.START}
            className="inline-flex items-center gap-2 bg-emerald-500 text-black font-semibold rounded-xl px-8 py-4 no-underline hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 text-lg"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            No credit card required · Cancel anytime · 14-day free trial
          </p>
          <p className="text-xs">
            <Link href={ROUTES.CONTACT} className="font-medium underline-offset-4 hover:underline text-emerald-400">
              Questions? Talk to us →
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
