import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { DemoSimulatorSection } from "@/components/demo/DemoSimulatorSection";
import { DemoPageContent } from "./DemoPageContent";
import { VoiceOrbClient } from "@/components/VoiceOrbClient";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Demo",
  description: "Talk to the agent and watch a sample call.",
};

export default function DemoPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar />
      <main className="pt-28 pb-24">
        <DemoPageContent />

        <div className="max-w-3xl mx-auto px-4 mt-16">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Watch a sample call</h2>
              <p className="text-sm text-zinc-400 mt-1">For visitors who don&apos;t want to type.</p>
            </div>
            <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-flex items-center justify-center">
              Start free → 5 minute setup
            </Link>
          </div>
          <DemoSimulatorSection />
          <p className="text-sm text-zinc-400 mt-6">
            That took <span className="text-white font-medium">seconds</span>. Your AI handles this 24/7 for <span className="text-white font-medium">$97/month</span>.
          </p>
        </div>
      </main>
      <VoiceOrbClient />
      <Footer />
    </div>
  );
}
