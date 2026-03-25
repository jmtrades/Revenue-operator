import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { CheckCircle2, XCircle } from "lucide-react";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Recall Touch vs Hiring a Receptionist — Recall Touch",
  description:
    "Hiring a receptionist costs $35K–50K/year, 8 hours/day, and vacation days. Recall Touch costs $1,164–$11,964/year, works 24/7/365, and never misses a call.",
  alternates: { canonical: `${BASE}/compare/hiring-receptionist` },
  openGraph: {
    title: "Recall Touch vs Hiring a Receptionist — Recall Touch",
    description:
      "A full-time receptionist costs $35K–50K/year and works 8 hours. Recall Touch costs $97–997/month and answers every call, every time.",
    url: `${BASE}/compare/hiring-receptionist`,
    siteName: "Recall Touch",
    type: "website",
  },
};

type Row = { feature: string; recall: boolean; receptionist: boolean; note?: string };

const rows: Row[] = [
  { feature: "Annual cost", recall: false, receptionist: false, note: "Recall Touch: $1,164–$11,964/year. Receptionist: $35,000–$50,000/year salary + benefits." },
  { feature: "24/7/365 availability", recall: true, receptionist: false, note: "Recall Touch never sleeps. Receptionists work 8 hours/day, take vacations, and get sick." },
  { feature: "Concurrent call handling", recall: true, receptionist: false, note: "Recall Touch answers unlimited calls simultaneously. One receptionist = one call at a time." },
  { feature: "Response time (first ring to answer)", recall: true, receptionist: false, note: "Recall Touch: <3 seconds. Receptionist: 15–30 seconds (if available)." },
  { feature: "Consistent execution", recall: true, receptionist: false, note: "Recall Touch follows the same process every time. Humans vary, have off days, forget steps." },
  { feature: "Automatic follow-up sequences", recall: true, receptionist: false, note: "Recall Touch sends SMS reminders, booking links, and follow-ups. Receptionist does manual follow-ups (if they remember)." },
  { feature: "Scales without hiring", recall: true, receptionist: false, note: "Recall Touch handles 1 call or 1,000. Receptionist needs a second hire to cover." },
  { feature: "No-show recovery", recall: true, receptionist: false, note: "Recall Touch automatically texts and calls no-show leads. Receptionist can't reach them if not at desk." },
  { feature: "Personal, human touch", recall: false, receptionist: true, note: "A real receptionist can build rapport and handle complex objections. Recall Touch AI is getting better at this." },
  { feature: "Subject matter expertise", recall: false, receptionist: true, note: "A receptionist trained in your field can answer detailed questions. Recall Touch can be trained but has limits." },
  { feature: "Payroll, taxes, benefits", recall: false, receptionist: true, note: "Receptionist requires W-2, payroll taxes, health insurance, workers comp, vacation pay." },
];

export default function HiringReceptionistComparisonPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: `${BASE}/compare` },
      { "@type": "ListItem", position: 3, name: "Hiring a Receptionist", item: `${BASE}/compare/hiring-receptionist` },
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
              Recall Touch vs Hiring a Receptionist
            </h1>
            <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              A full-time receptionist costs $35,000–$50,000/year, works 8 hours a day, takes vacations, and still misses calls.
              Recall Touch costs $97–$997/month and answers every call 24/7/365. You get the reliability of AI without replacing your team.
            </p>
            <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Pricing as of March 2026. Receptionist salary based on U.S. Bureau of Labor Statistics and industry averages.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Recall Touch (what you get)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>Costs $1,164–$11,964/year (not $35K–$50K+)</li>
                <li>Available 24/7/365: never sleeps, never takes vacation, never calls in sick</li>
                <li>Answers unlimited concurrent calls</li>
                <li>Automatic follow-up: SMS reminders, booking confirmations, no-show recovery</li>
                <li>Perfect consistency: same script, same quality, every single call</li>
                <li>Scales without hiring: same price for 10 calls or 1,000</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Hiring a Receptionist (real constraints)</h2>
              <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <li>Costs $35,000–$50,000/year + benefits + payroll taxes</li>
                <li>Available 8 hours/day (or you hire a second person for shifts)</li>
                <li>Handles one call at a time (overflow = unanswered calls)</li>
                <li>Follow-up is manual: depends on memory and effort</li>
                <li>Variable quality: off days, training needed, turnover costs money</li>
                <li>Scales = more hiring = exponential cost growth</li>
              </ul>
            </div>
          </div>

          <section className="mt-10 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Feature-by-feature comparison</h2>
            <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              This table compares the operational metrics that impact revenue: cost, availability, handling speed, and consistency.
            </p>
            <div className="mt-6 rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Feature</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recall Touch</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Receptionist</th>
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
                        {r.receptionist ? <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400" aria-hidden /> : <XCircle className="w-5 h-5 mx-auto text-[var(--text-tertiary)]" aria-hidden />}
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
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>The real cost of a receptionist</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  A full-time receptionist costs $35,000–$50,000 in salary. Add payroll taxes (7.65%), health insurance ($6,000–$12,000/year),
                  workers compensation, paid time off, and training. Your all-in cost is closer to $50,000–$65,000 per year.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  And that one person works 40 hours a week. Outside those hours, you get voicemail. Add a second receptionist to cover evenings and weekends,
                  and your annual cost doubles.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Recall Touch costs $97–$997/month. That&apos;s $1,164–$11,964/year. For 24/7 coverage. With zero ongoing payroll.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Time = revenue lost</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  When a customer calls and gets voicemail, they're frustrated. Studies show 78% of callers who reach voicemail don&apos;t call back.
                  A receptionist can answer that call in 15–30 seconds (if they&apos;re available).
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Recall Touch answers in under 3 seconds. Every time. You capture the customer while they&apos;re still engaged and motivated to talk.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  That speed difference compounds: one unanswered call today = one lost customer. One call answered quickly = one scheduled appointment.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Consistency: the receptionist challenge</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  A receptionist has off days. They get frustrated with difficult calls. They forget to send follow-ups. They leave your company,
                  and you lose institutional knowledge and take weeks to find a replacement.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Recall Touch runs the same script, with the same tone, the same quality, the same follow-ups, every single call.
                  It never has an off day. It never forgets. It never quits.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  For revenue execution, consistency is a competitive advantage.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>The follow-up gap</h2>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  A receptionist takes a message. But who sends the SMS confirmation? Who texts the reminder the night before? Who calls the no-show and re-books them?
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  That work gets assigned to someone else, or it doesn&apos;t happen at all. Recall Touch handles all of it automatically.
                  Answer call → send SMS → reminder → follow-up → next outcome.
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Your receptionist answers the phone. Recall Touch closes the revenue loop.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-8">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>You&apos;re not replacing your receptionist</h2>
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Recall Touch handles the unanswered calls, the after-hours volume, the follow-ups, and the no-show recovery. Your receptionist stays focused
                on what they&apos;re good at: building relationships with customers who reach you during business hours.
              </p>
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                You get 24/7 coverage without doubling your headcount. You get consistency without complexity. You get revenue recovery without manual chasing.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/activate" className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                  Replace your hold music — not your team →
                </Link>
                <Link href="/pricing" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                  View pricing →
                </Link>
              </div>
              <p className="mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Tip: most teams use Recall Touch for after-hours + weekend overflow, while keeping their receptionist for daytime relationship-building.
              </p>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
