import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { ProblemStatement } from "@/components/sections/ProblemStatement";
import { HomepageActivitySection } from "@/components/sections/HomepageActivitySection";
import { HomepageLiveDemo } from "@/components/sections/HomepageLiveDemo";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Features } from "@/components/sections/Features";
import { Industries } from "@/components/sections/Industries";
import { MetricsSection } from "@/components/sections/MetricsSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { PricingPreview } from "@/components/sections/PricingPreview";
import { EnterpriseComparisonCard } from "@/components/sections/EnterpriseComparisonCard";
import { SocialProof } from "@/components/sections/SocialProof";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";
import { VoiceOrb } from "@/components/VoiceOrb";

export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar />
      <main id="main">
        <Hero />
        <HomepageLiveDemo />
        <HomepageActivitySection />
        <ProblemStatement />
        <HowItWorks />
        <Features />
        <Industries />
        <MetricsSection />
        <TestimonialsSection />
        <PricingPreview />
        <EnterpriseComparisonCard />
        <SocialProof />
        <FinalCTA />
      </main>
      <VoiceOrb />
      <Footer />
    </div>
  );
}
