import { cookies } from "next/headers";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { ProblemStatement } from "@/components/sections/ProblemStatement";
import { HomepageActivitySection } from "@/components/sections/HomepageActivitySection";
import { HomepageLiveDemo } from "@/components/sections/HomepageLiveDemo";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Features } from "@/components/sections/Features";
import { WhoUsesSection } from "@/components/sections/WhoUsesSection";
import { MetricsSection } from "@/components/sections/MetricsSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { PricingPreview } from "@/components/sections/PricingPreview";
import { EnterpriseComparisonCard } from "@/components/sections/EnterpriseComparisonCard";
import { SocialProof } from "@/components/sections/SocialProof";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";
import { VoiceOrbClient } from "@/components/VoiceOrbClient";

export default async function HomePage() {
  const cookieStore = await cookies();
  const initialAuthenticated =
    cookieStore.has("revenue_session") ||
    cookieStore.getAll().some((cookie) => cookie.name.startsWith("sb-"));

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main id="main">
        <Hero />
        <HomepageLiveDemo />
        <HomepageActivitySection />
        <ProblemStatement />
        <HowItWorks />
        <Features />
        <WhoUsesSection />
        <MetricsSection />
        <TestimonialsSection />
        <PricingPreview />
        <EnterpriseComparisonCard />
        <SocialProof />
        <FinalCTA />
      </main>
      <VoiceOrbClient />
      <Footer />
    </div>
  );
}
