import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "Healthcare AI Revenue Operations Platform — Revenue Operator",
  description:
    "Drive patient revenue and operational efficiency with complete AI-powered workflows: call answering, appointment management, no-show recovery, prescription handling, and follow-up automation—HIPAA-compliant.",
  alternates: { canonical: `${BASE}/industries/healthcare` },
};

export default function HealthcareIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Healthcare", item: `${BASE}/industries/healthcare` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Healthcare AI Revenue Operations Platform",
    url: `${BASE}/industries/healthcare`,
    description: "Complete HIPAA-compliant AI revenue operations for healthcare: call answering, patient scheduling, no-show prevention, prescription automation, lab result routing, appointment reminders, and patient engagement.",
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
              Healthcare & Medical Practices
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Answer patient calls instantly. Reduce no-shows. Fill the schedule. HIPAA-compliant.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Healthcare is fundamentally a scheduling business, and scheduling breaks when your phone system doesn&apos;t answer. Patients call to book appointments, refill prescriptions, ask about test results, or report side effects. Your staff is managing charts, running clinics, and answering emails. Calls go to voicemail. Callbacks happen late. Patients get frustrated and choose a different provider. Revenue Operator answers every call, books appointments into your calendar, handles routine refill requests, and prevents no-shows—all while maintaining HIPAA compliance and letting clinicians focus on care.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Why patient call volume overwhelms practices</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  A typical medical practice gets 150–300 calls per day: new patient appointments, existing patient questions, prescription refills, lab result inquiries, insurance questions, and same-day sick calls. Each one is important. But the front desk has 2–3 people, and they&apos;re already at capacity. When callers can&apos;t reach the office or get put on hold for 10 minutes, they call a competitor or use an urgent care.
                </p>
                <p>
                  The second leak is no-shows. A patient books an appointment two weeks out. They forget. Or they get anxious. Or they have a new conflict. No-show rates often run 15–25%. Each no-show is lost revenue, but more importantly, it&apos;s a wasted appointment slot that could have gone to a patient who needed care. The fix is consistent reminders and an easy reschedule path—but that requires human follow-up that your team doesn&apos;t have bandwidth for.
                </p>
                <p>
                  The third challenge is routine work that fills your clinical team&apos;s day: &quot;Can I get a refill?&quot; &quot;Do you have my insurance?&quot; &quot;When do I get my results?&quot; These are answerable by a structured system but require a human to pick up the phone first.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator works for healthcare</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Revenue Operator answers patient calls with a friendly, clinical-appropriate greeting. It asks the reason for the call, verifies patient identity (date of birth, last four of SSN), and routes appropriately. New appointment requests go to your calendar. Prescription refill requests go to the pharmacy or provider approval queue. Urgent symptoms trigger immediate escalation to the nurse or provider on call.
              </p>
              <p>
                For routine questions (lab results, insurance eligibility, appointment times), Revenue Operator can answer using your knowledge base without requiring clinician time. If the patient needs clinical judgment, the system routes them to the right person with all context pre-filled.
              </p>
              <p>
                After appointments are booked, Revenue Operator runs automated reminders: 48 hours before, 24 hours before, and 1 hour before. If a patient doesn&apos;t show, Revenue Operator can follow up: &quot;We missed you today. Would you like to reschedule?&quot; This simple prompt recovers 10–15% of no-shows.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Core workflows</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Patient identity verification (name, DOB, SSN)</li>
                  <li>New patient scheduling with calendar integration</li>
                  <li>Prescription refill intake and pharmacy routing</li>
                  <li>Lab result status checks and patient notification</li>
                  <li>No-show prevention and recovery workflows</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Compliance & security</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>HIPAA-compliant call handling and encryption</li>
                  <li>Protected patient data: no voicemails, secure handoff</li>
                  <li>Audit-ready call transcripts and activity logs</li>
                  <li>Upsell prevention (no aggressive selling)</li>
                  <li>Quiet hours and per-patient contact limits</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI (patient lifetime value is high)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Healthcare economics run on two tracks: patient satisfaction and operational efficiency. The average patient lifetime value is $10,000+. A single recovered patient who would have switched practices justifies the investment. But the real win is no-show reduction. If you recover 10–15 no-shows per month at $150–300 per slot, that&apos;s $1,500–4,500 in recovered monthly revenue.
              </p>
              <p>
                Beyond dollars, answering faster improves patient satisfaction, which drives retention and referral. Reducing no-shows improves provider schedules and job satisfaction. And automating prescription refills and routine questions frees your front desk and nurses to handle complex patient issues and relationship-building.
              </p>
              <p>
                The practical outcome: your practice doesn&apos;t lose patients to slow callbacks. You keep the schedule full. And your team spends time on work that requires human judgment, not fielding &quot;Can I get a refill?&quot; calls.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link href={ROUTES.START} className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                Get started →
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
              <Link href="/industries/dental" className="underline">dental</Link>{" "}
              or{" "}
              <Link href="/industries/legal" className="underline">legal</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
