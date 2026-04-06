import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Trust Center",
  description:
    "Security, data handling, and compliance posture for Revenue Operator. What we implement today versus what your organization must configure.",
  robots: { index: true, follow: true },
};

export default function TrustCenterPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <MarketingNavbar />
      <main className="pt-28 pb-24">
        <Container>
          <article className="max-w-[720px] mx-auto">
            <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>
              Trust Center
            </h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>
              Last updated: April 5, 2026 · For questions contact{" "}
              <a href="mailto:privacy@recall-touch.com" className="underline" style={{ color: "var(--accent-primary)" }}>
                privacy@recall-touch.com
              </a>
            </p>

            <p className="text-base mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              This page describes how we design the product for security and privacy. It is not legal advice and does not
              by itself constitute certification (for example SOC 2 Type II or HIPAA). Your obligations depend on your use
              case, contracts, and jurisdiction.
            </p>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>
                Encryption and transport
              </h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Browser and API traffic uses TLS in transit. Cloud providers and databases used by the platform support
                encryption at rest; exact configuration depends on deployment and provider settings. Customers should
                review their data residency and subprocessors with us during procurement.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>
                Sessions and tenant isolation
              </h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Authentication uses industry-standard session mechanisms (including HTTP-only cookies where applicable).
                Workspace data is scoped by workspace identifiers on the server; APIs enforce access checks per request.
                You should use strong passwords, SSO where available, and least-privilege team roles.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>
                Audit logs and retention
              </h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Product features may record operational events (for example configuration changes or exports) where
                implemented. Retention periods and who may view logs are governed by your plan, workspace settings, and
                our Privacy Policy. We do not claim a specific legal &quot;chain of custody&quot; unless contractually
                agreed in writing.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>
                Call recording and consent
              </h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Recording and transcription are subject to applicable laws (including two-party consent jurisdictions).
                You are responsible for notices, consent flows, and retention policies for your callers. The product may
                expose settings for recording and transcripts; enabling them does not remove your compliance obligations.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>
                GDPR / UK GDPR and health data
              </h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Where we process personal data on your behalf, a Data Processing Agreement may be required. HIPAA-aligned
                hosting or a BAA is not implied by marketing copy; enterprise customers should obtain explicit contractual
                commitments before processing PHI.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>
                Related documents
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-base" style={{ color: "var(--text-secondary)" }}>
                <li>
                  <Link href="/privacy" className="underline" style={{ color: "var(--accent-primary)" }}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="underline" style={{ color: "var(--accent-primary)" }}>
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="underline" style={{ color: "var(--accent-primary)" }}>
                    Security overview
                  </Link>
                </li>
              </ul>
            </section>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
