import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";

const HomepageTrustBar = dynamic(
  () => import("@/components/sections/HomepageTrustBar").then((m) => m.HomepageTrustBar),
);
const HomepageModeSelector = dynamic(
  () =>
    import("@/components/sections/HomepageModeSelector").then(
      (m) => m.HomepageModeSelector,
    ),
);
const HomepageFAQ = dynamic(
  () => import("@/components/sections/HomepageFAQ").then((m) => m.HomepageFAQ),
);
const HomepageTestCallCTA = dynamic(
  () =>
    import("@/components/sections/HomepageTestCallCTA").then(
      (m) => m.HomepageTestCallCTA,
    ),
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
const Features = dynamic(
  () => import("@/components/sections/Features").then((m) => m.Features),
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
const EnterpriseComparisonCard = dynamic(
  () =>
    import("@/components/sections/EnterpriseComparisonCard").then(
      (m) => m.EnterpriseComparisonCard,
    ),
);
const Industries = dynamic(
  () => import("@/components/sections/Industries").then((m) => m.Industries),
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
        <HomepageTrustBar />
        <ProblemStatement />
        <HowItWorks />
        <HomepageTestCallCTA />
        <HomepageModeSelector />
        <Features />
        <HomepageRoiCalculator />
        <Industries />
        <MetricsSection />
        <TestimonialsSection />
        <PricingPreview />
        <EnterpriseComparisonCard />
        <HomepageFAQ />
        <SocialProof />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
