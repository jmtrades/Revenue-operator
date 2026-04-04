import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "Construction AI Revenue Operations Platform — Revenue Operator",
  description:
    "Drive project pipeline and operational efficiency with complete AI-powered workflows: bid capture and qualification, subcontractor coordination, job-site management, bid appointment scheduling, and project tracking.",
  alternates: { canonical: `${BASE}/industries/construction` },
};

export default function ConstructionIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Construction", item: `${BASE}/industries/construction` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Construction AI Revenue Operations Platform",
    url: `${BASE}/industries/construction`,
    description: "Complete AI revenue operations for construction: bid request intake and qualification, subcontractor notification and coordination, bid scheduling, job-site communication, and opportunity tracking.",
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
              Construction & General Contracting
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Capture every bid request. Coordinate subs instantly. Win more projects.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              A general contractor&apos;s phone is a profit center. A property manager calls to get a bid on a commercial roof replacement. A homeowner calls about a kitchen remodel. You&apos;re on-site managing three crews and can&apos;t answer. The call goes to voicemail. The prospect calls another GC and gets a bid within 30 minutes. You call back three hours later and you&apos;ve already lost the job. That $50,000+ project is gone. Revenue Operator answers every bid request 24/7, captures the scope, qualifies the opportunity, and routes it to your office or project manager—so you never miss an opportunity, even when you&apos;re in the field.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Why construction bid capture fails</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  Construction bids are high-value and time-sensitive. A property owner or project manager needs a bid to move forward. They call 3–4 contractors in parallel. The first contractor to deliver a professional bid usually gets the job. If your GC is in the field managing crews, the call goes to an answering service or voicemail. By the time you call back, the prospect has already received bids from competitors and decided.
                </p>
                <p>
                  The second problem is subcontractor coordination. You get a call about a large project that needs electrical, HVAC, and plumbing subs. You need to check with each sub, confirm availability, and coordinate. That back-and-forth takes hours or days. In the meantime, the prospect is calling other GCs. Slow coordination kills deals.
                </p>
                <p>
                  The third leak is job-site communication. Your crews are working, and subcontractors need directions, material info, or clarification. Phone chains and text chains get chaotic. Information gets lost or delayed, which causes rework and delays.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator works for construction</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Revenue Operator answers bid requests 24/7. It greets the caller, asks about the project scope (commercial roof, kitchen remodel, tenant buildout, etc.), captures the timeline and location, and qualifies budget range. It then routes the opportunity to your office or project manager with a structured summary: location, project type, scope, and contact info. All priority, no guessing.
              </p>
              <p>
                For subcontractor routing, you can set up workflows: &quot;If the scope includes plumbing, alert the plumbing sub.&quot; Revenue Operator can even attempt to schedule a walk-through or bid appointment directly. This accelerates bid turnaround.
              </p>
              <p>
                For job-site communication, Revenue Operator can handle site-specific coordination calls. &quot;We need additional lumber for the framing.&quot; &quot;When&apos;s the HVAC crew arriving?&quot; Revenue Operator answers using your project info and routes critical questions to the right person, keeping your crews focused on work.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Core workflows</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Bid request intake: project type, scope, timeline, location</li>
                  <li>Budget qualification and opportunity scoring</li>
                  <li>Automatic sub notification and availability check</li>
                  <li>Bid appointment scheduling with calendar integration</li>
                  <li>Job-site call routing and coordination support</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Project management</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Multi-project visibility: calls, routing, follow-up status</li>
                  <li>Subcontractor coordination and notification</li>
                  <li>Site-specific call handling and material requests</li>
                  <li>Timeline tracking and deadline reminders</li>
                  <li>Lead scoring: hot prospects vs. tire-kickers</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI (high-value projects change the math instantly)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Construction project values are substantial. An average commercial project is $50,000+; residential remodels range $30,000–100,000. Gross margins in construction run 10–20%, so a $50,000 project nets $5,000–10,000 in gross profit. Capture just one additional project per month that you would have otherwise lost, and the system pays for itself many times over.
              </p>
              <p>
                Beyond raw deal recovery, faster bid turnaround improves win rate. If you deliver a bid in 4 hours instead of 24, you win more. Smoother subcontractor coordination reduces delays and rework, which improves project profitability. Job-site efficiency means crews focus on building instead of chasing information.
              </p>
              <p>
                The practical outcome: your GC can stay in the field managing production. Your office doesn&apos;t miss opportunities. Your subs are coordinated and responsive. Your projects run on schedule. That&apos;s growth and profitability.
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
              <Link href="/industries/plumbing-hvac" className="underline">plumbing & HVAC</Link>{" "}
              or{" "}
              <Link href="/industries/auto-repair" className="underline">auto repair</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
