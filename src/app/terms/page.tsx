import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

// Note: Dynamic metadata with translations requires generateMetadata.
// Static metadata.title/description do not have access to i18n.
export const metadata: Metadata = {
  title: "Terms of Service — Recall Touch",
  description:
    "Recall Touch Terms of Service: service description, billing/refunds, acceptable use, and data handling. Start free or contact support for questions today.",
};

export default async function TermsPage() {
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
            <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>Terms of Service</h1>
            <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>Effective date: January 1, 2026</p>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Acceptance</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                By accessing or using Recall Touch, you agree to these Terms of Service. If you are using the service on behalf of an organization, you represent that you have authority to bind that organization to these terms. If you do not agree, you may not use the service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Description of Service</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Recall Touch is an AI phone system for businesses. We provide call answering, outbound calling, appointment booking, lead capture, messaging, recording, transcription, and related features. The service is offered on a subscription basis with different plans and limits as described on our pricing page. We reserve the right to modify, suspend, or discontinue features with reasonable notice when practicable. We do not guarantee uninterrupted or error-free operation.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>User Responsibilities</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                You are responsible for your account credentials and for all activity under your account. You must use the service in compliance with all applicable laws and regulations, including those governing telephony, data protection, and your industry. You are responsible for the content and data you input or process through Recall Touch and for obtaining any consents (for example, from callers) where required. You must not use the service for illegal purposes, to harass or harm others, to send spam, or to violate the rights of any third party. We may suspend or terminate your access if we reasonably believe you have violated these terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Acceptable Use</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                You may not reverse-engineer, decompile, or attempt to extract the source code of our service; resell or sublicense the service without our written consent; use automated means to scrape or overload our systems; or use the service to build a competing product. You may not use the service in a way that could damage, disable, or impair our infrastructure or that of our providers.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Payment Terms</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Paid plans are billed in advance (monthly or annually as selected). Fees are non-refundable except as required by law or as explicitly stated in your plan (for example, a money-back guarantee). We may change pricing with notice; continued use after the effective date of a change constitutes acceptance. Failure to pay may result in suspension or termination of service. Overage fees may apply if you exceed included usage; such fees will be disclosed in your plan or at the time of use.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Intellectual Property</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Recall Touch and its content, features, and technology (including software, design, and branding) are owned by us or our licensors. We grant you a limited, non-exclusive, non-transferable license to use the service for your internal business purposes in accordance with these terms. You do not acquire any ownership rights in our service or content. Feedback you provide may be used by us without obligation to you.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Termination</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                You may cancel your account at any time through your account settings or by contacting us. We may suspend or terminate your account or access to the service for breach of these terms, non-payment, or for any other reason with notice where practicable. Upon termination, your right to use the service ceases. We may retain and use your data as described in our Privacy Policy. Sections that by their nature should survive (including liability limitations, indemnification, and governing law) will survive termination.
              </p>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Workspace deletion follows a defined lifecycle: deletion request, 30-day retention window, then purge. On request, we cancel active subscriptions, release connected phone numbers, and queue recordings/transcripts for deletion. After the retention window, service data is removed according to system retention jobs; anonymized aggregate analytics may be retained for service benchmarking.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Disclaimers</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                The service is provided "as is" and "as available." We disclaim all warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted, secure, or error-free. You use the service at your own risk. Our AI and automation are tools to assist your business; you remain responsible for the accuracy and appropriateness of how you use them and for any decisions made based on their output.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Limitation of Liability</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                To the maximum extent permitted by law, Recall Touch and its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, revenue, or business opportunities, whether in contract, tort, or otherwise. Our total aggregate liability for any claims arising out of or related to these terms or the service shall not exceed the greater of (a) the fees you paid to us in the twelve months preceding the claim, or (b) one hundred U.S. dollars. Some jurisdictions do not allow the exclusion or limitation of certain damages; in such cases, our liability will be limited to the maximum extent permitted by law.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Indemnification</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                You agree to indemnify, defend, and hold harmless Recall Touch and its affiliates and their respective officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys’ fees) arising out of or related to your use of the service, your violation of these terms, your violation of any law or the rights of a third party, or any content or data you submit or process through the service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Governing Law and Disputes</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any dispute arising out of or relating to these terms or the service shall be resolved exclusively in the state or federal courts located in Delaware, and you consent to the personal jurisdiction of such courts. The United Nations Convention on Contracts for the International Sale of Goods does not apply.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>General</h2>
              <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                These terms constitute the entire agreement between you and Recall Touch regarding the service and supersede any prior agreements. If any provision is found unenforceable, the remaining provisions will remain in effect. Our failure to enforce any right or provision is not a waiver of that right or provision. You may not assign these terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets. We may provide notice to you by email, in-product notification, or post to our website.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-3" style={{ color: "var(--text-primary)" }}>Contact</h2>
              <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                For questions about these terms: <a href="mailto:legal@recall-touch.com" className="underline" style={{ color: "var(--accent-primary)" }}>legal@recall-touch.com</a>. We will respond within a reasonable time.
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
