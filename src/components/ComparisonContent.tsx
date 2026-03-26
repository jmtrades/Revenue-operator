"use client";

import Link from "next/link";
import { CheckCircle, XCircle, TrendingUp } from "lucide-react";

type ComparisonData = {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  pricing: {
    range: string;
    details: string;
  };
  callCapacity: string;
  recallTouchAdvantage: string[];
};

const COMPARISONS: Record<string, ComparisonData> = {
  "smith-ai": {
    name: "Smith.ai",
    description: "Human + AI virtual receptionists with legal specialization",
    strengths: [
      "Human quality interactions",
      "Legal industry focus",
      "Bilingual support available",
    ],
    weaknesses: [
      "Expensive ($292.50-$1,125/mo)",
      "Limited AI automation",
      "No follow-up engine",
      "No revenue tracking",
      "Per-call pricing scales poorly",
    ],
    pricing: {
      range: "$292.50-$1,125/month",
      details: "Based on 30-120 calls per month",
    },
    callCapacity: "Limited by human availability",
    recallTouchAdvantage: [
      "10x more calls at fraction of cost",
      "Fully automated follow-ups",
      "Revenue attribution built in",
      "24/7 without human staffing limits",
      "Costs $297-$497/mo vs $300-$1,125/mo",
    ],
  },
  ruby: {
    name: "Ruby Receptionists",
    description: "Premium live virtual receptionist service",
    strengths: [
      "Human warmth and judgment",
      "Established brand (15+ years)",
      "Professional voice quality",
    ],
    weaknesses: [
      "Pure human cost model",
      "No AI automation",
      "No follow-up capabilities",
      "No booking engine",
      "No analytics or revenue recovery",
      "Single point of failure",
    ],
    pricing: {
      range: "$349-$1,509/month",
      details: "Based on 100-500 minutes per month",
    },
    callCapacity: "100-500 minutes/mo",
    recallTouchAdvantage: [
      "AI handles unlimited concurrent calls",
      "Automated follow-up sequences",
      "Appointment booking built in",
      "No-show recovery included",
      "Costs 60-80% less than Ruby",
    ],
  },
  gohighlevel: {
    name: "GoHighLevel",
    description: "All-in-one marketing and CRM platform for agencies",
    strengths: [
      "Huge agency adoption",
      "CRM + website + email + SMS in one",
      "Good for marketing teams",
    ],
    weaknesses: [
      "Jack of all trades, master of none",
      "Voice AI is basic and an afterthought",
      "Chaotic UX that's hard to learn",
      "No real AI revenue operations",
      "No follow-up intelligence",
      "No revenue attribution",
    ],
    pricing: {
      range: "$147-$997/month",
      details: "Base pricing for core features",
    },
    callCapacity: "Minimal voice capabilities",
    recallTouchAdvantage: [
      "Purpose-built for revenue execution",
      "AI revenue operations that actually work",
      "Intelligent follow-up engine",
      "Revenue recovery proof and tracking",
      "10x better call handling than GoHighLevel add-ons",
    ],
  },
  "hiring-receptionist": {
    name: "Hiring a Receptionist",
    description: "Traditional full-time employee",
    strengths: [
      "Human judgment and personality",
      "In-person presence possible",
      "Personal relationship building",
    ],
    weaknesses: [
      "High cost ($3,200-$4,500/mo + benefits)",
      "Can't answer multiple calls simultaneously",
      "Sick days and vacation coverage",
      "High turnover and training costs",
      "Limited hours unless you pay for shifts",
      "No after-hours coverage",
      "No data or analytics",
      "Salary increases and benefits overhead",
    ],
    pricing: {
      range: "$3,200-$4,500/month",
      details: "Salary + benefits + payroll taxes + training",
    },
    callCapacity: "1 person = single call at a time",
    recallTouchAdvantage: [
      "Answers unlimited calls simultaneously 24/7",
      "Never calls in sick or takes vacation",
      "No training needed, ready in minutes",
      "Costs $297-$497/mo vs $4,000+/mo",
      "Complete analytics and call recordings",
      "Scales with your business, no hiring needed",
    ],
  },
};

interface ComparisonContentProps {
  competitor: string;
}

