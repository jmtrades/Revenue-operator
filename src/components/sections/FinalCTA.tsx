"use client";

import Link from "next/link";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { ArrowRight, Shield, Clock, CreditCard } from "lucide-react";

export function FinalCTA() {
  return (
    <section
      className="marketing-section py-24 md:py-32 relative overflow-hidden"
      style={{ background: "var(--gradient-cta-section)", borderTop: "1px solid var(--border-default)" }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-white/[0.06] blur-[100px]" />
      </div>

      <Container>
        <AnimateOnScroll className="text-center max-w-2xl mx-auto relative z-10">

          <h2 className="font-bold text-3xl md:text-5xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--text-primary)" }}>
            Every Unanswered Call Is Revenue Walking Out the Door.
          </h2>

          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Start your 14-day free trial in under 3 minutes. No credit card. No contracts. No risk. Just results.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ROUTES.START}
              className="group bg-white text-black font-semibold rounded-xl px-8 py-4 hover:bg-zinc-100 transition-colors no-underline inline-flex items-center gap-2 text-lg"
            >
              Start Your Free Trial Now
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/book-demo"
              className="no-underline inline-flex items-center justify-center px-6 py-4 rounded-xl border border-zinc-700 text-zinc-300 font-semibold hover:text-white hover:bg-[var(--bg-inset)] transition-colors"
            >
              Book a Live Demo
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> No credit card — start free instantly
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Go live in under 3 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> 100% money-back guarantee
            </span>
          </div>

          {/* Social proof */}
          <p className="text-xs text-white/30 mt-6">
            Join 12,400+ businesses that stopped losing revenue to voicemail.
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
