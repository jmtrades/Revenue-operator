import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";

// V8: Homepage reduced to 10 core sections (see master prompt).
const HomepageFAQ = dynamic(
  () => import("@/components/sections/HomepageFAQ").then((m) => m.HomepageFAQ),
);

const HomepageRoiCalculator = dynamic(
  () =>
    import("@/components/sections/HomepageRoiCalculator").then(
      (module) => module.HomepageRoiCalculator,
    ),
);
const ProblemStatement = dynamic(
  () => import("@/components/sections/ProblemStatement").then((m) => m.ProblemStatement),
);
const HowItWorks = dynamic(
  () => import("@/components/sections/HowItWorks").then((m) => m.HowItWorks),
);
const PricingPreview = dynamic(
  () => import("@/components/sections/PricingPreview").then((m) => m.PricingPreview),
);
const Industries = dynamic(
  () => import("@/components/sections/Industries").then((m) => m.Industries),
);
const Differentiation = dynamic(
  () => import("@/components/sections/CompetitorComparison").then((m) => m.CompetitorComparison),
);
const HomepageModeSelector = dynamic(
  () => import("@/components/sections/HomepageModeSelector").then((m) => m.HomepageModeSelector),
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
                name: "How is this different from an AI receptionist?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "An AI receptionist answers calls and takes messages. Recall Touch answers calls AND runs automated recovery sequences until the revenue is recovered — appointment booking, no-show recovery, reactivation campaigns, quote chasing, and ROI proof in your dashboard. The follow-up is what pays for itself.",
                },
              },
              {
                "@type": "Question",
                name: "Do I need to replace my CRM?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. Recall Touch is the execution layer. Keep your CRM; we focus on answering, booking, follow-ups, and proof of ROI.",
                },
              },
              {
                "@type": "Question",
                name: "How fast can I be live?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Most workspaces can be live in minutes: choose an industry, connect your number (or add one), and run a test call. You can refine scripts and follow-ups after you’ve seen it work.",
                },
              },
              {
                "@type": "Question",
                name: "Is there a free trial?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes — 14 days. No credit card required.",
                },
              },
              {
                "@type": "Question",
                name: "Can I use my existing business number?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. You can keep your number and forward calls, or add new numbers as needed.",
                },
              },
              {
                "@type": "Question",
                name: "How do you prevent spammy automation?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Guardrails: per-contact limits, quiet hours, opt-outs, and reviewable actions. You can require approval before anything sends.",
                },
              },
            ],
          }),
        }}
      />
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main id="main">
        <Hero />
        <ProblemStatement />
        <HomepageRoiCalculator />
        <HowItWorks />
        <Industries />
        <Differentiation />
        <HomepageModeSelector />
        <PricingPreview />
        <HomepageFAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
