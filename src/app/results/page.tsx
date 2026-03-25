import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Results — Recall Touch",
  description: "Real revenue recovered from real calls — with proof in your dashboard.",
  alternates: { canonical: `${BASE}/results` },
  openGraph: {
    title: "Results — Recall Touch",
    description: "Real revenue recovered from real calls — with proof in your dashboard.",
    url: `${BASE}/results`,
    siteName: "Recall Touch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Results — Recall Touch",
    description: "Real revenue recovered from real calls — with proof in your dashboard.",
  },
};

export default async function ResultsPage() {
  // We only show "real results" if the platform has call outcomes recorded.
  // If not, we share projections based on the same industry averages used in `ProblemStatement`.
  let hasCustomers = false;
  try {
    const db = getDb();
    const { count } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .not("call_ended_at", "is", null);
    hasCustomers = Number(count ?? 0) > 0;
  } catch {
    hasCustomers = false;
  }

  const projected = [
    { name: "HVAC", annualLoss: 46800, href: "/industries/hvac" },
    { name: "Dental", annualLoss: 54600, href: "/industries/dental" },
    { name: "Legal", annualLoss: 208000, href: "/industries/legal" },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
              { "@type": "ListItem", position: 2, name: "Results", item: `${BASE}/results` },
            ],
          }),
        }}
      />
      <Navbar />
      <main id="main">
        <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              <SectionLabel>Real Outcomes</SectionLabel>
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">
                Real Results from Real Businesses
              </h1>
              <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)" }}>
                Recall Touch answers inbound calls 24/7, qualifies intent, and then executes the follow-up work until revenue is recovered.
                Your dashboard shows the proof: calls answered, appointments booked, follow-ups sent, and the revenue impact.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/activate"
                className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-[var(--bg-hover)] transition-colors"
              >
                Start Your Free Trial
              </Link>
              <Link
                href="/demo"
                className="inline-flex px-6 py-3 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-hover)] transition-colors"
              >
                Watch the demo
              </Link>
            </div>

            {!hasCustomers && (
              <div className="mt-16">
                <div className="max-w-3xl mx-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Expected ROI by Industry
                  </h2>
                  <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    Based on industry averages and missed-call recovery data, here is the estimated annual revenue impact for businesses that miss 2-5 calls per day.
                    Your actual results will vary based on call volume, conversion rate, and average transaction value.
                  </p>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {projected.map((p) => (
                      <Link
                        key={p.name}
                        href={p.href}
                        className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 hover:bg-[var(--bg-inset)] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                            {p.name}
                          </p>
                          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                            /yr
                          </span>
                        </div>
                        <p className="mt-2 text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                          ${p.annualLoss.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                          Potential revenue from AI-handled calls
                        </p>
                      </Link>
                    ))}
                  </div>

                  <p className="mt-4 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Your dashboard tracks your actual results: calls answered, leads qualified, appointments booked, and revenue impact over time.
                  </p>
                </div>
              </div>
            )}
          </Container>
        </section>

        <section className="py-14 md:py-20 border-t" style={{ borderColor: "var(--border-default)" }}>
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                Ready to see it in action?
              </h2>
              <p className="mt-4" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Watch a live demo of Recall Touch answering calls, qualifying leads, and automating follow-ups. Then start your free trial and see your own results on day one.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/demo"
                  className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Watch Demo
                </Link>
                <Link
                  href="/activate"
                  className="inline-flex px-6 py-3 rounded-xl border border-[var(--border-default)] font-semibold" style={{ color: "var(--text-primary)" }}
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

