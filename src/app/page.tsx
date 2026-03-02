import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { ProblemStatement } from "@/components/sections/ProblemStatement";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Features } from "@/components/sections/Features";
import { Industries } from "@/components/sections/Industries";
import { PricingPreview } from "@/components/sections/PricingPreview";
import { MetricsSection } from "@/components/sections/MetricsSection";
import { SocialProof } from "@/components/sections/SocialProof";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";
import { ScrollDepthCTA } from "@/components/sections/ScrollDepthCTA";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main id="main">
        <Hero />
        <ProblemStatement />
        <HowItWorks />
        <Features />
        <Industries />
        <MetricsSection />
        <PricingPreview />
        <SocialProof />
        <FinalCTA />
        <Footer />
      </main>
      <ScrollDepthCTA />
    </div>
  );
}
