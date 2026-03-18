"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const tHero = useTranslations("hero");

  return (
    <section className="min-h-[80vh] flex items-center pt-24 pb-16 md:pt-28 md:pb-24 bg-[var(--bg-primary)]">
      <Container className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <SectionLabel>{tHero("trustLine")}</SectionLabel>

            <h1
              className="font-bold max-w-xl mt-4 mb-4"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.2rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              <span className="text-[var(--text-primary)]">
                Stop Losing Revenue to Missed Calls
              </span>
              <br />
              <span className="text-[var(--text-primary)]">
                And Broken Follow-Up.
              </span>
            </h1>

            <p className="text-base md:text-lg max-w-xl mb-4 text-[var(--text-secondary)] leading-relaxed">
              Recall Touch answers every call, books appointments, and runs automated follow-up
              that recovers the revenue you&apos;re currently losing. See results in your first week.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6 mt-6">
              <Link
                href={ROUTES.START}
                className="group bg-[var(--accent-primary)] text-white font-semibold rounded-lg px-7 py-3.5 hover:bg-[var(--accent-primary-hover)] transition-colors no-underline w-full sm:w-auto text-center flex items-center justify-center gap-2 shadow-[var(--shadow-glow-primary)]"
              >
                Start Recovering Revenue — Free for 14 Days
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#how-it-works"
                className="border border-[var(--border-default)] text-[var(--accent-primary)] font-medium rounded-lg px-5 py-3 hover:bg-[var(--bg-hover)]/60 transition-colors no-underline w-full sm:w-auto text-center flex items-center justify-center gap-2"
              >
                See How It Works
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--text-secondary)]">
              <span>✓ {tHero("checkmark.existingNumber")}</span>
              <span>✓ {tHero("checkmark.setup")}</span>
              <span>✓ {tHero("checkmark.noCard")}</span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-xs text-[var(--text-secondary)]">
              <span><strong className="text-[var(--text-primary)]">&lt;3 sec</strong> answer time</span>
              <span><strong className="text-[var(--text-primary)]">24/7</strong> availability</span>
              <span><strong className="text-[var(--text-primary)]">14-day</strong> free trial</span>
            </div>
          </div>

          <div className="max-w-md lg:ml-auto">
            <div className="space-y-4">
              <HeroRevenueWidget />
              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 shadow-[var(--shadow-glow-primary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Revenue Recovered Snapshot
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  That&apos;s what Recall Touch recovered this month for a typical service business —
                  based on kept appointments from answered calls and automated follow-up.
                </p>
                <HeroRevenueWidget />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
