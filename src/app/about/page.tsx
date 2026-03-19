import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "About — Recall Touch",
  description:
    "Meet Recall Touch and founder Junior Martin. Learn why we built AI revenue operations, how it works, and where we're headed next. Start your trial today.",
  alternates: { canonical: `${BASE}/about` },
  openGraph: {
    title: "About — Recall Touch",
    description:
      "Meet Recall Touch and founder Junior Martin. Learn why we built AI revenue operations, how it works, and where we're headed next. Start your trial today.",
    url: `${BASE}/about`,
    siteName: "Recall Touch",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About — Recall Touch",
    description:
      "Meet Recall Touch and founder Junior Martin. Learn why we built AI revenue operations, how it works, and where we're headed next. Start your trial today.",
    images: ["/opengraph-image"],
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <section className="py-16 md:py-24 border-b" style={{ borderColor: "var(--border-default)" }}>
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>About</p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Building AI revenue operations for every business</h1>
            <div className="mt-6 space-y-4 text-sm md:text-base leading-relaxed rounded-xl border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
              <p>
                I&apos;m Junior Martin, founder of Recall Touch. We built this company to solve a practical, expensive problem:
                revenue opportunities enter businesses every day, but teams are too overloaded to respond, follow up, and execute
                consistently.
              </p>
              <p>
                Recall Touch runs the full loop. AI handles inbound conversations, qualifies intent, books the next step, launches
                follow-up sequences, and keeps every action visible in one operating dashboard. Teams stay focused on high-value work
                while the platform keeps execution moving.
              </p>
              <p>
                The mission is simple: give every business enterprise-grade revenue operations without enterprise headcount. That means
                reliable workflows, clear attribution, and a product designed for outcomes, not activity metrics.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 md:py-20 border-b" style={{ borderColor: "var(--border-default)" }}>
        <Container>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-6">Founder</h2>
          <div className="rounded-xl border p-8 max-w-md" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p className="mt-1 font-semibold">Junior Martin</p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Founder, Recall Touch</p>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              We&apos;re focused on helping operators recover revenue with reliable automation, stronger follow-up execution, and clearer
              pipeline visibility across every channel.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-14 md:py-20">
        <Container>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4">Contact</h2>
          <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
            Questions about implementation, partnerships, or enterprise rollout? Reach us directly at{" "}
            <a href="mailto:support@recall-touch.com" className="underline">
              support@recall-touch.com
            </a>.
          </p>
          <p className="mt-6">
            <Link
              href="/activate"
              className="inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-100"
            >
              Start free trial
            </Link>
          </p>
        </Container>
      </section>
    </main>
  );
}
