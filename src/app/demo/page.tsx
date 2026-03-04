import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { DemoSimulatorSection } from "@/components/demo/DemoSimulatorSection";
import { LiveAgentChat } from "@/components/LiveAgentChat";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Demo — Recall Touch",
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
        <div className="max-w-2xl mx-auto px-4 text-center mb-10">
          <h1 className="font-bold text-3xl md:text-4xl mb-2" style={{ letterSpacing: "-0.02em" }}>
            Try the agent
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Type a message and see how the receptionist responds.
          </p>
        </div>
        <div className="max-w-4xl mx-auto px-4">
          <LiveAgentChat variant="demo" initialAgent="sarah" voiceDefaultOn={false} showVoiceToggle showMic />
        </div>

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
      <Footer />
    </div>
  );
}
