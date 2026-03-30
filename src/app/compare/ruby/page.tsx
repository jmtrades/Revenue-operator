import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { CheckCircle2, XCircle } from "lucide-react";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Revenue Operator vs Ruby Receptionists — Revenue Operator",
  description:
    "Ruby Receptionists vs Revenue Operator: compare per-minute human receptionist pricing, automation limits, outbound capabilities, and revenue attribution.",
  alternates: { canonical: "https://www.recall-touch.com/compare/ruby" },
  openGraph: {
    title: "Revenue Operator vs Ruby Receptionists — Revenue Operator",
    description:
      "Ruby Receptionists charges per minute with humans only. Revenue Operator is AI-powered 24/7 with automated follow-up, outbound campaigns, and revenue attribution.",
    url: "https://www.recall-touch.com/compare/ruby",
    siteName: "Revenue Operator",
    type: "website",
  },
};

type Row = { feature: string; recall: boolean; ruby: boolean; note?: string };

const rows: Row[] = [
  { feature: "Human receptionist coverage", recall: false, ruby: true, note: "Ruby is primarily a human coverage model." },
  { feature: "AI voice answering (24/7)", recall: true, ruby: false },
  { feature: "Automated follow-up engine", recall: true, ruby: false, note: "Revenue Operator runs follow-ups until the next outcome." },
  { feature: "No-show recovery sequences", recall: true, ruby: false },
  { feature: "Outbound campaigns (call + SMS sequences)", recall: true, ruby: false },
  { feature: "Revenue attribution to recovered outcomes", recall: true, ruby: false },
  { feature: "Automation and AI-driven qualification", recall: true, ruby: false },
  { feature: "Per-minute human pricing model", recall: false, ruby: true, note: "Ruby has historically been priced per minute (e.g. $1.50–$2.50/min)." },
  { feature: "Appointment booking built into the system", recall: true, ruby: false },
  { feature: "Analytics that connect actions to revenue", recall: true, ruby: false },
];

export default function RubyComparisonPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: `${BASE}/compare` },
      { "@type": "ListItem", position: 3, name: "Ruby Receptionists", item: `${BASE}/compare/ruby` },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Navbar />
      <main className="pt-16 pb-24">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-label mb-3" style={{ color: "var(--accent-primary)" }}>
              Comparison
            </p>
            <h1 className="font-bold text-4xl md:text-5xl leading-tight">
              Revenue Operator vs Ruby Receptionists
            </h1>
            <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Ruby Receptionists can cover your calls with humans. Revenue Operator adds AI-driven qualification, automated follow-up,
              outbound campaigns, and revenue attribution — so coverage turns into recovered revenue.
            </p>
            <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Pricing as of March 2026. Visit{" "}
              <a
                href="https://www.ruby.com/pricing/"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
              >
                ruby.com/pricing
              </a>{" "}
              for current pricing.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Revenue Operator (the revenue system)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>AI-powered answering 24/7 with consistent scripts</li>
                <li>Automated follow-up engine (bookings, no-shows, reactivation)</li>
                <li>Outbound campaigns with AI calls + SMS sequences</li>
                <li>Revenue attribution and dashboard proof for recovered outcomes</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Ruby (typical limitations)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>Per-minute human receptionist pricing (e.g. $1.50–$2.50/min)</li>
                <li>Human coverage model doesn&apos;t automate qualification and scheduling workflows</li>
                <li>No AI automation layer for campaigns or structured follow-up</li>
                <li>No native revenue attribution for recovered outcomes</li>
              </ul>
            </div>
          </div>

          <section className="mt-10 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Feature-by-feature comparison</h2>
            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              This comparison is focused on the practical differences that change outcomes: automation, outbound execution, and proof of revenue impact.
            </p>
            <div className="mt-6 rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Feature</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Revenue Operator</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ruby</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.feature} className="border-b border-[var(--border-default)]">
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {r.feature}
                        {r.note && <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>{r.note}</div>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {r.recall ? <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400" aria-hidden /> : <XCircle className="w-5 h-5 mx-auto text-[var(--text-tertiary)]" aria-hidden />}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {r.ruby ? <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400" aria-hidden /> : <XCircle className="w-5 h-5 mx-auto text-[var(--text-tertiary)]" aria-hidden />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Human coverage isn&apos;t the same as automated revenue recovery</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Human receptionists are valuable when the conversation requires judgment. But the cost is per minute, and the coverage model doesn&apos;t inherently create
                  a reliable follow-up engine.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Revenue Operator uses AI to handle the repeatable parts of your intake and qualification. Then it turns outcomes into structured next actions:
                  appointment booking, confirmation reminders, no-show recovery, and reactivation sequences for leads who went quiet.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  When you recover revenue automatically, you stop relying on manual follow-up schedules and you regain pipeline consistency. That&apos;s how you convert coverage into business results.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Outbound + follow-up = more than answering more calls</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Many teams start with inbound call coverage, then discover they still need to recover missed opportunities and generate additional touches.
                  Outbound campaigns — including call + SMS sequences — are how you create controlled follow-through when the funnel needs it.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Revenue Operator runs those campaigns as part of a unified system. Each outbound motion connects to a tracked outcome, so you can see which sequences drive bookings and recovered value.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Ruby-style coverage can answer calls — but it doesn&apos;t provide the outbound and attribution layer that turns outreach into measurable revenue execution.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-8">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Ready to replace manual chasing?</h2>
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                If you want AI coverage plus automated follow-up, outbound campaigns, and dashboard proof for revenue attribution, Revenue Operator is the complete execution layer.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/activate" className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                  Get Started →
                </Link>
                <Link href="/pricing" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                  View pricing →
                </Link>
                <Link href="/results" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                  See real results →
                </Link>
              </div>
              <p className="mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Tip: start by recovering unanswered calls and no-shows, then layer outbound sequences when your inbound volume is already stable.
              </p>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

