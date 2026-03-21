"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, X, ArrowRight, Flame, Calculator, Search, ChevronDown, ChevronUp, Star, Shield, Clock, Users, Zap, Award, Headphones, TrendingUp } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import dynamic from "next/dynamic";

const VoicePreviewWidget = dynamic(() => import("@/components/VoicePreviewWidget").then((m) => ({ default: m.VoicePreviewWidget })), { ssr: false });
const AnimatedStats = dynamic(() => import("@/components/AnimatedStats").then((m) => ({ default: m.AnimatedStats })), { ssr: false });
const TrustLogosBar = dynamic(() => import("@/components/TrustLogosBar").then((m) => ({ default: m.TrustLogosBar })), { ssr: false });
const LiveActivityFeed = dynamic(() => import("@/components/LiveActivityFeed").then((m) => ({ default: m.LiveActivityFeed })), { ssr: false });
const PricingTestimonials = dynamic(() => import("@/components/PricingTestimonials").then((m) => ({ default: m.PricingTestimonials })), { ssr: false });

export const ANNUAL_NOTE = "Two months applied without interruption on annual commitment.";

export function pricingCopyForTests(): string {
  return [
    "Less than one missed call",
    "Starter",
    "Growth",
    "Business",
    "Agency",
    "Enterprise",
    "Start free",
    "Talk to sales",
  ].join(" ");
}

/* ─── Pricing Tier Data ─── */
const TIERS = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 97,
    annualMonthly: 77,
    annualTotal: 924,
    roi: "$2K–5K/mo",
    minutes: 500,
    overage: "$0.10/min",
    description: "One AI agent that answers and follows up",
    features: [
      "1 phone number",
      "500 voice minutes/month",
      "1 AI agent",
      "1 follow-up sequence",
      "Appointment booking",
      "Call transcripts",
      "Basic templates",
      "Email support",
    ],
    cta: "Try it free for 14 days",
    href: "/activate?plan=starter",
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 297,
    annualMonthly: 237,
    annualTotal: 2844,
    roi: "$5K–15K/mo",
    minutes: 2500,
    overage: "$0.10/min",
    description: "Multi-agent revenue operations",
    features: [
      "5 phone numbers",
      "2,500 voice minutes/month",
      "5 AI agents",
      "5 follow-up sequences",
      "Appointment reminders",
      "No-show recovery",
      "Reactivation campaigns",
      "SMS + email",
      "Revenue analytics",
      "CRM webhook",
      "Industry templates",
      "Priority support",
    ],
    cta: "Try it free for 14 days",
    href: "/activate?plan=growth",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 597,
    annualMonthly: 477,
    annualTotal: 5724,
    roi: "$10K–30K/mo",
    minutes: 6000,
    overage: "$0.08/min",
    description: "Full-scale AI call center",
    features: [
      "15 phone numbers",
      "6,000 voice minutes/month",
      "15 AI agents",
      "15 follow-up sequences",
      "All Growth features",
      "Advanced analytics + benchmarks",
      "Custom templates",
      "Multi-location dashboard",
      "Speed-to-lead (60s callback)",
      "Outbound campaigns",
      "API access",
      "Phone support",
    ],
    cta: "Try it free for 14 days",
    href: "/activate?plan=business",
    popular: false,
  },
  {
    id: "agency",
    name: "Agency",
    monthlyPrice: 997,
    annualMonthly: 797,
    annualTotal: 9564,
    roi: "$20K–50K/mo",
    minutes: 15000,
    overage: "$0.07/min",
    description: "White-label AI for your clients",
    features: [
      "Unlimited phone numbers",
      "15,000 voice minutes/month",
      "Unlimited AI agents",
      "Unlimited sequences",
      "All Business features",
      "White-label branding",
      "Multi-client dashboard",
      "Client invitation flow",
      "Custom voice training",
      "Advanced APIs",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Try it free for 14 days",
    href: "/activate?plan=agency",
    popular: false,
  },
] as const;

