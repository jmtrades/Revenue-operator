import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "Dental AI Phone Agent — Recall Touch",
  description:
    "Answer every call, book more cleanings, and reduce no-shows with automated follow-up built for dental practices.",
  alternates: { canonical: `${BASE}/industries/dental` },
};

export default function DentalIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Dental", item: `${BASE}/industries/dental` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Dental AI Phone Agent",
    url: `${BASE}/industries/dental`,
    description: "AI phone agent for dental practices: answers calls, books appointments, and recovers missed revenue.",
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
              Dental practices
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Answer every call. Fill the schedule. Reduce no-shows.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Dental revenue is sensitive to speed and follow-through. New patient calls often arrive when your front desk is
              busy checking in patients, running insurance, or confirming tomorrow’s schedule. When a caller hits voicemail,
              the practice doesn’t just lose "a lead"—it loses a production slot that will take weeks to replace. Recall Touch
              is the AI phone system built to prevent that: it answers 24/7, captures intent, books appointments, and follows
              up until the patient is scheduled, converted, or opts out.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">What’s really leaking revenue in dental</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  Dental isn’t short on demand—it’s short on timely capture. The most common leak isn’t "marketing," it’s
                  missed and mishandled calls. A new patient calls at 12:10 PM. The front desk is in the middle of a checkout.
                  The caller gets voicemail and moves on. Even if they leave a message, they’re now one of ten callbacks and
                  the practice is behind. If the callback happens hours later, conversion drops sharply.
                </p>
                <p>
                  The second leak is no-shows. A no-show is rarely a single-point failure; it’s a follow-up failure. People
                  forget. They get anxious. They want to reschedule but don’t want to call. The fix is a consistent, respectful
                  cadence: confirm, remind, and offer an easy reschedule path.
                </p>
                <p>
                  The third leak is "dead leads" sitting in your pipeline: unscheduled recall, incomplete treatment plans,
                  and quote-follow-up. These aren’t bad patients—they’re unworked opportunities.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Recall Touch works for dental</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Recall Touch answers calls with a dental-ready flow: it collects the patient’s name and number, clarifies the
                reason for the call (new patient, emergency, existing patient, insurance question, recall), and routes or books
                based on your rules. When your calendar is connected, it offers available times and confirms the appointment.
                When you prefer human confirmation, it captures a complete intake and sends your team a clean summary.
              </p>
              <p>
                After the call, Recall Touch doesn’t stop. It runs follow-up sequences: confirmations, reminders, and
                reschedule workflows. If someone doesn’t answer, it can text. If someone replies with a question, it can answer
                using your knowledge base and either book or hand off—without dropping context.
              </p>
              <p>
                Every outcome is visible. You see calls answered, appointments booked, follow-ups sent, and revenue recovered.
                That means you can measure, iterate, and scale—not guess.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Included workflows (examples)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>New patient booking with availability + confirmations</li>
                  <li>No-show prevention: 24h + 1h reminders, easy reschedule</li>
                  <li>No-show recovery: "Want to rebook?" sequence + call follow-up</li>
                  <li>Unscheduled treatment plan follow-up (quote chase)</li>
                  <li>Recall reactivation for inactive patients</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Guardrails (to stay compliant)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Quiet hours and business-hour controls</li>
                  <li>Per-contact limits (calls/SMS) to prevent spam</li>
                  <li>Opt-out handling and do-not-contact safeguards</li>
                  <li>Reviewable actions and optional approvals</li>
                  <li>Auditability via transcripts and activity history</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI math (why this is usually immediate)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Dental economics are straightforward: one kept new patient appointment or one recovered hygiene slot can cover
                the monthly subscription. If your average appointment value is $250 and you recover just two otherwise
                missed appointments per month, that’s $500 in incremental production before downstream treatment plans.
              </p>
              <p>
                Practices that run a consistent reminder + reschedule system often see fewer empty chairs. And when a no-show
                does happen, "rescue" follow-up can convert that miss into a kept appointment within the same week—protecting
                near-term production and reducing schedule volatility.
              </p>
              <p>
                The key is consistency. Humans get busy. Systems don’t. Recall Touch makes follow-through automatic and visible.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link href={ROUTES.START} className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                Start free →
              </Link>
              <Link href="/demo" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                Watch the demo →
              </Link>
              <Link href={ROUTES.PRICING} className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                View pricing →
              </Link>
            </div>

            <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Prefer another vertical? See{" "}
              <Link href="/industries/legal" className="underline">legal</Link>{" "}
              or{" "}
              <Link href="/industries/hvac" className="underline">HVAC</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

