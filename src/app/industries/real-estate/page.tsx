import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.revenueoperator.ai";

export const metadata = {
  title: "Real Estate AI Revenue Operations Platform — Revenue Operator",
  description:
    "Capture every lead, qualify faster, and close more deals with complete AI-powered workflows: instant call answering, lead qualification, showing scheduling, follow-up automation, and conversion tracking.",
  alternates: { canonical: `${BASE}/industries/real-estate` },
};

export default function RealEstateIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Real Estate", item: `${BASE}/industries/real-estate` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Real Estate AI Revenue Operations Platform",
    url: `${BASE}/industries/real-estate`,
    description: "Complete AI revenue operations for real estate: lead capture and qualification, instant showing scheduling, post-showing follow-up, lead scoring, transaction tracking, and CRM integration.",
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
              Real Estate
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Capture every lead call. Qualify instantly. Schedule faster than competition.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Real estate is won by speed and attention. A buyer sees your listing on Zillow and calls right away—but your phone rings five times before they reach you. They hang up and call the next listing. Even worse, they reach you, you're busy, and the showing gets scheduled for three days later. By then, the buyer has already toured competitor properties and decided they like them better. Revenue Operator answers immediately, qualifies the buyer, offers your calendar slots, and books the showing in real-time—while your competition is still calling back.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Why real estate lead flow breaks</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  Real estate buyers and sellers don't wait. Someone calls your listing, and if you don't answer or the callback is delayed, they've moved on. An agent closes deals when they're first to respond and fastest to schedule. Missing that first call or delaying the showing by hours costs you—not just that sale, but the opportunity to build a relationship and earn referrals.
                </p>
                <p>
                  The second failure is lack of qualification. A caller might be a serious buyer, a tire-kicker, or a competitor's agent fishing for market intel. Without quick screening, you waste time showing properties to unqualified prospects. Revenue Operator clarifies intent immediately: "Are you looking to buy, sell, or just curious about the area?"
                </p>
                <p>
                  The third leak is showing coordination chaos. You're managing your own calendar, your team's calendars, and trying to match buyer availability with property access. Missed time slots, double-bookings, and "I forgot I had a conflict" kill productivity. Automation makes scheduling seamless.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator works for real estate</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Revenue Operator answers calls to your listing or office number 24/7. It greets the caller, asks if they're looking to buy, sell, or learn more, and captures their name and preferred times to view. If you're the agent available, Revenue Operator offers your calendar slots. If you're busy, it can offer team members or suggest multiple options.
              </p>
              <p>
                Once a showing is booked, Revenue Operator sends the buyer a confirmation text with the address, time, and parking instructions. It reminds them 24 hours before and again 1 hour before. If they don't show up, it offers to reschedule immediately.
              </p>
              <p>
                For listings with high inquiry volume, Revenue Operator can automate follow-up: "The showing is scheduled for 3 PM Thursday. Do you have any questions about the property?" It can answer pre-written FAQs (square footage, HOA fees, school district) or route complex questions to you.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Core workflows</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Instant lead qualification: buy/sell/inquiry intent capture</li>
                  <li>Real-time showing scheduler with multi-agent availability</li>
                  <li>Buyer pre-qualification: budget, timeline, moving reason</li>
                  <li>Listing inquiry routing and FAQ automation</li>
                  <li>No-show prevention: confirmations, reminders, easy rescheduling</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Follow-up & intelligence</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Post-showing follow-up: "Interested? Next steps?"</li>
                  <li>Lead scoring: how serious is this buyer?</li>
                  <li>CRM integration to route qualified leads to right agent</li>
                  <li>Opt-out handling and compliance (TCPA, CAN-SPAM)</li>
                  <li>Transaction tracking: calls → showings → offers</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI (speed and volume multiply fast)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Real estate economics are high-leverage. One recovered lead that converts to a buyer or seller relationship = $6,000+ in commission. In a typical brokerage, 20–30% of inbound calls are lost to voicemail, delayed callbacks, or poor qualification. Recover even 1–2 leads per month that would otherwise be missed, and the system pays for itself.
              </p>
              <p>
                Beyond pure revenue, Revenue Operator reduces your manual calendar management. You're not juggling five texts, two emails, and a phone call to schedule one showing. The system does it. That time goes back to your actual business: building relationships and closing deals.
              </p>
              <p>
                And because every showing is confirmed and reminded, your no-show rate drops, your listing days-on-market tightens, and your client satisfaction improves—all of which drive referral and repeat business.
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
              <Link href="/industries/insurance" className="underline">insurance</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
