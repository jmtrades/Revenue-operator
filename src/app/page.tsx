import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/sections/Navbar";
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
const SocialProof = dynamic(
  () => import("@/components/sections/SocialProof").then((m) => m.SocialProof),
);
const CustomerLogosBar = dynamic(
  () => import("@/components/sections/CustomerLogosBar").then((m) => m.CustomerLogosBar),
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
const TestimonialsSection = dynamic(
  () => import("@/components/sections/TestimonialsSection").then((m) => m.TestimonialsSection),
);
const FinalCTA = dynamic(
  () => import("@/components/sections/FinalCTA").then((m) => m.FinalCTA),
);
const Footer = dynamic(
  () => import("@/components/sections/Footer").then((m) => m.Footer),
);

export default async function HomePage() {
  let initialAuthenticated = false;
  try {
    const cookieStore = await cookies();
    initialAuthenticated =
      cookieStore.has("revenue_session") ||
      cookieStore.getAll().some((cookie) => cookie.name.startsWith("sb-"));
  } catch {
    // Prefetch/RSC without cookies: render public homepage
  }

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
                name: "What exactly does Recall Touch do?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Recall Touch is the AI employee that handles your phone calls — all of them. Inbound, outbound, follow-up, reminders, appointments, sales, support, and more. It works 24/7, gets smarter with every conversation, and costs less than a single hire.",
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
                  text: "No. Recall Touch is the execution layer that sits on top of your CRM. It handles communication, follow-up, booking, and attribution. Your CRM stays as your system of record.",
                },
              },
              {
                "@type": "Question",
                name: "Is there a free trial?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. 14 days. No credit card required. Full access to all features on your plan.",
                },
              },
              {
                "@type": "Question",
                name: "Does this work for outbound too?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Recall Touch supports 10 outbound campaign types including speed-to-lead, appointment setting, reactivation, quote follow-up, and cold outreach with full compliance and attribution.",
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
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main id="main">
        <Hero />
        <CustomerLogosBar />
        <SocialProof />
        <HowItWorks />
        <HomepageVoicePreview />
        <HomepageRoiCalculator />
        <TestimonialsSection />
        <PricingPreview />
        <HomepageFAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
