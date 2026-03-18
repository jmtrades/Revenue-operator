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
const Features = dynamic(
  () => import("@/components/sections/Features").then((m) => m.Features),
);
const PricingPreview = dynamic(
  () => import("@/components/sections/PricingPreview").then((m) => m.PricingPreview),
);
const Industries = dynamic(
  () => import("@/components/sections/Industries").then((m) => m.Industries),
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
        <ProblemStatement />
        <HowItWorks />
        <HomepageRoiCalculator />
        <Industries />
        <Features />
        <PricingPreview />
        <HomepageFAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
