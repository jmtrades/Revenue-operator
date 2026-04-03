import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "Roofing AI Revenue Operations Platform — Revenue Operator",
  description:
    "Maximize storm response and inspection-to-job conversion with complete AI-powered workflows: instant call answering, damage assessment and qualification, inspection scheduling, estimate follow-up, and no-show prevention.",
  alternates: { canonical: "https://www.recall-touch.com/industries/roofing" },
};

export default function RoofingIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Roofing", item: `${BASE}/industries/roofing` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Roofing AI Revenue Operations Platform",
    url: `${BASE}/industries/roofing`,
    description:
      "Complete AI revenue operations for roofing: storm damage call answering, damage intake and qualification, inspection scheduling and confirmations, estimate follow-up automation, no-show prevention, and lead reactivation.",
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
              Roofing & home restoration
            </p>
            <h1
              className="font-bold mb-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
            >
              Storm-ready answering, inspection booking, and no-show recovery
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Roofing is a call-driven business with sudden volume spikes. When a hailstorm hits, your phones can light up within minutes.
              If your team can&apos;t answer fast enough (or the caller reaches voicemail), the lead often calls another contractor right away and
              stops shopping after the &quot;next available&quot; appointment is booked.
              <br />
              <br />
              Revenue Operator is the AI phone system built for roofing execution: it answers calls 24/7, qualifies storm damage intent, books
              inspection windows, and runs follow-up sequences for estimates and insurance conversations. Most importantly, it doesn&apos;t
              assume the sale is lost when someone misses an appointment — it recovers no-shows and reactivates leads who need a second touch.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Where roofing revenue leaks</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  <strong>Missed storm calls.</strong> Storms create &quot;right now&quot; urgency. Many customers will call multiple contractors
                  in the first hour, then commit when someone answers and schedules quickly. If your missed-call response is delayed by
                  voicemail, call-back gaps, or weekend coverage, your competition becomes the default.
                </p>
                <p>
                  <strong>Unbooked inspections.</strong> A caller can want an inspection and still get distracted. Without structured
                  scheduling intake (address, roof type, damage symptoms, preferred time), callers leave with vague expectations.
                  When the follow-up is manual, it&apos;s easy to lose the lead’s momentum.
                </p>
                <p>
                  <strong>Estimate follow-up that never compounds.</strong> After the inspection, many teams are swamped and the next step
                  gets pushed to &quot;we’ll call tomorrow.&quot; Tomorrow often turns into three days, then a week. The quote isn&apos;t just delayed —
                  it becomes negotiable and competitors get another window to reach out first.
                </p>
                <p>
                  <strong>No-shows for inspections.</strong> No-show isn&apos;t a single problem; it&apos;s a scheduling failure plus a communication
                  failure. If you only send one reminder (or none), the inspection falls apart and the calendar loses a productive slot.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator works for roofing</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                <strong>Answer and qualify the storm intent.</strong> When someone calls, Revenue Operator captures the caller&apos;s name, phone,
                address, and the symptoms they&apos;re seeing (hail damage, leaks, fallen branches, visible roof wear). It also confirms what
                they&apos;re trying to achieve — inspection booking, damage question, insurance process, or estimate follow-up — so your team
                is working from a clean intake rather than guessing.
              </p>
              <p>
                <strong>Book inspection windows automatically.</strong> With your calendar connected, the agent offers time windows that match
                the availability you define. It confirms key details by voice and message, and it generates a clear handoff summary for your team
                so the inspection coordinator starts prepared.
              </p>
              <p>
                <strong>Run follow-up sequences until the next appointment step is scheduled.</strong> After the inspection, Revenue Operator follows up
                on the estimate process. If the caller is waiting to hear back, it prompts the right next action — a quote review, a clarification call,
                or an updated appointment for next steps.
              </p>
              <p>
                <strong>Recover no-shows and bring leads back.</strong> If the inspection is missed, the system triggers a respectful reschedule
                flow: confirmation reminders, a clear rescheduling path, and (when needed) an escalation call. If the caller goes quiet, Revenue Operator
                reactivates the lead with a new &quot;next step&quot; so revenue doesn&apos;t wait for your next office-hour slot.
              </p>
              <p>
                <strong>Show proof inside your dashboard.</strong> You don&apos;t just see &quot;calls received.&quot; You see calls answered, inspection appointments booked,
                no-shows recovered, estimate follow-ups executed, and revenue attribution from the entire pipeline. That means your team can tune scripts
                and scheduling rules based on outcomes, not assumptions.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Included workflows for roofing teams</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Storm damage intake: symptoms + address + preferred window</li>
                  <li>Inspection booking with confirmations and schedule reminders</li>
                  <li>No-show prevention: proactive reminders and easy reschedule instructions</li>
                  <li>No-show recovery: &quot;want to rebook?&quot; outreach sequence + call follow-up</li>
                  <li>Estimate follow-up: quote chase flow for pending decisions</li>
                  <li>Reactivation for stalled leads: &quot;we can help when you&apos;re ready&quot; cadence</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Guardrails (built for trust)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Business hours and quiet hours controls</li>
                  <li>Per-contact suppression limits to prevent over-contact</li>
                  <li>DNC / opt-out handling and reviewable actions</li>
                  <li>Transcripts, activity history, and auditability for every touch</li>
                  <li>Optional approvals for edge cases</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI math for roofing (storm seasons especially)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.85 }}>
              <p>
                Roofing ROI often shows up fastest in two places: inspection bookings and no-show rescue.
                Suppose your average inspection is followed by a signed job with an average gross profit of <strong>$650</strong>.
                During a storm week, you might get <strong>120</strong> inbound calls. If you answer 20% fewer calls than you could,
                that can quietly cost you several jobs.
              </p>
              <p>
                Now consider no-shows. If 10% of booked inspections are missed and rescheduling recovers half of them, a simple recovery math
                can look like this: with <strong>40</strong> booked inspections, <strong>4</strong> no-shows happen. If you recover <strong>2</strong>,
                and each recovered inspection leads to a job with <strong>$650</strong> gross profit, that&apos;s <strong>$1,300</strong> of
                incremental profit from one storm window. Your subscription is usually covered quickly when your calendar churn is improved.
              </p>
              <p>
                The bigger advantage is compounding follow-through. When estimate follow-up is automatic, you&apos;re not waiting for &quot;tomorrow’s
                coordinator&quot; to call. Quote chase keeps momentum and reduces the time your competitors spend winning the next touch.
              </p>
              <p>
                Revenue Operator makes the process predictable. Storm demand becomes booked work, not voicemail triage — and the revenue recovery system
                keeps running even when your team is in the field.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 flex-wrap">
              <Link href={ROUTES.START} className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                Get started →
              </Link>
              <Link href="/demo" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                Watch the demo →
              </Link>
              <Link href="/pricing" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                View pricing →
              </Link>
            </div>

            <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Prefer a different vertical? See{" "}
              <Link href="/industries/med-spa" className="underline">med spa</Link> or{" "}
              <Link href="/industries/recruiting" className="underline">recruiting</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