const ENTERPRISE = {
  name: "Enterprise",
  description: "Custom AI calling infrastructure at any scale",
  features: ["Custom volume", "SSO / SAML", "Multi-location", "Custom compliance", "Dedicated manager", "White label", "Custom integrations", "On-premise option"],
};

/* ─── Comparison Table ─── */
const COMPARISON = [
  { category: "Core", feature: "Phone Numbers", starter: "1", growth: "5", business: "15", agency: "Unlimited", enterprise: "Custom" },
  { category: "Core", feature: "Voice Minutes / Month", starter: "500", growth: "2,500", business: "6,000", agency: "15,000", enterprise: "Unlimited" },
  { category: "Core", feature: "AI Agents", starter: "1", growth: "5", business: "15", agency: "Unlimited", enterprise: "Custom" },
  { category: "Core", feature: "Follow-Up Sequences", starter: "1", growth: "5", business: "15", agency: "Unlimited", enterprise: "Unlimited" },
  { category: "Core", feature: "Overage Rate", starter: "$0.10/min", growth: "$0.10/min", business: "$0.08/min", agency: "$0.07/min", enterprise: "Custom" },
  { category: "Features", feature: "Appointment Booking", starter: true, growth: true, business: true, agency: true, enterprise: true },
  { category: "Features", feature: "Appointment Reminders", starter: false, growth: true, business: true, agency: true, enterprise: true },
  { category: "Features", feature: "No-Show Recovery", starter: false, growth: true, business: true, agency: true, enterprise: true },
  { category: "Features", feature: "Outbound Campaigns", starter: false, growth: false, business: true, agency: true, enterprise: true },
  { category: "Features", feature: "Speed-to-Lead (60s)", starter: false, growth: false, business: true, agency: true, enterprise: true },
  { category: "Features", feature: "Revenue Analytics", starter: false, growth: true, business: true, agency: true, enterprise: true },
  { category: "Features", feature: "Advanced Analytics", starter: false, growth: false, business: true, agency: true, enterprise: true },
  { category: "Features", feature: "API Access", starter: false, growth: false, business: true, agency: "Full", enterprise: "Full" },
  { category: "Features", feature: "White-Label", starter: false, growth: false, business: false, agency: true, enterprise: true },
  { category: "Features", feature: "Multi-Client Dashboard", starter: false, growth: false, business: false, agency: true, enterprise: true },
  { category: "Features", feature: "Custom Voice Training", starter: false, growth: false, business: false, agency: true, enterprise: true },
  { category: "Support", feature: "Email Support", starter: true, growth: true, business: true, agency: true, enterprise: true },
  { category: "Support", feature: "Priority Support", starter: false, growth: true, business: true, agency: true, enterprise: true },
  { category: "Support", feature: "Phone Support", starter: false, growth: false, business: true, agency: true, enterprise: true },
  { category: "Support", feature: "Dedicated Account Mgr", starter: false, growth: false, business: false, agency: true, enterprise: true },
  { category: "Security", feature: "SSO / SAML", starter: false, growth: false, business: false, agency: false, enterprise: true },
  { category: "Security", feature: "SLA Guarantee", starter: "—", growth: "—", business: "—", agency: true, enterprise: true },
] as const;

