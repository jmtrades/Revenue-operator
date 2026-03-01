"use client";

import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export default function DemoPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container className="max-w-2xl text-center">
          <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em" }}>
            Hear a live demo
          </h1>
          <p className="text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Sample calls and interactive demo are coming soon. For now, start free and test your own AI phone team in 5 minutes.
          </p>
          <Link href={ROUTES.START} className="btn-marketing-primary btn-lg no-underline inline-block">
            Start free — 5 minute setup →
          </Link>
          <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
            <Link href={ROUTES.CONTACT} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded" style={{ color: "var(--text-tertiary)" }}>
              Book a live walkthrough
            </Link>
          </p>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
