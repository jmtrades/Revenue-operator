import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "About — Recall Touch",
  description: "Why Recall Touch exists and how to reach the team.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A]">
      <section className="py-16 md:py-24 border-b border-[#E5E5E0]">
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0D6E6E]">About</p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Why we built Recall Touch</h1>
            <div className="mt-6 space-y-4 text-[#4A4A4A] text-sm md:text-base leading-relaxed rounded-xl border border-[#E5E5E0] bg-white p-6">
              <p className="font-mono text-sm text-[#8A8A8A]">[FOUNDER: Write 2–3 paragraphs about why you built Recall Touch]</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 md:py-20 border-b border-[#E5E5E0]">
        <Container>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-6">Team</h2>
          <div className="rounded-xl border border-[#E5E5E0] bg-white p-8 max-w-md">
            <div className="aspect-square max-w-[200px] rounded-lg bg-[#F5F5F0] border border-[#E5E5E0] flex items-center justify-center text-xs text-[#8A8A8A] text-center px-4">
              [FOUNDER: Add your photo here]
            </div>
            <p className="mt-4 font-semibold text-[#1A1A1A]">[FOUNDER: Add your name here]</p>
            <p className="mt-2 text-sm text-[#4A4A4A]">[FOUNDER: Short role line]</p>
          </div>
        </Container>
      </section>

      <section className="py-14 md:py-20">
        <Container>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4">Contact</h2>
          <p className="text-[#4A4A4A] text-sm md:text-base">
            [FOUNDER: Add your email]
          </p>
          <p className="mt-6">
            <Link
              href="/contact"
              className="inline-flex rounded-lg bg-[#0D6E6E] px-6 py-3 text-sm font-medium text-white hover:bg-[#0A5A5A]"
            >
              Contact form
            </Link>
          </p>
        </Container>
      </section>
    </main>
  );
}
