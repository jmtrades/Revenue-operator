import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { PricingContent } from "@/components/PricingContent";

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
