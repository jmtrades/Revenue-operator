"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES } from "@/lib/constants";
import { ArrowRight, Play, Phone, Star, Shield, Users } from "lucide-react";

const USE_CASES = [
  "Responds to every lead in under 60 seconds",
  "Runs outbound campaigns while you sleep",
  "Books, confirms, and reschedules automatically",
  "Follows up until the deal closes",
  "Qualifies inbound leads before they go cold",
  "Recovers revenue from missed and after-hours calls",
  "Routes high-value calls to the right person instantly",
  "Replaces your entire phone workflow — not just answering",
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
              The AI-Powered Phone Platform
            </SectionLabel>

            <h1
              className="font-bold max-w-xl mt-4 mb-4"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.2rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              Your entire phone operation, handled by AI.
            </h1>

            <p className="text-base md:text-lg max-w-xl mb-5 text-[var(--text-secondary)] leading-relaxed">
              Inbound. Outbound. Follow-up. Booking. Routing. Escalation. One AI platform that replaces your phone team, recovers lost revenue, and runs 24/7 — at a fraction of the cost.
            </p>

            {/* Rotating use case ticker */}
            <div
              className="mb-6 h-8 flex items-center"
              aria-live="polite"
            >
              <span
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border"
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
                Revenue Recovered This Month
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Every call, follow-up, and booked outcome rolls into a single dashboard.
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
                    <p className="text-base font-bold" style={{ color: "var(--accent-primary)" }}>41</p>
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
            Trusted across every industry that depends on the phone.
          </p>
        </div>
      </Container>
    </section>
  );
}
