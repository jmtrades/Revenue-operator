import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "HVAC AI Revenue Operations — Recall Touch",
  description:
    "Capture urgent calls, book service windows, and follow up automatically with an AI phone system built for HVAC.",
  alternates: { canonical: `${BASE}/industries/hvac` },
};

export default function HvacIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "HVAC", item: `${BASE}/industries/hvac` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "HVAC AI Phone Agent",
    url: `${BASE}/industries/hvac`,
    description: "AI phone agent for HVAC teams: answers calls, books service windows, and recovers missed revenue.",
    address: { "@type": "PostalAddress", addressCountry: "US" },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <Navbar />
      <main className="pt-28 pb-20">
        <Container>
          <div className="max-w-3xl mx-auto">
            <p className="section-label mb-4" style={{ color: "var(--accent-primary)" }}>
              HVAC & home services
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Win the call that matters most: the one happening right now.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              HVAC demand spikes are unforgiving. When it’s 95°F and an AC dies, the customer calls the first company that
              answers. If your phones roll to voicemail after hours—or even during a busy afternoon—you lose the job to a competitor.
              Recall Touch is an AI phone system built for HVAC: answer every call 24/7, qualify urgency, book service windows,
              and run follow-up until the work is scheduled, completed, or the customer opts out.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Where HVAC revenue gets lost</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  HVAC is a speed-to-lead business. The lead is “hot” for minutes, not days. Missed calls are the obvious leak,
                  but there are quieter leaks too: weak qualification, slow callbacks, and inconsistent follow-up on estimates.
                </p>
                <p>
                  After-hours is the biggest opportunity. Many HVAC shops are excellent during office hours and invisible at night.
                  Yet breakdowns happen after hours. Answering after-hours calls doesn’t just create jobs—it creates loyalty, reviews,
                  and repeat maintenance plans.
                </p>
                <p>
                  The third leak is the quote. Customers often need a day to decide. Without a system, you’ll follow up once, then
                  move on. A calm, structured quote chase sequence—done with guardrails—wins jobs without feeling pushy.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">What Recall Touch does for HVAC teams</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Recall Touch answers calls and runs an HVAC-specific intake: name, address, unit type, symptoms, urgency signals,
                and preferred time windows. You can route emergencies to an on-call tech or dispatch line while non-urgent calls
                are scheduled automatically. If you operate multiple crews, you can segment schedules and routing by service area.
              </p>
              <p>
                For booking, Recall Touch can offer appointment windows based on your availability, confirm details by SMS, and
                trigger reminders to reduce missed appointments. If someone wants to “think about it,” the system sets follow-up
                so the job doesn’t vanish.
              </p>
              <p>
                Everything is measured: calls answered, leads captured, appointments booked, and revenue attributed to outcomes.
                That lets you scale what works and stop guessing.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Workflow examples</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>After-hours emergency capture with on-call escalation</li>
                  <li>Service booking: intake → window selection → confirmation</li>
                  <li>No-show prevention: reminders + easy reschedule link</li>
                  <li>Estimate follow-up: quote chase cadence with opt-out</li>
                  <li>Maintenance plan reactivation for inactive customers</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Guardrails (built for trust)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Business hours + quiet hours controls for outbound</li>
                  <li>Per-contact suppression limits to avoid over-contacting</li>
                  <li>Opt-out handling and do-not-call safeguards</li>
                  <li>Reviewable actions with optional approvals</li>
                  <li>Transparent transcripts and activity logs</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI math for HVAC</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                In HVAC, one recovered emergency job can cover the subscription for months. Even ignoring emergencies, the ROI is
                typically immediate: if your average ticket is $450 and you recover just one otherwise missed job per month,
                you’ve already beaten the plan cost. The bigger win is consistency—your shop becomes reliably responsive, even at
                peak load.
              </p>
              <p>
                The system also protects margin by improving scheduling efficiency: fewer missed appointments, fewer “no contact”
                dispatches, and fewer wasted call-backs. Your team spends more time doing billable work and less time chasing.
              </p>
              <p>
                The end result is a calmer operation: jobs flow in, get scheduled, get confirmed, and get followed up—without requiring
                your staff to be perfect every single day.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link href={ROUTES.START} className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                Start free →
              </Link>
              <Link href="/demo" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                Watch the demo →
              </Link>
              <Link href={ROUTES.PRICING} className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                View pricing →
              </Link>
            </div>

            <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Also available for{" "}
              <Link href="/industries/dental" className="underline">dental</Link>{" "}
              and{" "}
              <Link href="/industries/legal" className="underline">legal</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

