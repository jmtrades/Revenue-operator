import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { PricingContent, ANNUAL_NOTE, pricingCopyForTests } from "@/components/PricingContent";

export { ANNUAL_NOTE, pricingCopyForTests };

export const metadata = {
  title: "Pricing",
  description: "Plans that pay for themselves in a single saved call. Starter, Growth, Scale, and Enterprise.",
};

export default function PricingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar />
      <PricingContent />
      <Footer />
    </div>
  );
}
