"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { ArrowRight, Shield, Clock, CreditCard } from "lucide-react";

export function FinalCTA() {
  const t = useTranslations("homepage.finalCta");

  return (
    <section
      className="marketing-section py-24 md:py-32 relative overflow-hidden"
      style={{ background: "var(--gradient-cta-section)", borderTop: "1px solid var(--border-default)" }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-emerald-500/[0.06] blur-[100px]" />
      </div>

      <Container>
        <AnimateOnScroll className="text-center max-w-2xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-xs font-medium text-red-400 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
            </span>
            You&apos;re losing money right now
          </div>

          <h2 className="font-bold text-3xl md:text-5xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--text-primary)" }}>
            Every Day Without Recall Touch Is{" "}
            <span className="text-emerald-400">Revenue Walking Out the Door.</span>
          </h2>

          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            14 days free. No credit card required. Cancel anytime.
            Your AI starts answering calls in under 3 minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ROUTES.START}
              className="group bg-emerald-500 text-black font-semibold rounded-xl px-8 py-4 hover:bg-emerald-400 transition-all no-underline inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-lg"
            >
              Start Your Free Trial Now
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={ROUTES.CONTACT}
              className="btn-marketing-ghost btn-lg no-underline inline-block px-6 py-4 rounded-xl border border-[var(--border-default)] font-semibold"
            >
              Talk to Us
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Setup in under 3 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Cancel anytime
            </span>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