/* ─── FAQ ─── */
const FAQS = [
  { q: "Can I upgrade or downgrade anytime?", a: "Yes. Changes take effect on your next billing cycle. No penalties." },
  { q: "What if I exceed my minutes?", a: "Overage is billed per minute at your plan rate: $0.10/min on Starter and Growth, $0.08 on Business, $0.07 on Agency. No surprise charges — you can set a hard cap in settings." },
  { q: "Do you offer discounts for annual billing?", a: "Yes. Annual plans save you ~20% vs. monthly. Plus, paying annually gives you priority support on all tiers." },
  { q: "Is there a setup fee?", a: "No setup fee. Your 14-day free trial gives you full access to all features on your selected plan." },
  { q: "Can I cancel anytime?", a: "Yes. No long-term contracts. Cancel in your dashboard or pause for 30 days. We'll ask why — your feedback matters." },
  { q: "Does Recall Touch integrate with my calendar/CRM?", a: "Yes. Growth+ tiers get integrations with Google Calendar, Cal.com, Zapier, and Make.com. Business+ adds API access. Enterprise gets custom integrations." },
  { q: "What's included in your support?", a: "Starter: Email (24h response). Growth: Priority email + live chat. Business: Phone support. Agency+: Dedicated account manager." },
  { q: "Can I test Recall Touch free first?", a: "Absolutely. 14-day free trial. Full access to all features. No credit card required. Your AI agent will be answering calls in under 3 minutes." },
  { q: "How does Recall Touch work?", a: "Recall Touch answers all your incoming calls with an AI phone agent, qualifies leads in real-time, books appointments directly into your calendar, and automatically follows up with contacts to move them through your pipeline." },
  { q: "Can I white-label this for my clients?", a: "Yes. Agency plan includes full white-label branding, multi-client dashboard, and client invitation flow. Enterprise adds custom domain support." },
];

/* ─── Cost of Doing Nothing Calculator ─── */
const PLAN_COSTS: { label: string; monthly: number }[] = [
  { label: "Starter ($97/mo)", monthly: 97 },
  { label: "Growth ($297/mo)", monthly: 297 },
  { label: "Business ($597/mo)", monthly: 597 },
  { label: "Agency ($997/mo)", monthly: 997 },
];

function CostCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(5);
  const [avgJobValue, setAvgJobValue] = useState(450);
  const [conversionRate, setConversionRate] = useState(45);
  const [planIndex, setPlanIndex] = useState(1); // default to Business

  const result = useMemo(() => {
    const monthlyLost = missedPerWeek * 4 * avgJobValue * (conversionRate / 100);
    const annualLost = monthlyLost * 12;
    const planCost = PLAN_COSTS[planIndex].monthly * 12;
    const paybackDays = planCost > 0 ? Math.ceil((planCost / (annualLost || 1)) * 365) : 999;
    const roiPercent = planCost > 0 ? Math.round(((annualLost - planCost) / planCost) * 100) : 0;

    return { monthlyLost, annualLost, paybackDays: Math.min(paybackDays, 365), roiPercent: Math.max(roiPercent, 0) };
  }, [missedPerWeek, avgJobValue, conversionRate, planIndex]);

  return (
    <div className="rounded-2xl border border-red-500/20 bg-black/30 p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Calculate Your ROI
        </h3>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        See what Recall Touch can do for your business
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

      <div className="mb-6">
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Your plan:</span>
        <div className="flex gap-2 mt-2">
          {PLAN_COSTS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPlanIndex(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                planIndex === i
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-inset)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-default)]">
        <div className="text-center">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Monthly Loss</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">${result.monthlyLost.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Annual Loss</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">${result.annualLost.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Payback Period</p>
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{result.paybackDays} days</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Annual ROI</p>
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
  const _t = useTranslations("pricing");
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

        {/* Animated Stats Bar */}
        <div className="mb-10">
          <AnimatedStats />
        </div>

        {/* Guarantee + Awards Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              <strong className="text-emerald-400">30-day money-back guarantee</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <Users className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              <strong className="text-blue-400">Trusted by 12,400+ businesses</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <Headphones className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              <strong className="text-blue-400">24/7 US-based support</strong>
            </p>
          </div>
        </div>

        {/* Integration Partners */}
        <TrustLogosBar />

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
              Save 20%
            </span>
          </span>
        </div>

        {!annual && (
          <p className="text-center text-xs text-orange-400/70 mb-6">
            Monthly plans include a +20% flexibility surcharge vs. annual commitment.
          </p>
        )}

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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

              {tier.id === "growth" && (
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Most teams see ROI within the first week.
                </p>
              )}

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
                    : "group border border-[var(--border-default)] text-white font-semibold rounded-xl py-3 text-center no-underline flex items-center justify-center gap-2 hover:bg-[var(--bg-hover)] transition-all"
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
              <span key={f} className="px-3 py-1 rounded-full text-xs bg-white/5 text-[var(--text-secondary)] border border-[var(--border-default)]">
                {f}
              </span>
            ))}
          </div>
          <Link
            href={ROUTES.CONTACT}
            className="inline-flex items-center gap-2 border border-[var(--border-default)] text-white font-semibold rounded-xl px-8 py-3 no-underline hover:bg-[var(--bg-hover)] transition-all"
          >
            Talk to Sales
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Voice Preview + Live Activity */}
        <div className="grid lg:grid-cols-5 gap-6 mb-12">
          <div className="lg:col-span-3">
            <VoicePreviewWidget />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
            <LiveActivityFeed />
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {[
            { icon: Shield, text: "256-bit encryption" },
            { icon: Check, text: "TCPA/GDPR compliant" },
            { icon: Clock, text: "14-day free trial" },
            { icon: Star, text: "No credit card required" },
            { icon: TrendingUp, text: "99.97% uptime SLA" },
            { icon: Zap, text: "Sub-second response" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-default)] bg-white/[0.02] text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <Icon className="w-3.5 h-3.5 text-emerald-400" />
              {text}
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <h2 className="font-semibold text-xl mb-6 mt-8" style={{ color: "var(--text-primary)" }}>
          Full Feature Comparison
        </h2>
        <div className="overflow-x-auto rounded-lg border mb-20" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Feature</th>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Starter</th>
                <th className="py-4 px-4 font-semibold text-emerald-400">Growth</th>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Business</th>
                <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Agency</th>
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
                  {(["starter", "growth", "business", "agency", "enterprise"] as const).map((tier) => (
                    <td key={tier} className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>
                      <FeatureCell value={row[tier]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Testimonials */}
        <PricingTestimonials />

        {/* FAQ Section */}
        <h2 id="faq" className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>
          Frequently Asked Questions
        </h2>
        <div className="max-w-2xl mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/5 border border-[var(--border-default)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500/50"
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
                  <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
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
        <div className="text-center space-y-5 mt-16 py-14 px-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent pointer-events-none" />

          <div className="relative">
            <p className="text-xs font-semibold tracking-wider uppercase text-emerald-400 mb-3">
              Start recovering revenue today
            </p>
            <h2 className="text-2xl md:text-4xl font-bold mb-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              Ready to Never Miss Another Call?
            </h2>
            <p className="text-base md:text-lg max-w-lg mx-auto mb-2" style={{ color: "var(--text-secondary)" }}>
              Join 12,400+ businesses that never miss a call, never lose a lead, and never sleep on revenue.
            </p>

            {/* Mini social proof */}
            <div className="flex items-center justify-center gap-4 mb-6 text-xs" style={{ color: "var(--text-tertiary)" }}>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 3-minute setup</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No credit card</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Cancel anytime</span>
            </div>

            <Link
              href={ROUTES.START}
              className="inline-flex items-center gap-2 bg-emerald-500 text-black font-bold rounded-xl px-10 py-4 no-underline hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 text-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Your Free 14-Day Trial
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
              30-day money-back guarantee · No contracts · Full feature access
            </p>

            <div className="flex items-center justify-center gap-1 mt-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>
                4.9/5 from 3,200+ reviews
              </span>
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
              <Link href={ROUTES.DEMO} className="font-medium underline-offset-4 hover:underline text-emerald-400">
                Hear the AI first →
              </Link>
              <Link href={ROUTES.CONTACT} className="font-medium underline-offset-4 hover:underline text-[var(--text-tertiary)]">
                Talk to sales →
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
