import dynamic from "next/dynamic";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Hero } from "@/components/sections/Hero";

// Phase 80 — Homepage consolidated from 14 competing sections to 9.
// The hero now carries what used to be three sections (copy, ROI calculator,
// voice preview), which were fighting each other for the same square inches.
// Duplicated testimonial block removed. Order optimised for a single narrative:
// 1) Claim (hero with self-computed $-recovered)  → 2) Trust (logos)
// → 3) Aggregate proof (stats)  → 4) Mechanism (how it works)
// → 5) Social proof (testimonials + embedded testimonials)
// → 6) Differentiation (comparison)  → 7) Commitment (pricing)
// → 8) Objections (FAQ)  → 9) Final ask (CTA).

const TrustedByBar = dynamic(
  () => import("@/components/sections/TrustedByBar").then((m) => m.TrustedByBar),
);
const ResultsStatsSection = dynamic(
  () =>
    import("@/components/sections/ResultsStatsSection").then(
      (m) => m.ResultsStatsSection,
    ),
);
const HowItWorks = dynamic(
  () => import("@/components/sections/HowItWorks").then((m) => m.HowItWorks),
);
const SocialProof = dynamic(
  () => import("@/components/sections/SocialProof").then((m) => m.SocialProof),
);
const TestimonialsGridSection = dynamic(
  () =>
    import("@/components/sections/TestimonialsGridSection").then(
      (m) => m.TestimonialsGridSection,
    ),
);
const ComparisonTableSection = dynamic(
  () =>
    import("@/components/sections/ComparisonTableSection").then(
      (m) => m.ComparisonTableSection,
    ),
);
const PricingPreview = dynamic(
  () =>
    import("@/components/sections/PricingPreview").then((m) => m.PricingPreview),
);
const HomepageFAQ = dynamic(
  () => import("@/components/sections/HomepageFAQ").then((m) => m.HomepageFAQ),
);
const FinalCTA = dynamic(
  () => import("@/components/sections/FinalCTA").then((m) => m.FinalCTA),
);
const Footer = dynamic(
  () => import("@/components/sections/Footer").then((m) => m.Footer),
);
const StickyMobileCTA = dynamic(
  () =>
    import("@/components/sections/StickyMobileCTA").then((m) => m.StickyMobileCTA),
);

export default async function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What exactly does Revenue Operator do?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Revenue Operator is the autonomous revenue execution system that runs your entire revenue cycle. Inbound calls, outbound campaigns, lead qualification, appointment booking, follow-up sequences, and revenue recovery. It works 24/7, improves with every conversation, and costs less than a single hire.",
                },
              },
              {
                "@type": "Question",
                name: "Who is this for?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Any business or team that generates revenue through conversations. Solo consultants, sales teams, agencies, service businesses, clinics, law firms, real estate teams, recruiters, multi-location operators, and more.",
                },
              },
              {
                "@type": "Question",
                name: "Do I need to replace my CRM?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. Revenue Operator is the execution layer that sits on top of your CRM. It handles communication, follow-up, booking, and attribution. Your CRM stays as your system of record.",
                },
              },
              {
                "@type": "Question",
                name: "How do I get started?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sign up, choose your plan, and your AI operator is live in minutes.",
                },
              },
              {
                "@type": "Question",
                name: "Does this work for outbound too?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Revenue Operator supports 10 outbound campaign types including speed-to-lead, appointment setting, reactivation, quote follow-up, and cold outreach with full compliance and attribution.",
                },
              },
              {
                "@type": "Question",
                name: "How do you prevent bad automation?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Every agent has configurable guardrails: per-contact frequency limits, business hours enforcement, opt-out compliance, confidence thresholds, and human escalation rules. Every action is logged and reviewable.",
                },
              },
            ],
          }),
        }}
      />
      <MarketingNavbar />
      <main id="main">
        <Hero />
        <TrustedByBar />
        <ResultsStatsSection />
        <HowItWorks />
        <SocialProof />
        <TestimonialsGridSection />
        <ComparisonTableSection />
        <PricingPreview />
        <HomepageFAQ />
        <FinalCTA />
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
