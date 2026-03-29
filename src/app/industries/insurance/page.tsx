import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.revenueoperator.ai";

export const metadata = {
  title: "Insurance Agency AI Revenue Operations Platform — Revenue Operator",
  description:
    "Maximize quote conversion and policy retention with complete AI-powered workflows: instant quote intake, renewal automation, claims routing, cross-sell identification, and lifetime customer value optimization.",
  alternates: { canonical: `${BASE}/industries/insurance` },
};

export default function InsuranceIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Insurance", item: `${BASE}/industries/insurance` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Insurance Agency AI Revenue Operations Platform",
    url: `${BASE}/industries/insurance`,
    description: "Complete AI revenue operations for insurance: quote intake and routing, renewal automation and follow-up, claims triage and routing, cross-sell automation, and CRM integration with compliance controls.",
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
              Insurance Agencies
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Capture every quote. Automate renewals. Close more policies. 24/7 claims support.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Insurance agencies live and die by lead speed and policy retention. A prospect calls for a quote. If you answer immediately and provide a quote fast, they move forward with you. If they get voicemail or a slow callback, they've already called two competitors and picked one. Renewals are just as critical: a policy comes due, and if you don't follow up consistently, the customer renews with someone else or doesn't renew at all. Revenue Operator answers every call, captures quote requests, runs quote flows, automates renewal outreach, and routes claims—all while your agents focus on relationship-building and complex sales.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Why insurance agencies lose quotes and renewals</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  Quote requests are time-sensitive. A customer is shopping for car insurance, and they're calling 4–5 agencies simultaneously. The agency that delivers a quote first usually wins. If you're on the phone with another customer or in a meeting when they call, they've moved on. Your callback at 4 PM is too late—they signed with someone else at 2 PM.
                </p>
                <p>
                  The second leak is renewal decay. Your policy renews in 60 days. You send an email. Then a letter. Then you intend to call but you're busy with new sales. The customer hasn't heard from you, so they assume you don't care. They renew with another carrier or a competitor agent. Consistent, automated outreach closes that gap.
                </p>
                <p>
                  The third opportunity is cross-sell. A customer has auto and home. Do they have umbrella, life, or disability? Your team should ask, but in the chaos of daily calls, that message gets lost. Systematic follow-up identifies and closes those gaps.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator works for insurance agencies</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Revenue Operator answers quote requests 24/7. It asks what type of insurance (auto, home, life, commercial) and collects basic info: driver record, home value, business size, etc. It can provide a rough quote based on your rates or route the prospect to an agent for a detailed quote. Either way, the call is captured and prioritized.
              </p>
              <p>
                For renewals, you set up automated outreach triggered by policy expiration dates. Revenue Operator sends a message: "Hi [name], your [policy type] renews in 30 days. Let's review your coverage and make sure you have the best rate." If the customer responds with questions, Revenue Operator answers or routes to an agent. If they want to renew, it guides them through the process or schedules a call with you.
              </p>
              <p>
                For claims, Revenue Operator can triage: capture claim type, date, initial details, and route to the right adjuster or insurance company. This speeds up claims processing and improves customer satisfaction during a stressful moment.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Core workflows</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Quote request intake: line of business, coverage preferences</li>
                  <li>Instant quote generation or agent routing with lead capture</li>
                  <li>Renewal automation: 60-day, 30-day, 14-day outreach sequences</li>
                  <li>Claims intake and triage with adjuster routing</li>
                  <li>Cross-sell identification and follow-up automation</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">CRM & compliance</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>CRM integration: leads auto-sync to your system</li>
                  <li>TCPA compliance: opt-out handling, consent tracking</li>
                  <li>Do-not-call safeguards and quiet hour respect</li>
                  <li>Personalized communication using existing policy data</li>
                  <li>Lead scoring and priority routing for high-value prospects</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI (lifetime value is enormous)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Insurance economics are lifetime-value driven. An average policy is $1,200/year, and a customer stays 5+ years if you service them well. That's $6,000+ in lifetime revenue per policy. Capture one additional quote per week that converts (52 policies/year × $1,200 × 5 years = $312,000 lifetime value), and the system pays for itself in days.
              </p>
              <p>
                Even stronger: improve renewal rates by just 5%. If you're an agency with 500 policies, a 5% renewal lift is 25 policies retained per year. At $1,200 each, that's $30,000 in annual revenue protected. Add cross-sell—umbrella policies, life insurance, disability—and the leverage multiplies.
              </p>
              <p>
                The practical outcome: your agents spend time selling and servicing, not fielding routine calls and chasing renewals. Your quote-to-close velocity improves. Your renewals happen automatically. Your growth becomes predictable and scalable.
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
              <Link href="/industries/real-estate" className="underline">real estate</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
