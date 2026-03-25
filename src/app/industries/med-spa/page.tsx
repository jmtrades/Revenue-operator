import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "Med Spa AI Phone Agent — Recall Touch",
  description:
    "Answer consultation calls, book treatments, run reminder sequences, upsell packages with follow-up, and recover cancellations using an AI phone agent for med spas.",
  alternates: { canonical: "https://www.recall-touch.com/industries/med-spa" },
};

export default function MedSpaIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Med Spa", item: `${BASE}/industries/med-spa` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Med Spa AI Phone Agent",
    url: `${BASE}/industries/med-spa`,
    description:
      "AI phone agent for med spas: answers consultation calls, books treatments, runs reminders, and recovers cancellations.",
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
              Med spas & aesthetic clinics
            </p>
            <h1
              className="font-bold mb-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
            >
              More consultations, fewer gaps, and higher package conversion
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Med spas run on timing. When a potential client calls, they&apos;re usually ready to book now — or they&apos;re comparing options
              and waiting for the right next step. If your team is in a procedure, handling check-in, or short-staffed, calls can go unanswered.
              Even a short delay can turn a warm inquiry into silence.
              <br />
              <br />
              Recall Touch is an AI phone system that handles the entire revenue loop for med spas: it answers inbound questions, captures the right
              details (service interest, timeline, goals), books consultations or treatments, and follows up with reminders that reduce no-shows.
              Then it adds the "next best touch" for package upsells — without spamming clients or breaking your cancellation policy.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Pain stats med spas feel every week</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  <strong>Missed consultations during peak hours.</strong> Many clinics peak around late mornings and late afternoons when staff is mid-procedure.
                  If the caller hits voicemail or doesn&apos;t get a response quickly, they&apos;ll often book with the next facility that answers.
                </p>
                <p>
                  <strong>Cancellation-driven revenue volatility.</strong> Treatment pipelines depend on consistency. When cancellations aren&apos;t recovered fast enough,
                  the clinic loses scheduled revenue and has to chase fills on a shorter timeline.
                </p>
                <p>
                  <strong>Follow-up that never compounds.</strong> If someone requests an estimate, asks for pricing, or wants a "maybe" date,
                  the clinic&apos;s manual follow-up can get delayed. The lead doesn&apos;t stop being interested — it just becomes harder to convert.
                </p>
                <p>
                  <strong>Package upsell requires the right cadence.</strong> A package isn&apos;t a one-call decision. It needs a sequence: consultation quality intake,
                  treatment completion signals, and then a guided offer at the right time.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Recall Touch works for med spa clinics</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                <strong>Consultation booking with the right questions.</strong> When a new client calls, the agent captures what they&apos;re interested in,
                when they&apos;d like to start, and any constraints that affect scheduling. It answers FAQs using your rules so it doesn&apos;t overpromise,
                and it routes complex requests for human review while keeping fast-moving leads moving.
              </p>
              <p>
                <strong>Treatment reminders that reduce no-shows.</strong> After booking, Recall Touch triggers reminders for upcoming appointments.
                The goal isn&apos;t "generic messages." It&apos;s clear confirmations plus an easy reschedule path. When someone doesn&apos;t respond,
                the agent can follow up again so the clinic has a better chance to recover the slot.
              </p>
              <p>
                <strong>Cancellation recovery aligned to your policy.</strong> If a client cancels or misses a visit, the system runs a recovery workflow:
                it offers rescheduling windows, asks a minimal set of questions, and can surface a human closer when appropriate. That means the pipeline
                can fill gaps faster and reduce revenue volatility.
              </p>
              <p>
                <strong>Package upsell follow-up (the "right next step" engine).</strong> Med spas earn more when packages and treatment plans convert.
                Recall Touch uses follow-up sequences to promote packages after key milestones: completion signals, a time-based cadence,
                and a gated offer so only interested clients see the upsell. The client feels cared for, not pushed.
              </p>
              <p>
                <strong>Proof in your dashboard.</strong> You can measure calls answered, consultations booked, reminder performance, cancellation recovery outcomes,
                and revenue attribution tied to the follow-up engine. Instead of guessing where revenue disappears, you can identify the exact bottleneck.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Included workflows (med spa specific)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Consultation booking: intake → confirmation → scheduling</li>
                  <li>Treatment reminder sequences: confirmations + reschedule prompts</li>
                  <li>No-show reduction: multiple touches aligned to your availability</li>
                  <li>Cancellation recovery: rebook outreach and appointment window offers</li>
                  <li>Package upsell follow-up: guided "next step" offers post-visit</li>
                  <li>Reactivation for inactive leads: keep interest alive between sessions</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Guardrails (compliance + trust)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Quiet hours + business-hours enforcement</li>
                  <li>Suppression and per-contact limits to prevent over-messaging</li>
                  <li>Opt-out and do-not-contact safeguards</li>
                  <li>Reviewable actions with optional approvals for edge cases</li>
                  <li>Transcripts and activity history for accountability</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI math for med spas (consultations + lost slots)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.85 }}>
              <p>
                Med spa ROI typically comes from two linked problems: you lose consults when calls go unanswered, and you lose revenue when sessions get canceled without fast recovery.
                Here&apos;s a practical model: assume your average consultation (or booking deposit path) contributes <strong>$120</strong> of expected value and your average treatment
                slot contributes <strong>$350</strong> expected gross profit.
              </p>
              <p>
                If you receive <strong>80</strong> inbound inquiries per week and you currently answer only <strong>70%</strong> of them quickly enough to book,
                that&apos;s <strong>24</strong> leads you&apos;d otherwise convert. If even <strong>10%</strong> of those becomes a booked consult or scheduled session,
                you gain <strong>~$720</strong> of expected value per week — before repeat business.
              </p>
              <p>
                Then look at cancellations. If <strong>12</strong> scheduled visits get canceled monthly and you recover <strong>4</strong> of them with fast outreach,
                at <strong>$350</strong> per slot that&apos;s <strong>$1,400</strong> in recovered profit. Recall Touch increases recovery chances by making outreach
                immediate, consistent, and aligned to an easy rescheduling path.
              </p>
              <p>
                Package upsells add a second lift because the offer timing matters. When follow-up is automated and triggered by the right milestones, you
                increase package conversion without raising cancellation risk or damaging trust.
              </p>
              <p>
                With Recall Touch, every touch becomes measurable. You track what was answered, what was booked, what reminders were sent, what cancellations were recovered,
                and how it translates into revenue attribution.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 flex-wrap">
              <Link href={ROUTES.START} className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                Start free →
              </Link>
              <Link href="/demo" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                Watch the demo →
              </Link>
              <Link href="/pricing" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline">
                View pricing →
              </Link>
            </div>

            <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Prefer another vertical? See{" "}
              <Link href="/industries/roofing" className="underline">roofing</Link> or{" "}
              <Link href="/industries/recruiting" className="underline">recruiting</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

