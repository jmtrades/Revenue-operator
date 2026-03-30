import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Blog — Revenue Operator",
  description:
    "Insights on AI phone agents, revenue operations, call handling, and growth strategies for service businesses.",
  openGraph: {
    title: "Blog — Revenue Operator",
    description:
      "Guides, playbooks, and insights on AI phone agents, revenue recovery, and growth for service businesses.",
    url: "https://www.recall-touch.com/blog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Revenue Operator",
    description:
      "Guides and insights on AI phone agents and revenue recovery.",
  },
};

const RESOURCE_TOPICS = [
  { title: "AI Revenue Operators", description: "How autonomous operators handle inbound calls, qualify intent, and book appointments without a human on staff." },
  { title: "Call Handling & Recovery", description: "Turn every call into an opportunity. Automate callbacks, follow-ups, and lead recovery at scale." },
  { title: "Speed-to-Lead & Follow-up", description: "Respond to inbound leads in seconds, not hours. Automated sequences that move prospects to appointments." },
  { title: "Revenue Operations Automation", description: "End-to-end workflows that handle qualifying, booking, follow-up, and recovery so your team focuses on closing." },
  { title: "Industry-Specific Guides", description: "Deep dives into HVAC, Dental, Legal, and Real Estate workflows optimized for missed-call recovery." },
  { title: "Measurement & ROI", description: "Track what matters: calls answered, appointments booked, revenue recovered, and attribution by source." },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="max-w-3xl mb-16">
            <p className="section-label mb-2">Resources</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>Learn how to capture every call and convert it to revenue</h1>
            <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>Guides, playbooks, and industry insights on AI phone agents, automating follow-up, and measuring the revenue impact. Join our mailing list to get new content as it publishes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {RESOURCE_TOPICS.map((topic) => (
              <div key={topic.title} className="rounded-xl border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{topic.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{topic.description}</p>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto rounded-2xl border p-8" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <h2 className="font-semibold text-2xl mb-3" style={{ color: "var(--text-primary)" }}>Get the latest guides and playbooks</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>We send new articles, case studies, and industry playbooks directly to your inbox — no more than 2x per week.</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-lg border text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
              />
              <button className="px-6 py-3 rounded-lg font-semibold whitespace-nowrap" style={{ background: "var(--accent-primary)", color: "white" }}>
                Subscribe
              </button>
            </div>
          </div>

          <div className="mt-16 pt-12 border-t text-center" style={{ borderColor: "var(--border-default)" }}>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Ready to see how Revenue Operator handles your calls?</p>
            <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-block">Get started — 5 minutes →</Link>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
