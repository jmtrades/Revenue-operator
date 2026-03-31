import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { CheckCircle2, XCircle } from "lucide-react";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Revenue Operator vs GoHighLevel (GHL) — Revenue Operator",
  description:
    "GoHighLevel vs Revenue Operator: compare setup time, voice AI capability, AI phone agent capabilities, and pricing. Revenue Operator delivers AI phone + revenue ops in under 3 minutes.",
  alternates: { canonical: "https://www.recall-touch.com/compare/gohighlevel" },
  openGraph: {
    title: "Revenue Operator vs GoHighLevel (GHL) — Revenue Operator",
    description:
      "GoHighLevel requires weeks of setup for marketing automation. Revenue Operator is purpose-built AI phone + revenue operations that works in under 3 minutes.",
    url: "https://www.recall-touch.com/compare/gohighlevel",
    siteName: "Revenue Operator",
    type: "website",
  },
};

type Row = { feature: string; recall: boolean; ghl: boolean; note?: string };

const rows: Row[] = [
  { feature: "Live in minutes, not weeks", recall: true, ghl: false, note: "Revenue Operator goes live in under 3 minutes. GHL requires CRM setup, workflow builder, and integration configuration." },
  { feature: "Advanced voice AI with natural voice", recall: true, ghl: false, note: "Revenue Operator uses state-of-the-art AI voice that sounds human. GHL has basic or no native voice AI." },
  { feature: "24/7 AI call answering (inbound + outbound)", recall: true, ghl: false, note: "Revenue Operator answers every call and runs outbound campaigns. GHL requires manual workflow setup and doesn't focus on inbound recovery." },
  { feature: "Automatic follow-up sequences (calls, SMS, email)", recall: true, ghl: false, note: "Revenue Operator runs follow-up sequences automatically until next outcome. GHL requires manual workflow builders." },
  { feature: "Flat monthly pricing ($147–$997)", recall: true, ghl: false, note: "Revenue Operator pricing is transparent and all-inclusive. GHL base + agencies often add 50–100% markup on top." },
  { feature: "Per-seat licensing with markup", recall: false, ghl: true, note: "GHL uses per-seat or agency bundle pricing, commonly $97–$497/mo, often with reseller markups." },
  { feature: "Plug-and-play setup (no CRM builder)", recall: true, ghl: false, note: "Revenue Operator connects instantly with zero configuration. GHL requires building workflows in the CRM builder." },
  { feature: "Marketing platform with CRM", recall: false, ghl: true, note: "GHL is a full-stack marketing platform with extensive customization. That power comes with learning curve." },
  { feature: "Revenue attribution for recovered calls", recall: true, ghl: false },
  { feature: "Outbound AI call sequences", recall: true, ghl: false, note: "Revenue Operator natively runs outbound campaigns. GHL doesn't have built-in AI voice outbound." },
];

export default function GoHighLevelComparisonPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: `${BASE}/compare` },
      { "@type": "ListItem", position: 3, name: "GoHighLevel", item: `${BASE}/compare/gohighlevel` },
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
              Revenue Operator vs GoHighLevel
            </h1>
            <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              GoHighLevel is a marketing platform that requires weeks of setup and configuration. Revenue Operator is purpose-built AI phone + revenue operations
              that answers calls, generates revenue through outbound campaigns, and scales inbound operations — live in under 3 minutes.
            </p>
            <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {`Pricing as of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}. Visit{" "}
              <a
                href="https://gohighlevel.com/pricing"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
              >
                gohighlevel.com/pricing
              </a>{" "}
              for current pricing.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Revenue Operator (what you get)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>Live in under 3 minutes: no setup, no builder, no configuration</li>
                <li>Advanced AI voice answering: sounds human, handles objections naturally</li>
                <li>Automatic call handling + follow-up: sequences run until next outcome</li>
                <li>Flat monthly pricing: $147–$997/mo, all-inclusive, no markups</li>
                <li>Outbound AI campaigns: calls + SMS sequences targeting warm leads</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>GoHighLevel (typical gaps)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>Weeks-long setup: requires CRM configuration, workflow builder, integrations</li>
                <li>No native advanced voice AI: no built-in sophisticated voice capability</li>
                <li>Manual call handling: requires custom workflows, no auto-recovery</li>
                <li>Expensive with agency markup: $97–$497/mo often + 50–100% reseller fee</li>
                <li>Steep learning curve: CRM builder, automation, customization require training</li>
              </ul>
            </div>
          </div>

          <section className="mt-10 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Feature-by-feature comparison</h2>
            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              This table focuses on the capabilities that determine revenue execution speed: how fast you go live, voice quality, AI phone capabilities, and total cost of ownership.
            </p>
            <div className="mt-6 rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Feature</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Revenue Operator</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>GoHighLevel</th>
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
                        {r.ghl ? <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400" aria-hidden /> : <XCircle className="w-5 h-5 mx-auto text-[var(--text-tertiary)]" aria-hidden />}
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
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Speed matters: setup time vs time to first call</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  GoHighLevel is powerful but requires your team to build workflows, configure the CRM, connect integrations, and set up automations.
                  That's weeks of work before your first lead gets a callback.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Revenue Operator is different. You connect your phone number, write your voice AI instructions, and you&apos;re live in under 3 minutes.
                  No workflow builder. No CRM to learn. No months of configuration before revenue starts flowing.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  When every unanswered lead is money lost, speed of deployment is a revenue metric.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Voice AI: the difference between human and mechanical</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  GoHighLevel is built for marketing automation, not voice. If it has voice at all, it&apos;s basic. Revenue Operator is built on best-in-class
                  voice AI that sounds human, understands context, and answers objections naturally.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Your customers hear the difference in the first 2 seconds. A mechanical voice can hurt your brand and damage conversion rates.
                  Revenue Operator sounds like someone who actually cares about their call.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  For inbound call handling, voice quality is a conversion tool.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Leads don&apos;t wait for your workflows</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  With GoHighLevel, you need to build a workflow every time you want to handle a call or follow up. That&apos;s custom logic, testing, and tweaking.
                  By the time it&apos;s live, you&apos;ve lost time and leads.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Revenue Operator handles calls and follow-ups automatically. Answer → SMS → follow-up → next outcome. All built in. No workflow to create.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Pricing math: total cost of ownership</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  GoHighLevel starts at $97/mo and goes up to $497/mo. Then many teams buy through agencies, which add 50–100% markup. That's $200–$1,000/mo for one user.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Revenue Operator is $147–$997/mo, flat monthly, no markups, no per-seat licensing. Everyone on your team uses the same system for the same price.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  For a team of 3–5, that&apos;s a $500–$2,500/mo difference. On an annual basis, that difference is transformative.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-8">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Ready to skip the setup?</h2>
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                If you need AI phone agents, outbound campaigns, and revenue execution working today — not weeks from now — Revenue Operator is your move.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/activate" className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                  Try Revenue Operator free — live in under 3 minutes →
                </Link>
                <Link href="/pricing" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                  View pricing →
                </Link>
              </div>
              <p className="mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Tip: no credit card required. Connect your number and take your first AI-handled call in under 5 minutes.
              </p>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
