import dynamic from "next/dynamic";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Hero } from "@/components/sections/Hero";
// V9: Homepage streamlined to 10 high-impact sections.
const HomepageFAQ = dynamic(
  () => import("@/components/sections/HomepageFAQ").then((m) => m.HomepageFAQ),
);

const HomepageRoiCalculator = dynamic(
  () =>
    import("@/components/sections/HomepageRoiCalculator").then(
      (module) => module.HomepageRoiCalculator,
    ),
);
const TrustedByBar = dynamic(
  () => import("@/components/sections/TrustedByBar").then((m) => m.TrustedByBar),
);
const SocialProof = dynamic(
  () => import("@/components/sections/SocialProof").then((m) => m.SocialProof),
);
const ResultsStatsSection = dynamic(
  () => import("@/components/sections/ResultsStatsSection").then((m) => m.ResultsStatsSection),
);
// ProblemStatement removed — loss-psychology framing replaced by ROI calculator
const HowItWorks = dynamic(
  () => import("@/components/sections/HowItWorks").then((m) => m.HowItWorks),
);
const PricingPreview = dynamic(
  () => import("@/components/sections/PricingPreview").then((m) => m.PricingPreview),
);
// Industries removed — listing specific industries on homepage excludes potential users.
// Industry-specific pages still exist at /industries/* for SEO.
const HomepageVoicePreview = dynamic(
  () => import("@/components/sections/HomepageVoicePreview").then((m) => m.HomepageVoicePreview),
);
// HomepageModeSelector removed — merged into HowItWorks flow
const TestimonialsGridSection = dynamic(
  () => import("@/components/sections/TestimonialsGridSection").then((m) => m.TestimonialsGridSection),
);
const TestimonialsSection = dynamic(
  () => import("@/components/sections/TestimonialsSection").then((m) => m.TestimonialsSection),
);
const ComparisonTableSection = dynamic(
  () => import("@/components/sections/ComparisonTableSection").then((m) => m.ComparisonTableSection),
);
const FinalCTA = dynamic(
  () => import("@/components/sections/FinalCTA").then((m) => m.FinalCTA),
);
const Footer = dynamic(
  () => import("@/components/sections/Footer").then((m) => m.Footer),
);
const StickyMobileCTA = dynamic(
  () => import("@/components/sections/StickyMobileCTA").then((m) => m.StickyMobileCTA),
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
        <HomepageRoiCalculator />
        <HowItWorks />
        <HomepageVoicePreview />
        <SocialProof />
        <TestimonialsGridSection />
        <TestimonialsSection />
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
