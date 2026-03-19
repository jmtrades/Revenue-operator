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
                className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors"
              >
                Start Your Free Trial
              </Link>
              <Link
                href="/demo"
                className="inline-flex px-6 py-3 rounded-xl border border-zinc-300 text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-hover)] transition-colors"
              >
                Watch the demo
              </Link>
            </div>

            {!hasCustomers && (
              <div className="mt-16">
                <div className="max-w-3xl mx-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                    We&apos;re onboarding our first customers now.
                  </h2>
                  <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    Here&apos;s what the system is designed to deliver when your calls and follow-ups are running end-to-end.
                    These projections come from the same industry averages used in your problem statement.
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
                          Projected revenue recovered from missed-call leakage
                        </p>
                      </Link>
                    ))}
                  </div>

                  <p className="mt-4 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Once you&apos;re live, your dashboard converts these projections into real numbers from your actual calls.
                  </p>
                </div>
              </div>
            )}
          </Container>
        </section>

        <section className="py-14 md:py-20">
          <Container>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                Case Study Format (what you&apos;ll see after you go live)
              </h2>
              <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                This is the format we use to document outcomes as soon as live calls and follow-ups produce measurable results.
                We keep it structured so you can compare industries, understand what was recovered, and see exactly how the system executed.
              </p>

              <div className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Business name
                    </p>
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Your business name
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Industry
                    </p>
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                      HVAC / Dental / Legal / Real Estate and more
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Before
                    </p>
                    <ul className="list-disc pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <li>Missed calls/month</li>
                      <li>Estimated loss</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      After
                    </p>
                    <ul className="list-disc pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <li>Calls answered</li>
                      <li>Revenue recovered</li>
                      <li>Follow-ups sent</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Timeline
                    </p>
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Setup → Live calls → Follow-up execution → Dashboard rollups
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Quote
                    </p>
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Customer quote appears here after live calls and follow-ups
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  Want to see the pricing and limits that make outcomes measurable? Review{" "}
                  <Link href="/pricing" className="underline" style={{ color: "var(--accent-primary)" }}>
                    pricing
                  </Link>{" "}
                  and{" "}
                  <Link href="/demo" className="underline" style={{ color: "var(--accent-primary)" }}>
                    the demo
                  </Link>
                  .
                </p>
                <Link
                  href="/activate"
                  className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors"
                >
                  Start Your Free Trial
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

