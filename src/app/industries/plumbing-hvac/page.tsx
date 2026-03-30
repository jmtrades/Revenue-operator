import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "Plumbing & HVAC AI Revenue Operations Platform — Revenue Operator",
  description:
    "Maximize emergency revenue and operational efficiency with complete AI-powered workflows: 24/7 call answering, emergency dispatch, seasonal campaign automation, appointment scheduling, no-show prevention, and job tracking.",
  alternates: { canonical: `${BASE}/industries/plumbing-hvac` },
};

export default function PlumbingHvacIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Plumbing & HVAC", item: `${BASE}/industries/plumbing-hvac` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Plumbing & HVAC AI Revenue Operations Platform",
    url: `${BASE}/industries/plumbing-hvac`,
    description: "Complete AI revenue operations for plumbing and HVAC: 24/7 emergency call answering, urgency assessment and dispatch, booking and scheduling, seasonal campaign automation, no-show prevention, and performance tracking.",
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
              Plumbing & HVAC
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Answer 24/7 emergency calls. Dispatch faster. Dominate seasonal spikes.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Emergency plumbing and HVAC calls don't wait. A customer with a burst pipe or a dead AC doesn't care if it's midnight or lunch—they need help now. Your dispatch team is stretched. Calls come in during peak hours, nights, and weekends. Miss one, and the customer calls your competitor. Revenue Operator answers every call 24/7, captures location and urgency, books emergency slots, and keeps your dispatch running smoothly—even when you're slammed.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Why emergency service revenue leaks</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  In plumbing and HVAC, lost calls are lost jobs. A furnace dies at 9 PM. The homeowner calls your number. If they hit voicemail or a busy signal, they Google "emergency heating near me" and call someone who answers. You just lost a $450+ HVAC call. The same happens with plumbing emergencies—a single missed after-hours call could be $350–500+ in revenue plus a one-star review.
                </p>
                <p>
                  The second leak is dispatcher overload during peak season. Summer AC calls. Winter heating emergencies. Spring flooding. Your team is taking calls, managing schedules, and fielding questions all at once. Calls get dropped or delayed. Customers wait longer. Satisfaction drops.
                </p>
                <p>
                  The third leak is seasonal volatility. You staff for average. Then a cold snap hits and you're triple-booked. Or summer is slow and you're overstaffed. Your revenue swings because demand-capture isn't smooth.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator works for plumbing & HVAC</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Revenue Operator answers every inbound call, whether it's 2 AM or 2 PM. It greets the customer, asks for location and urgency, and captures what's wrong (heating, cooling, plumbing, electrical). It checks your technician availability in real-time and either books the emergency slot directly or queues the job for dispatch review.
              </p>
              <p>
                For after-hours calls, Revenue Operator can confirm a callback window or immediately notify your on-call dispatcher via SMS/alert. For seasonal campaigns, you can set up automated outreach: spring AC tune-ups, winter heating checks, or post-emergency follow-up.
              </p>
              <p>
                Every call and booking is logged. You see no-shows, callback patterns, peak hours, and which techs are getting booked. That visibility lets you staff smarter and upsell smarter.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Core workflows</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>24/7 emergency dispatch: location, urgency, symptoms captured</li>
                  <li>Real-time availability check and same-day booking</li>
                  <li>After-hours callback scheduling + dispatcher alerts</li>
                  <li>Seasonal campaign automation (AC checks, heating preps, spring drains)</li>
                  <li>No-show prevention and emergency rebook workflows</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Dispatch & compliance</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Escalation rules for urgent emergencies (flooding, gas issues)</li>
                  <li>Integration with dispatch systems (route optimization optional)</li>
                  <li>Per-call limits + quiet hours for follow-up</li>
                  <li>Transcript capture for quality assurance and training</li>
                  <li>Performance tracking: calls answered, jobs booked, revenue recovered</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI (why this is fast and measurable)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                The math is direct: capture one additional $450 HVAC call or $350 plumbing emergency per month and the system pays for itself. Most teams see recovery of 2–5 calls per month that would otherwise have gone to voicemail. In peak season, that's 2–5 jobs × $400+ = $800–2,000 in recovered monthly revenue.
              </p>
              <p>
                Beyond emergency captures, seasonal automation reduces labor: your marketing team sends one campaign brief; Revenue Operator runs the follow-up calls, texts, and scheduling. Spring tune-ups and winter preventive calls drive steady, predictable revenue.
              </p>
              <p>
                The operational win is smoothing demand-capture across your dispatch team. Less dropped calls means fewer frustrated customers and fewer one-star reviews that cost you.
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
