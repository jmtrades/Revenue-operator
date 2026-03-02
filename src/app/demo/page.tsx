import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { CallSimulator } from "@/components/demo/CallSimulator";

export const metadata = {
  title: "Live demo",
  description: "Watch Recall Touch handle real business calls — inbound, appointments, and outbound follow‑up.",
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
            See Recall Touch in action
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Watch real AI phone calls — booking appointments, capturing leads, and following up.
          </p>
        </div>
        <CallSimulator />
      </main>
      <Footer />
    </div>
  );
}
