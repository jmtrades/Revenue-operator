import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Recall Touch terms of service. Acceptance, service description, and legal terms.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <article className="max-w-[720px] mx-auto">
            <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>Terms of Service</h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>Effective date: January 1, 2026</p>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Acceptance</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                By accessing or using Recall Touch, you agree to these Terms of Service. If you are using the service on behalf of an organization, you represent that you have authority to bind that organization.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Description of Service</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Recall Touch provides commercial execution infrastructure: call governance, compliance-grade recording and records, automated follow-ups, and multi-channel messaging under a single compliance framework. We reserve the right to modify or discontinue features with reasonable notice.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>User Responsibilities</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                You are responsible for your account, for ensuring that your use complies with applicable laws, and for the content and data you process through our service. You must not use the service for illegal purposes or to violate the rights of others.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Payment Terms</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Paid plans are billed in advance. Fees are non-refundable except as required by law or as stated in your plan. We may change pricing with notice; continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Limitation of Liability</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                To the maximum extent permitted by law, Recall Touch and its affiliates shall not be liable for indirect, incidental, special, or consequential damages, or for loss of data or profits. Our total liability shall not exceed the fees you paid in the twelve months preceding the claim.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Governing Law</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                These terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Disputes shall be resolved in the courts of that jurisdiction.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Contact</h2>
              <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                For questions about these terms:{" "}
                <a href="mailto:legal@recall-touch.com" className="underline" style={{ color: "var(--accent-primary)" }}>legal@recall-touch.com</a>.
              </p>
            </section>

            <p className="text-sm mt-12" style={{ color: "var(--text-tertiary)" }}>
              <Link href="/" className="underline hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>← Back to home</Link>
            </p>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
