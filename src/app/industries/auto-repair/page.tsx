import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: "AI Revenue Operations for Auto Repair — Recall Touch",
  description:
    "Capture estimate calls during rush hours, automate callback scheduling, and dominate seasonal spikes with 24/7 appointment booking.",
  alternates: { canonical: `${BASE}/industries/auto-repair` },
};

export default function AutoRepairIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Auto Repair", item: `${BASE}/industries/auto-repair` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Auto Repair AI Revenue Operations",
    url: `${BASE}/industries/auto-repair`,
    description: "AI phone system for auto repair shops: answers calls, schedules estimates and repairs, and captures seasonal demand spikes.",
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
              Auto Repair & Service
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Capture estimate calls instantly. Dominate tire season. Book before competition.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Auto repair is a call-driven business, and customers shop around. A driver needs tires, brakes, or an oil change. They call three shops in a row. The first shop that answers and books them wins the job. The second and third shops never get a callback chance. During tire season, summer prep, or winter changeovers, your phone explodes. If your team can't keep up, callers hang up and call competitors. Recall Touch answers every call instantly, qualifies the job type, checks your availability, and books the appointment before customers can dial another shop.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Why auto repair shops lose calls during peak demand</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  Auto repair is hyper-seasonal. Summer brake specials. Winter tire changeovers. Spring alignments. When the season hits, you go from steady to flooded in days. Calls come in while the tech is under a car. The office manager is running parts. Your single phone line is busy. Callers get a busy signal or hit voicemail and immediately call the shop down the street.
                </p>
                <p>
                  The second problem is callback friction. A customer calls Wednesday morning. You call back Wednesday afternoon. But now they've already scheduled with someone else. If your callback isn't within 30 minutes, you've lost the job. Most shops can't respond that fast during peak season.
                </p>
                <p>
                  The third leak is estimate follow-up. You give a customer an estimate for $500 in work. They go home, think about it, shop other shops, and the estimate goes cold. Without systematic follow-up, that work never converts.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Recall Touch works for auto repair</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Recall Touch answers every incoming call. It greets the customer, asks what type of service they need (tires, brakes, oil change, diagnostics, etc.), and gathers basic info: year/make/model and preferred appointment time. If you're online and have availability, Recall Touch offers slots and books immediately. If you're booked out, it captures a callback request with the highest priority.
              </p>
              <p>
                For estimate follow-up, you can trigger automated outreach: "Hi, this is [shop name]. Just checking in on the $X estimate we quoted. Any questions or ready to move forward?" Recall Touch can answer follow-up questions from your knowledge base or route complex questions to you.
              </p>
              <p>
                During seasonal spikes, you can use Recall Touch to qualify and book customers faster than competitors, capturing demand that would otherwise walk away. Every call answered is a potential $300–800 job.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Core workflows</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>24/7 service intake: tire, brake, oil change, diagnostic capture</li>
                  <li>Real-time availability check and instant booking</li>
                  <li>Vehicle info collection (year, make, model, mileage)</li>
                  <li>Estimate follow-up automation with conversion tracking</li>
                  <li>Seasonal campaign scheduling (tire season, winter preps, spring specials)</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Shop management</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Appointment scheduling with tech availability + bays</li>
                  <li>Parts availability checking (optional integration)</li>
                  <li>No-show prevention: confirmations and reminders</li>
                  <li>Upsell recommendations based on vehicle age and service history</li>
                  <li>Revenue tracking: calls → bookings → completed work</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI (captured demand is immediate revenue)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Auto repair margins are healthy: an average service call is $300–800, with some jobs running $1,000+. Capture just 2–3 additional calls per day during peak season, and you're looking at $600–2,400 in incremental daily revenue. That's $3,000–12,000 per week during tire season or summer prep season.
              </p>
              <p>
                Beyond peak season, steady answering every call means higher baseline volume. Customers remember shops that answer fast. They refer. They come back. The lifetime value of a responsive auto shop is high.
              </p>
              <p>
                The operational win is smoothing your workload. Instead of feast-or-famine hiring during seasonal spikes, you capture more demand during slow periods through automated follow-up and campaigns. That keeps your team and bays busy year-round.
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
              <Link href="/industries/plumbing-hvac" className="underline">plumbing & HVAC</Link>{" "}
              or{" "}
              <Link href="/industries/construction" className="underline">construction</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
