import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Voice Cloning Terms — Recall Touch",
  description:
    "Terms for voice cloning consent and usage, including authorization, legal compliance, and customer responsibilities.",
  alternates: { canonical: `${BASE}/terms/voice-cloning` },
  openGraph: {
    title: "Voice Cloning Terms — Recall Touch",
    description:
      "Terms for voice cloning consent and usage, including authorization, legal compliance, and customer responsibilities.",
    url: `${BASE}/terms/voice-cloning`,
    siteName: "Recall Touch",
    type: "article",
  },
};

export default function VoiceCloningTermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-20">
        <Container>
          <article className="max-w-[760px] mx-auto">
            <h1 className="font-bold text-3xl mb-3" style={{ letterSpacing: "-0.02em" }}>
              Voice Cloning Terms
            </h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>
              Effective date: March 19, 2026
            </p>

            <section className="mb-8">
              <h2 className="font-semibold text-xl mb-3">Authorization and Ownership</h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                You may only upload and clone a voice when the voice is your own or you hold written authorization
                from the voice owner. You are responsible for retaining records of authorization and providing those
                records upon request for compliance review.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-semibold text-xl mb-3">Permitted Use</h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Cloned voices may only be used for lawful business communication through Recall Touch, and must comply
                with applicable telephony, privacy, and biometric or voice-likeness regulations in your jurisdiction.
                Misleading impersonation, fraud, harassment, and unauthorized identity simulation are prohibited.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-semibold text-xl mb-3">Consent Records and Audit</h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Recall Touch stores consent records including consent text version, timestamp, and request metadata.
                You acknowledge these records may be used to investigate policy breaches, legal claims, or abuse.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-semibold text-xl mb-3">Enforcement</h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                We may suspend or remove cloned voices, disable related features, or terminate access if we reasonably
                suspect unauthorized use, legal non-compliance, or policy violations.
              </p>
            </section>

            <p className="text-sm mt-12" style={{ color: "var(--text-tertiary)" }}>
              <Link href="/terms" className="underline hover:opacity-90">
                ← Back to Terms of Service
              </Link>
            </p>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

