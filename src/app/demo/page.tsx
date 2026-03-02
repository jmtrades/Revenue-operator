import Link from "next/link";
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
        <CallSimulator />
      </main>
      <Footer />
    </div>
  );
}
