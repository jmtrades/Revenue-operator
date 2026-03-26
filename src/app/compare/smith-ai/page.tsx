import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { CheckCircle2, XCircle } from "lucide-react";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Recall Touch vs Smith.ai — Recall Touch",
  description:
    "Smith.ai vs Recall Touch: compare pricing, follow-up capability, outbound campaigns, and revenue attribution to see which system recovers more revenue.",
  alternates: { canonical: `${BASE}/compare/smith-ai` },
  openGraph: {
    title: "Recall Touch vs Smith.ai — Recall Touch",
    description:
      "Compare Smith.ai’s per-call pricing with Recall Touch’s flat monthly pricing, full follow-up engine, outbound campaigns, and revenue attribution.",
    url: `${BASE}/compare/smith-ai`,
    siteName: "Recall Touch",
    type: "website",
  },
};

type Row = { feature: string; recall: boolean; smith: boolean; note?: string };

const rows: Row[] = [
  { feature: "AI voice answering (24/7)", recall: true, smith: true },
  { feature: "Automated follow-up engine", recall: true, smith: false, note: "Recall Touch runs follow-ups until the next outcome." },
  { feature: "No-show recovery sequences", recall: true, smith: false },
  { feature: "Outbound campaigns (call + SMS sequences)", recall: true, smith: false },
  { feature: "Revenue attribution to recovered outcomes", recall: true, smith: false },
  { feature: "Flat monthly pricing", recall: true, smith: false, note: "Pricing scales with your plan, not each call." },
  { feature: "Per-call pricing model", recall: false, smith: true, note: "Smith.ai commonly charges per call (e.g. $3.25–$9.50/call)." },
  { feature: "Appointment booking in the same system", recall: true, smith: false },
  { feature: "Dashboard proof for conversions and revenue", recall: true, smith: false },
];

export default function SmithAiComparisonPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: `${BASE}/compare` },
      { "@type": "ListItem", position: 3, name: "Smith.ai", item: `${BASE}/compare/smith-ai` },
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
              Recall Touch vs Smith.ai
            </h1>
            <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Smith.ai is built for answering calls. Recall Touch is built for revenue execution: follow-up until the next outcome,
              outbound campaigns when the funnel needs it, and dashboards that attribute recovered value.
            </p>
            <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Pricing as of March 2026. Visit{" "}
              <a
                href="https://smith.ai/pricing"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
              >
                smith.ai/pricing
              </a>{" "}
              for current pricing.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Recall Touch (what you get)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>Flat monthly pricing</li>
                <li>Full follow-up engine: appointment booking, no-show recovery, and reactivation</li>
                <li>Outbound campaigns (AI calls + SMS sequences)</li>
                <li>Revenue attribution: proof in your dashboard for recovered outcomes</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Smith.ai (typical gaps)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>Per-call pricing (often $3.25–$9.50 per call)</li>
                <li>No follow-up engine that keeps leads moving</li>
                <li>No outbound campaigns as a native system capability</li>
                <li>No revenue attribution for recovered outcomes</li>
              </ul>
            </div>
          </div>

          <section className="mt-10 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Feature-by-feature comparison</h2>
            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              This table focuses on the levers that determine ROI: follow-through after the call, the ability to run outbound sequences,
              and proof that recovered outcomes map to real revenue.
            </p>
            <div className="mt-6 rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Feature</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recall Touch</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Smith.ai</th>
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
                        {r.smith ? <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400" aria-hidden /> : <XCircle className="w-5 h-5 mx-auto text-[var(--text-tertiary)]" aria-hidden />}
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
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Why "answering" isn&apos;t the business outcome</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Most callers don&apos;t become customers in a single interaction. They need follow-up: confirmations, rescheduling, quotes,
                  and sometimes just a consistent next step after voicemail would have happened.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Recall Touch runs the follow-up engine as part of the same system. That means the revenue journey doesn&apos;t stop when the call ends.
                  It continues until an appointment is booked, a no-show is recovered, a pending quote is chased, or the lead opts out.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Smith.ai can be a strong starting point for call coverage — but it isn&apos;t designed as a revenue execution layer that proves outcomes.
                  Without that follow-through, you often end up with manual chasing or additional tooling just to move the pipeline forward.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Pricing math: why per-call scaling can hurt</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  A per-call model looks simple, but the moment your inbound volume grows (seasonality, paid campaigns, storm spikes, new locations),
                  costs scale with every answered opportunity.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Recall Touch uses flat monthly plans so your costs stay predictable. The plan is designed around your capacity needs and your follow-up workload —
                  not around how many calls were placed in a month.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  When you add the follow-up engine and outbound sequences, you also stop paying for coverage only. You get a system that recovers revenue,
                  and your dashboard shows the recovered outcomes.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-8">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Ready to run revenue execution?</h2>
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                If you want call answering plus automated recovery, outbound sequences, and revenue attribution, Recall Touch is the execution layer your team needs.
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
                Tip: test your scripts and follow-ups on your first live flow — then let the system recover revenue around your schedule.
              </p>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

