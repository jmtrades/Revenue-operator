import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Security",
  description: "Enterprise-grade security for your business communications: encryption, access control, rate limiting, and compliance.",
  alternates: { canonical: `${BASE}/security` },
  openGraph: {
    title: "Security — Revenue Operator",
    description: "Enterprise-grade security for your business communications: encryption, access control, rate limiting, and compliance.",
    url: `${BASE}/security`,
    siteName: "Revenue Operator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security — Revenue Operator",
    description: "Enterprise-grade security for your business communications: encryption, access control, rate limiting, and compliance.",
  },
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
              { "@type": "ListItem", position: 2, name: "Security", item: `${BASE}/security` },
            ],
          }),
        }}
      />
      <MarketingNavbar />
      <main id="main">
        <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <SectionLabel>Security & Compliance</SectionLabel>
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">
                Enterprise-Grade Security for Your Business Communications
              </h1>
              <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Revenue Operator is built for revenue-critical conversations. We protect sessions and data with encryption, isolate tenants with workspace-level controls, enforce rate limits, and design outbound compliance into the workflow. For a consolidated view of what we implement versus what your organization configures, read the{" "}
                <Link href="/trust" className="underline underline-offset-2 font-medium" style={{ color: "var(--text-primary)" }}>
                  Trust Center
                </Link>
                .
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Questions about security? Contact us.
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14 md:py-20">
          <Container>
            <div className="max-w-4xl mx-auto space-y-10">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Data Encryption
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  We use HMAC-SHA256 to protect auth sessions, and we require HTTPS across the platform. Sensitive session artifacts are guarded so they can&apos;t be forged client-side, keeping access scoped to the correct workspace.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Access Control
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  We enforce row-level security policies to guarantee workspace isolation. Your data is segmented by workspace, so queries and actions are constrained by tenant rules rather than trusting client input.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Rate Limiting
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Outbound operations and sensitive endpoints are protected with distributed rate limiting. This prevents burst abuse, supports predictable costs, and improves reliability during peak call volume.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Call Recording
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  When recordings are enabled, audio and transcripts are stored in encrypted form with access-controlled reads. Recording access follows the same workspace isolation principles as all other data.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Compliance
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  We support TCPA-aligned outbound controls through configurable consent states and operational guardrails. The platform enforces per-contact suppression rules, business-hours constraints, and DNC registry checks so your AI work respects your compliance posture.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Monitoring
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  We use enterprise-grade error tracking and analytics monitoring. This gives you visibility into reliability, performance, and conversion outcomes while keeping sensitive operational details out of client responses.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Data Handling
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  After cancellation, data is retained for a defined period, with clear operational handling and the ability to export contacts when you need to move providers. If you need additional assurances, contact us and we&apos;ll provide details.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-6">
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  Need a security review?
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Send your questions and we&apos;ll walk through encryption, isolation, retention, and compliance controls tailored to your deployment.
                </p>
                <div className="mt-4">
                  <Link
                    href="/contact"
                    className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    Contact security →
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

