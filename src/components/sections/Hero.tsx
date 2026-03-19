"use client";

import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="min-h-[80vh] flex items-center pt-24 pb-16 md:pt-28 md:pb-24 bg-[var(--bg-primary)]">
      <Container className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <SectionLabel>
              AI Revenue Operations. Use your existing number. 2-min setup. No credit card.
            </SectionLabel>

            <h1
              className="font-bold max-w-xl mt-4 mb-4"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.2rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              Your Revenue Operations Run on Autopilot.
            </h1>

            <p className="text-base md:text-lg max-w-xl mb-4 text-[var(--text-secondary)] leading-relaxed">
              Recall Touch runs your entire revenue operation — inbound, outbound, follow-up, booking, and attribution — so every opportunity converts and every dollar is accounted for.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6 mt-6">
              <Link
                href={ROUTES.START}
                className="group bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#how-it-works"
                className="border border-white/20 text-white/90 font-medium rounded-xl px-6 py-3 hover:bg-white/10 transition-colors no-underline w-full sm:w-auto text-center flex items-center justify-center gap-2"
              >
                See How It Works
              </Link>
            </div>
          </div>

          <div className="max-w-md lg:ml-auto">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 shadow-[var(--shadow-glow-primary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                Revenue Recovered This Month
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Every call, follow-up, and booked outcome rolls into a single revenue operations dashboard.
              </p>
              <HeroRevenueWidget />
              <div className="mt-3 text-xs text-[var(--text-secondary)]">
                Example dashboard
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
