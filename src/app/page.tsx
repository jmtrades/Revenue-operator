import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";

const OutcomeCardsSection = dynamic(
  () => import("@/components/sections/OutcomeCardsSection").then((m) => m.OutcomeCardsSection),
);
const HomepageLiveDemo = dynamic(
  () => import("@/components/sections/HomepageLiveDemo").then((m) => m.HomepageLiveDemo),
);
const HomepageActivitySection = dynamic(
  () => import("@/components/sections/HomepageActivitySection").then((m) => m.HomepageActivitySection),
);
const ProblemStatement = dynamic(
  () => import("@/components/sections/ProblemStatement").then((m) => m.ProblemStatement),
);
const HowItWorks = dynamic(
  () => import("@/components/sections/HowItWorks").then((m) => m.HowItWorks),
);
const Features = dynamic(
  () => import("@/components/sections/Features").then((m) => m.Features),
);
const WhoUsesSection = dynamic(
  () => import("@/components/sections/WhoUsesSection").then((m) => m.WhoUsesSection),
);
const MetricsSection = dynamic(
  () => import("@/components/sections/MetricsSection").then((m) => m.MetricsSection),
);
const TestimonialsSection = dynamic(
  () => import("@/components/sections/TestimonialsSection").then((m) => m.TestimonialsSection),
);
const PricingPreview = dynamic(
  () => import("@/components/sections/PricingPreview").then((m) => m.PricingPreview),
);
const WhatMakesUsDifferentSection = dynamic(
  () =>
    import("@/components/sections/WhatMakesUsDifferentSection").then(
      (m) => m.WhatMakesUsDifferentSection,
    ),
);
const EnterpriseComparisonCard = dynamic(
  () =>
    import("@/components/sections/EnterpriseComparisonCard").then(
      (m) => m.EnterpriseComparisonCard,
    ),
);
const UseCaseSection = dynamic(
  () => import("@/components/sections/UseCaseSection").then((m) => m.UseCaseSection),
);
const SocialProof = dynamic(
  () => import("@/components/sections/SocialProof").then((m) => m.SocialProof),
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
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main id="main">
        <Hero />
        <SocialProof />
        <ProblemStatement />
        <HowItWorks />
        <HomepageLiveDemo />
        <OutcomeCardsSection />
        <HomepageActivitySection />
        <Features />
        <UseCaseSection />
        <WhoUsesSection />
        <MetricsSection />
        <TestimonialsSection />
        <PricingPreview />
        <WhatMakesUsDifferentSection />
        <EnterpriseComparisonCard />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