export function ComparisonContent({ competitor }: ComparisonContentProps) {
  const data = COMPARISONS[competitor];

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
          Recall Touch vs {data.name}
        </h1>
        <p className="text-xl text-[var(--text-secondary)]">{data.description}</p>
      </section>

      {/* Key Stats */}
      <section className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-default)] p-6">
          <div className="text-sm text-[var(--text-tertiary)] mb-2">Recall Touch Cost</div>
          <div className="text-2xl font-bold text-white">$297-$497/mo</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-2">No setup, instant activation</div>
        </div>
        <div className="rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-default)] p-6">
          <div className="text-sm text-[var(--text-tertiary)] mb-2">{data.name} Cost</div>
          <div className="text-2xl font-bold text-white">{data.pricing.range}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-2">{data.pricing.details}</div>
        </div>
        <div className="rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-default)] p-6">
          <div className="text-sm text-[var(--text-tertiary)] mb-2">Call Capacity</div>
          <div className="text-2xl font-bold text-white">Unlimited</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-2">vs {data.callCapacity}</div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-8">Feature Comparison</h2>
        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-card)]/50 border-b border-[var(--border-default)]">
                <th className="text-left px-6 py-4 text-white font-semibold">Feature</th>
                <th className="text-center px-6 py-4 text-white font-semibold">Recall Touch</th>
                <th className="text-center px-6 py-4 text-[var(--text-tertiary)] font-semibold">{data.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {getFeatureRows(competitor).map((row, idx) => (
                <tr
                  key={idx}
                  className="bg-black/50 hover:bg-[var(--bg-card)]/30 transition-colors"
                >
                  <td className="px-6 py-4 text-[var(--text-primary)]">{row.feature}</td>
                  <td className="px-6 py-4 text-center">
                    {row.recall ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--text-tertiary)] mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {row.competitor ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--text-tertiary)] mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Strengths & Weaknesses */}
      <section className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div>
          <h3 className="text-xl font-bold text-white mb-4">
            {data.name} Strengths
          </h3>
          <ul className="space-y-3">
            {data.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-4">
            {data.name} Weaknesses
          </h3>
          <ul className="space-y-3">
            {data.weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why Recall Touch Wins */}
      <section className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-900/20 to-transparent border border-emerald-800/30 rounded-xl p-8">
        <div className="flex items-start gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" />
          <h2 className="text-2xl font-bold text-white">Why Businesses Switch to Recall Touch</h2>
        </div>
        <ul className="grid md:grid-cols-2 gap-4">
          {data.recallTouchAdvantage.map((advantage, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
              <span className="text-[var(--text-primary)]">{advantage}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-bold text-white">
          Ready to see the difference?
        </h2>
        <p className="text-xl text-[var(--text-secondary)]">
          Get started today. Cancel anytime. Full access to all features.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/activate"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-black font-semibold hover:bg-[var(--bg-hover)] active:scale-[0.97]"
            style={{ transition: "background-color 0.3s ease-[cubic-bezier(0.23,1,0.32,1)], transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}
          >
            Get started
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] px-8 py-4 text-white font-semibold hover:bg-[var(--bg-card)] active:scale-[0.97]"
            style={{ transition: "background-color 0.3s ease-[cubic-bezier(0.23,1,0.32,1)], transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}
          >
            See it in action
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8">Common Questions</h2>
        <div className="space-y-4">
          {getFAQs(competitor).map((faq, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/30 hover:bg-[var(--bg-card)]/50 transition-colors"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-semibold text-white hover:text-[var(--text-primary)]">
                {faq.q}
                <span className="transition-transform group-open:rotate-180">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </span>
              </summary>
              <div className="px-6 pb-4 text-[var(--text-secondary)] border-t border-[var(--border-default)]/50 pt-4">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function getFeatureRows(
  competitor: string
): Array<{ feature: string; recall: boolean; competitor: boolean }> {
  const baseFeatures: Record<
    string,
    Array<{ feature: string; recall: boolean; competitor: boolean }>
  > = {
    "smith-ai": [
      { feature: "AI revenue operations", recall: true, competitor: false },
      { feature: "24/7 coverage", recall: true, competitor: false },
      { feature: "Call handling capacity", recall: true, competitor: false },
      { feature: "Follow-up automation", recall: true, competitor: false },
      { feature: "Appointment booking", recall: true, competitor: false },
      { feature: "Revenue attribution", recall: true, competitor: false },
      { feature: "Bilingual support", recall: true, competitor: true },
      { feature: "Legal industry focus", recall: false, competitor: true },
    ],
    ruby: [
      { feature: "24/7 availability", recall: true, competitor: false },
      { feature: "Unlimited concurrent calls", recall: true, competitor: false },
      { feature: "Appointment booking", recall: true, competitor: false },
      { feature: "Follow-up sequences", recall: true, competitor: false },
      { feature: "Call recordings", recall: true, competitor: false },
      { feature: "Analytics dashboard", recall: true, competitor: false },
      { feature: "No-show recovery", recall: true, competitor: false },
      { feature: "Human warmth", recall: false, competitor: true },
    ],
    gohighlevel: [
      { feature: "Purpose-built AI voice", recall: true, competitor: false },
      { feature: "Intelligent call handling", recall: true, competitor: false },
      { feature: "Revenue recovery", recall: true, competitor: false },
      { feature: "Follow-up automation", recall: true, competitor: false },
      { feature: "SMS + email marketing", recall: false, competitor: true },
      { feature: "Website builder", recall: false, competitor: true },
      { feature: "CRM integrated", recall: false, competitor: true },
      { feature: "Call accuracy", recall: true, competitor: false },
    ],
    "hiring-receptionist": [
      { feature: "Multiple simultaneous calls", recall: true, competitor: false },
      { feature: "24/7 coverage", recall: true, competitor: false },
      { feature: "No sick days or vacation", recall: true, competitor: false },
      { feature: "Automated follow-ups", recall: true, competitor: false },
      { feature: "Call analytics", recall: true, competitor: false },
      { feature: "Instant scaling", recall: true, competitor: false },
      { feature: "Cost efficiency", recall: true, competitor: false },
      { feature: "Human presence", recall: false, competitor: true },
    ],
  };

  return baseFeatures[competitor] || [];
}

function getFAQs(
  competitor: string
): Array<{ q: string; a: string }> {
  const faqs: Record<string, Array<{ q: string; a: string }>> = {
    "smith-ai": [
      {
        q: "Can I try Recall Touch before committing?",
        a: "Yes, all plans include full access to every feature. Cancel anytime with no questions asked. You'll get unlimited calls to test it thoroughly.",
      },
      {
        q: "How is Recall Touch different from Smith.ai?",
        a: "Smith.ai relies on humans, which limits capacity and costs $300-$1,125/mo. Recall Touch uses AI to answer unlimited concurrent calls 24/7 for $297-$497/mo, plus automated follow-ups and revenue tracking.",
      },
      {
        q: "Will switching affect my current calls?",
        a: "No, you can test Recall Touch alongside Smith.ai. Just forward a test number to see how it performs. Many customers run both during their trial.",
      },
      {
        q: "What if I need human judgment for complex calls?",
        a: "Recall Touch can route complex calls to humans via your integrated inbox or escalation rules. You get the best of both worlds: AI efficiency + human judgment when needed.",
      },
    ],
    ruby: [
      {
        q: "How does Recall Touch handle as many calls as Ruby?",
        a: "AI can handle unlimited concurrent calls simultaneously. Ruby's humans can only take one call at a time. At scale, Ruby costs 10x more and still can't match the capacity.",
      },
      {
        q: "Will customers notice the difference?",
        a: "Modern AI voice is indistinguishable from human. Recall Touch uses natural speech, handles interruptions, and understands context. Most customers prefer the speed and accuracy.",
      },
      {
        q: "Can I get appointments booked automatically?",
        a: "Yes, Recall Touch books appointments directly into your calendar during the call. Ruby can't do this—they just log notes.",
      },
      {
        q: "What about follow-ups to unanswered calls?",
        a: "Recall Touch automatically sends SMS or email follow-ups to no-answers. It recovers leads that Ruby would miss. This alone pays for the service.",
      },
    ],
    gohighlevel: [
      {
        q: "Why not just use GoHighLevel's voice AI?",
        a: "GoHighLevel's voice AI is basic and feels like an afterthought. Recall Touch is purpose-built for revenue execution—better understanding, call handling, and follow-up automation.",
      },
      {
        q: "Can I connect both systems?",
        a: "Yes, Recall Touch integrates with GoHighLevel via API and Zapier. Use Recall Touch for calls and follow-ups, sync to GoHighLevel for CRM management.",
      },
      {
        q: "Is Recall Touch better for agencies?",
        a: "If you're a marketing agency, GoHighLevel is great for campaigns. If you want reliable AI revenue operations — calls, follow-ups, bookings, and recovery — for your clients, Recall Touch is the better choice.",
      },
      {
        q: "How do I migrate my setup?",
        a: "Simple: forward your phone number to Recall Touch and set up call rules. No data migration needed. You can test both simultaneously.",
      },
    ],
    "hiring-receptionist": [
      {
        q: "Will customers accept talking to an AI?",
        a: "Yes. Recall Touch voice is professional and natural. Customers judge by professionalism and responsiveness, not whether it's AI. Plus, it's available 24/7.",
      },
      {
        q: "What about complex or emotional calls?",
        a: "Recall Touch routes complex calls to your team. It screens, qualifies, and handles routine calls so your team focuses on what matters.",
      },
      {
        q: "Can I customize the responses?",
        a: "Completely. Upload your knowledge base, scripts, and rules. Recall Touch learns your business and handles calls exactly how you want.",
      },
      {
        q: "How quickly can I set this up?",
        a: "Minutes. No hiring, training, or onboarding. Just add your business info, set call rules, and go live. You're answering calls in under an hour.",
      },
      {
        q: "What happens during off-hours?",
        a: "Recall Touch follows your rules: answer after-hours, take messages, book appointments, or forward to backup. You set the rules.",
      },
    ],
  };

  return faqs[competitor] || [];
}
