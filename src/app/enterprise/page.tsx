import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Enterprise — Recall Touch",
  description:
    "Enterprise AI revenue operations: white-label delivery, SSO/SAML, custom SLAs, multi-location support, compliance controls, and API access.",
  alternates: { canonical: `${BASE}/enterprise` },
  openGraph: {
    title: "Enterprise — Recall Touch",
    description:
      "Enterprise AI revenue operations: white-label delivery, SSO/SAML, custom SLAs, multi-location support, compliance controls, and API access.",
    url: `${BASE}/enterprise`,
    siteName: "Recall Touch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enterprise — Recall Touch",
    description: "White-label, SSO/SAML, custom SLAs, multi-location support, and API access.",
  },
};

const enterpriseSections: Array<{ title: string; body: string }> = [
  {
    title: "White-Label",
    body: "Deliver Recall Touch under your brand. Keep the experience consistent for your customers while still operating the underlying revenue system with your own governance and reporting.",
  },
  {
    title: "SSO / SAML",
    body: "Enable secure single sign-on with SAML-based authentication. Manage access centrally, reduce account sprawl, and keep onboarding/offboarding consistent across teams.",
  },
  {
    title: "Custom SLA",
    body: "Set service-level expectations that match your operational requirements. We align delivery, monitoring, and response paths so your customers know what “reliable” means for your deployment.",
  },
  {
    title: "Multi-Location Support",
    body: "Run AI revenue operations across many locations with consistent execution and location-specific context. Each location can maintain its own pipeline signals, outcomes, and reporting clarity.",
  },
  {
    title: "Dedicated Account Manager",
    body: "Get a dedicated point of contact for planning, tuning, and operational cadence. Your account manager coordinates improvements and helps you keep performance predictable over time.",
  },
  {
    title: "Custom Compliance",
    body: "Configure compliance guardrails that match your industry requirements. From suppression rules to business-hours controls, we ensure outbound execution follows the standards you need.",
  },
  {
    title: "API Access",
    body: "Connect Recall Touch to your internal systems through stable APIs. Integrate leads, outcomes, and operational events so your CRM and analytics stay synchronized.",
  },
  {
    title: "Priority Support",
    body: "Receive priority support when issues matter. Faster escalation paths and operational monitoring help keep call answering and revenue recovery running when it counts.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main id="main">
        <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <SectionLabel>Enterprise</SectionLabel>
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">AI Revenue Operations for Enterprise</h1>
              <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Built for organizations that need scale, governance, and predictable execution. Deploy a revenue system that answers calls 24/7, drives appointments, and proves impact with analytics.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14 md:py-20">
          <Container>
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
              {enterpriseSections.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-6"
                >
                  <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    {s.title}
                  </h2>
                  <p className="mt-3 text-sm md:text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

