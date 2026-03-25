import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

// Note: Dynamic metadata with translations requires generateMetadata.
// Static metadata.title/description do not have access to i18n.
export const metadata: Metadata = {
  title: "Privacy Policy — Recall Touch",
  description:
    "Recall Touch Privacy Policy covering data collection, usage, storage, and your rights. Learn how we protect your data and handle personal information.",
};

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <article className="max-w-[720px] mx-auto">
            {t.has("languageNotice") && (
              <div className="mb-6 p-4 rounded-lg" style={{ background: "var(--bg-surface)", borderLeft: "4px solid var(--accent-primary)" }}>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("languageNotice")}
                </p>
              </div>
            )}
            <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>Privacy Policy</h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>Effective date: January 1, 2026</p>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Information We Collect</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We collect information you provide when you create an account and use our services, including your name, email address, business or organization name, phone number, industry, and any optional details such as your website. When you use our AI phone system, we also process call and message data: call recordings, transcripts, caller contact details, appointment and lead information, and related metadata necessary to deliver and improve the service.
              </p>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We automatically collect certain technical information when you use our website or dashboard, including IP address, browser type, device information, and usage data such as pages visited and features used. This helps us operate the service, prevent abuse, and improve performance.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>How We Use It</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We use your information to provide and improve Recall Touch: to set up and maintain your account, to operate our AI phone system (including answering and placing calls, transcribing and storing recordings, and sending you alerts and summaries), to process and store compliance-grade records where applicable, and to communicate with you about your account, product updates, and support.
              </p>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We may use aggregated or de-identified data for analytics, product improvement, and industry benchmarks. We do not sell your personal information to third parties. We may share data with service providers who assist us in operating the platform (such as cloud hosting, telephony, and email) under strict confidentiality and data-processing agreements.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Cookies and Similar Technologies</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We use cookies and similar technologies to keep you signed in, to remember your preferences, and to understand how you use our site. You can control cookies through your browser settings; disabling certain cookies may limit some functionality. We do not use third-party advertising cookies.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Data Retention</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We retain your account and usage data for as long as your account is active. Call recordings, transcripts, and compliance records are retained according to your plan settings and applicable legal or regulatory requirements; in some industries, longer retention is required and we will retain data accordingly. After account termination, we may retain certain data for a limited period for legal, security, or dispute-resolution purposes, after which it is deleted or anonymized. You may request deletion of your personal data subject to our retention obligations.
              </p>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                When you request workspace deletion, we move the workspace to a deletion-pending state and start a 30-day retention window. During that window, active subscriptions are cancelled, linked phone numbers are released, and recording/transcript purge work is queued. After the retention window, remaining workspace data is purged according to our retention jobs, while anonymized aggregate analytics may be retained for internal benchmarking.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Security</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We implement technical and organizational measures to protect your data, including encryption in transit and at rest, access controls, and regular security assessments. You are responsible for keeping your login credentials secure and for the activity that occurs under your account.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Your Rights</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Depending on your location, you may have rights to access, correct, delete, or port your personal data, to object to or restrict certain processing, and to withdraw consent where processing is consent-based. To exercise these rights, contact us at <a href="mailto:privacy@recall-touch.com" className="underline" style={{ color: "var(--accent-primary)" }}>privacy@recall-touch.com</a>. If you are in the European Economic Area or the United Kingdom, you also have the right to lodge a complaint with your local data protection authority.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>International Transfers</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Our services may involve transferring your data to and processing it in the United States or other countries where we or our service providers operate. We ensure appropriate safeguards (such as standard contractual clauses or adequacy decisions) where required by applicable law.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Children</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Recall Touch is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us and we will delete it promptly.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Changes to This Policy</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the effective date. For material changes, we will provide additional notice (such as by email or a prominent notice in the product). Your continued use of Recall Touch after the effective date constitutes acceptance of the updated policy.
              </p>
            </section>
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Contact</h2>
              <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                For privacy questions, requests, or complaints: <a href="mailto:privacy@recall-touch.com" className="underline" style={{ color: "var(--accent-primary)" }}>privacy@recall-touch.com</a>. We will respond within a reasonable time.
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
