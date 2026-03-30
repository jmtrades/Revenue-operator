import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Enterprise — Revenue Operator",
  description:
    "Enterprise AI revenue operations: white-label delivery, SSO/SAML, custom SLAs, multi-location support, compliance controls, and API access.",
  alternates: { canonical: `${BASE}/enterprise` },
  openGraph: {
    title: "Enterprise — Revenue Operator",
    description:
      "Enterprise AI revenue operations: white-label delivery, SSO/SAML, custom SLAs, multi-location support, compliance controls, and API access.",
    url: `${BASE}/enterprise`,
    siteName: "Revenue Operator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enterprise — Revenue Operator",
    description: "White-label, SSO/SAML, custom SLAs, multi-location support, and API access.",
  },
};

const enterpriseSections: Array<{ title: string; body: string }> = [
  {
    title: "White-Label",
    body: "Deliver Revenue Operator under your brand. Keep the experience consistent for your customers while still operating the underlying revenue system with your own governance and reporting.",
  },
  {
    title: "SSO / SAML",
    body: "Enable secure single sign-on with SAML-based authentication. Manage access centrally, reduce account sprawl, and keep onboarding/offboarding consistent across teams.",
  },
  {
    title: "Custom SLA",
    body: "Set service-level expectations that match your operational requirements. We align delivery, monitoring, and response paths so your customers know what 'reliable' means for your deployment.",
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
    body: "Connect Revenue Operator to your internal systems through stable APIs. Integrate leads, outcomes, and operational events so your CRM and analytics stay synchronized.",
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

        {/* Trust & Compliance */}
        <section className="py-14 md:py-20" style={{ background: "var(--bg-surface)" }}>
          <Container>
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">Enterprise-Grade Trust & Compliance</h2>
              <p className="mt-3 text-sm md:text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Built to meet the security, privacy, and reliability standards your organization requires.
              </p>
            </div>
            <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: "SOC 2 Type II", desc: "Annual security audit with continuous monitoring. Enterprise-grade access controls, encryption, and incident response." },
                { label: "HIPAA Ready", desc: "Business Associate Agreements available for healthcare customers. PHI handling with encryption at rest and in transit." },
                { label: "99.97% Uptime SLA", desc: "Guaranteed availability backed by redundant infrastructure, automated failover, and 24/7 operational monitoring." },
                { label: "256-bit Encryption", desc: "All data encrypted in transit (TLS 1.3) and at rest (AES-256). HMAC-SHA256 authentication on every API request." },
                { label: "TCPA & GDPR Compliant", desc: "Consent tracking, per-contact suppression, DNC registry support, and data subject rights built into every workflow." },
                { label: "Workspace Isolation", desc: "Row-level security ensures your data is never accessible to other accounts. Full audit trail on every action." },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card,var(--bg-primary))] p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--accent-primary)" }}>{item.label}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Bottom CTA */}
        <section className="py-14 md:py-20">
          <Container>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to deploy AI revenue operations at scale?</h2>
              <p className="text-base mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Get a personalized deployment plan, custom SLA, and dedicated account manager.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/contact" className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-[var(--bg-hover)] transition-colors active:scale-[0.97]" style={{ transition: "transform 0.15s cubic-bezier(0.23,1,0.32,1)" }}>
                  Talk to Sales
                </Link>
                <Link href="/demo" className="inline-flex px-6 py-3 rounded-xl font-semibold border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors active:scale-[0.97]" style={{ color: "var(--text-primary)", transition: "transform 0.15s cubic-bezier(0.23,1,0.32,1)" }}>
                  Watch the Demo
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

