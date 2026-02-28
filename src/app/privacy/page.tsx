import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Recall Touch privacy policy.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <article className="max-w-[720px] mx-auto">
            <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>Privacy Policy</h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>Effective date: January 1, 2026</p>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Information We Collect</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We collect information you provide when you create an account and use our services, including name, email, organization details, and call and message data processed through our platform.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>How We Use It</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We use your information to provide and improve Recall Touch, process governed calls and records, and comply with legal obligations. We do not sell your personal information.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Data Retention</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We retain your data for as long as your account is active. Compliance records may be retained longer where required by law. You may request deletion subject to our retention obligations.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Your Rights</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                You may have rights to access, correct, delete, or port your data. To exercise these rights, contact privacy@recall-touch.com.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Contact</h2>
              <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Privacy questions: <a href="mailto:privacy@recall-touch.com" className="underline" style={{ color: "var(--accent-primary)" }}>privacy@recall-touch.com</a>.
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
