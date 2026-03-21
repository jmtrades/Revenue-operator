"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES } from "@/lib/constants";
import { ArrowRight, Play, Phone, Star, Shield, Users } from "lucide-react";

const USE_CASES = [
  "Answers every call in under 1 second — 24/7/365",
  "Sounds so human, 90% of callers don't know it's AI",
  "Books appointments directly into your calendar",
  "Follows up on every lead until the deal closes",
  "Recovers revenue from missed and after-hours calls",
  "Qualifies inbound leads before they go cold",
  "Runs outbound campaigns while you sleep",
  "Replaces your entire phone team at 1/10th the cost",
];

export function Hero() {
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTickerIndex((i) => (i + 1) % USE_CASES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="min-h-[80vh] flex items-center pt-24 pb-16 md:pt-28 md:pb-24 bg-[var(--bg-primary)]">
      <Container className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <SectionLabel>
              AI That Sounds Human. Results That Are Real.
            </SectionLabel>

            <h1
              className="font-bold max-w-xl mt-4 mb-4"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.2rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              Never Miss Another Call. Never Lose Another Dollar.
            </h1>

            <p className="text-base md:text-lg max-w-xl mb-5 text-[var(--text-secondary)] leading-relaxed">
              Recall Touch answers every call with a voice so human, 90% of callers don&apos;t know it&apos;s AI. It qualifies leads, books appointments, follows up, and recovers revenue — all on autopilot, 24/7, with 32 premium voices that sound like your best employee.
            </p>

            {/* Rotating use case ticker */}
            <div
              className="mb-6 h-8 flex items-center"
              aria-live="polite"
            >
              <span
                key={tickerIndex}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border transition-opacity duration-500"
                style={{
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)",
                  background: "rgba(13,110,110,0.08)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {USE_CASES[tickerIndex]}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-4">
              <Link
                href={ROUTES.START}
                className="group bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center flex items-center justify-center gap-2"
              >
                Start free — no card needed
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/demo"
                className="border border-white/20 text-white/90 font-medium rounded-xl px-6 py-3 hover:bg-white/10 transition-colors no-underline w-full sm:w-auto text-center flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Watch it in action
              </Link>
            </div>
            <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
              No credit card required · Setup in under 3 minutes · Use your existing number
            </p>

            {/* Inline Social Proof */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-xs ml-1 text-white/50">4.9/5</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                <strong className="text-white/70">12,400+</strong> businesses
              </span>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                <strong className="text-white/70">8.7M+</strong> calls handled
              </span>
            </div>
          </div>

          <div className="max-w-md lg:ml-auto">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 shadow-[var(--shadow-glow-primary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                Live Revenue Dashboard
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                See every answered call, booked appointment, and dollar recovered — in real time.
              </p>
              <HeroRevenueWidget />
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border-default)" }}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>24/7</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Coverage</p>
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&lt;0.8s</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Response</p>
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: "var(--accent-primary)" }}>32+</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Human-Quality Voices</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof bar */}
        <div className="max-w-4xl mx-auto mt-12 text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> SOC 2 Type II
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> HIPAA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> TCPA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> GDPR Ready
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> 256-bit Encryption
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Trusted by 12,400+ businesses recovering revenue across 47 states
          </p>
        </div>
      </Container>
    </section>
  );
}
