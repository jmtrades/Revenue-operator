import Link from "next/link";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "Recruiting AI Revenue Operations Platform — Revenue Operator",
  description:
    "Maximize candidate pipeline velocity and placement conversion with complete AI-powered workflows: call answering, candidate screening, interview scheduling, no-show recovery, and pipeline follow-up automation.",
  alternates: { canonical: "https://www.recall-touch.com/industries/recruiting" },
};

export default function RecruitingIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Recruiting", item: `${BASE}/industries/recruiting` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Recruiting AI Revenue Operations Platform",
    url: `${BASE}/industries/recruiting`,
    description:
      "Complete AI revenue operations for recruiting: candidate call answering, structured screening and qualification, interview scheduling and confirmation, no-show recovery, post-interview follow-up, and pipeline reactivation.",
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
      <MarketingNavbar />
      <main className="pt-28 pb-20">
        <Container>
          <div className="max-w-3xl mx-auto">
            <p className="section-label mb-4" style={{ color: "var(--accent-primary)" }}>
              Recruiting & staffing
            </p>
            <h1
              className="font-bold mb-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
            >
              Candidate calls answered, interviews scheduled, pipeline never stalls
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Recruiting is a speed-and-clarity game. Candidates reach out when they&apos;re actively looking, and they&apos;re also speaking with other recruiters.
              If your team takes too long to respond — or if candidate calls are missed — the opportunity slips out of the pipeline.
              <br />
              <br />
              Revenue Operator is built to handle inbound candidate conversations end-to-end: it answers calls quickly, performs structured screening,
              gathers the details your hiring workflow needs, and schedules interviews into the right windows. It also runs follow-ups so
              candidate engagement doesn&apos;t drop between steps, and it recovers interview no-shows with a calm rescheduling sequence.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Where recruiting revenue leaks</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  <strong>Missed inbound calls from candidates.</strong> Candidates don&apos;t wait. A single unanswered call can cost a qualified applicant
                  and can force you to restart outreach weeks later.
                </p>
                <p>
                  <strong>Manual screening and scheduling friction.</strong> Without structured intake, your team has to ask the same questions repeatedly,
                  then re-enter details into scheduling tools. That wastes time and increases the chance of scheduling errors.
                </p>
                <p>
                  <strong>Interview no-shows.</strong> No-show isn&apos;t random — it&apos;s usually a communication gap (confusing timing, missed reminder, unclear reschedule path).
                  When no-shows happen, you lose the interview slot and you lose momentum.
                </p>
                <p>
                  <strong>Pipeline follow-up that doesn&apos;t compound.</strong> After an interview, candidates need a "what&apos;s next" touch.
                  If that touch is delayed or inconsistent, candidates compare experiences and choose whoever is most responsive.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator works for recruiting teams</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                <strong>Answer and screen with structure.</strong> The agent answers candidate calls and captures the details that matter for your workflow:
                role interest, location preferences, availability, and any essential experience signals you choose to collect. It keeps conversations efficient,
                so candidates get clarity and your recruiters get clean data.
              </p>
              <p>
                <strong>Schedule interviews quickly.</strong> When scheduling is enabled, Revenue Operator offers interview windows based on your calendar rules.
                It confirms key details with candidates and then triggers the right reminders so candidates show up.
              </p>
              <p>
                <strong>Handle rescheduling and recovery.</strong> If a candidate misses an interview, the system runs an interview no-show recovery sequence:
                it explains the missed timing, offers reschedule options, and provides an easy path to pick a new slot. When you want human involvement,
                the agent hands off with a transcript summary and the exact status needed to act.
              </p>
              <p>
                <strong>Follow up to keep the pipeline moving.</strong> After interviews (or after a candidate chooses not to continue right away), Revenue Operator can follow up with
                next-step messaging and appointment confirmation prompts. That keeps the pipeline warm and reduces "lost after interview" churn.
              </p>
              <p>
                <strong>Visibility for decision-makers.</strong> Your dashboard reflects what happened: calls answered, screening completion, interviews scheduled,
                no-shows recovered, and follow-up sequences executed. You can connect pipeline progress to outcomes and tune what your candidates actually respond to.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Included workflows (examples for recruiting)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Candidate screening calls (structured intake + qualification)</li>
                  <li>Interview scheduling with confirmation and reminders</li>
                  <li>Interview no-show recovery with rebook sequence + call follow-up</li>
                  <li>Post-interview follow-up to reduce drop-off</li>
                  <li>Pipeline reactivation for warm leads who go quiet</li>
                  <li>Escalation to recruiters when judgment is required</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Guardrails (so recruiting stays compliant)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Quiet hours and business-hours enforcement</li>
                  <li>Per-contact limits to prevent repetitive outreach</li>
                  <li>Opt-out handling and reviewable actions</li>
                  <li>Transcripts and activity history for auditability</li>
                  <li>Safe escalation paths to humans</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI math for recruiting (speed + interview recovery)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.85 }}>
              <p>
                Recruiting ROI is often easiest to model as a reduction in "lost opportunities" plus fewer wasted interview slots.
                Assume your average placed candidate produces <strong>$3,500</strong> in expected margin across your funnel (fees, margins, and typical compensation structure).
                If you currently miss even <strong>15</strong> inbound candidate calls per month and your pipeline conversion from "first touch" is <strong>8%</strong>,
                that&apos;s <strong>1.2</strong> fewer placements per month at the margin level — <strong>$4,200</strong> in expected impact.
              </p>
              <p>
                Now add interview no-shows. If you schedule <strong>60</strong> interviews per month and <strong>10%</strong> no-show, you lose <strong>6</strong> interview slots.
                If your recovery workflow recaptures <strong>3</strong> of those with faster outreach and clear rescheduling, you effectively turn wasted capacity back into pipeline progress.
                Even if only a portion of recovered interviews converts, the calendar efficiency gains can cover the cost quickly.
              </p>
              <p>
                Revenue Operator improves both sides: it answers consistently so candidates keep moving, and it runs automated recovery so scheduling problems don&apos;t cascade.
                With structured screening and follow-up, recruiters spend more time interviewing and less time chasing or fixing details.
              </p>
              <p>
                Finally, the dashboard connects outcomes to pipeline movement. That means you can tune what the agent asks, how fast it responds,
                and which scheduling windows candidates actually choose — using measurable results, not gut feel.
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
              Prefer another vertical? See{" "}
              <Link href="/industries/med-spa" className="underline">med spa</Link> or{" "}
              <Link href="/industries/roofing" className="underline">roofing</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

