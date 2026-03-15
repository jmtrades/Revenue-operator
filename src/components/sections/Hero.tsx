"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function Hero() {
  const tHero = useTranslations("hero");

  return (
    <section className="min-h-screen flex items-center pt-28 pb-16 md:pt-32 md:pb-20 relative overflow-hidden bg-[var(--bg-base)] hero-atmosphere">
      <Container className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <SectionLabel>{tHero("trustLine")}</SectionLabel>
            <h1
              className="font-bold max-w-xl mt-4 mb-4 hero-headline"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.5rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              {tHero("title")}
            </h1>
            <p className="text-base md:text-lg max-w-lg mb-4 text-slate-400 leading-relaxed">
              {tHero("subtitle")}
            </p>
            <p className="text-sm text-white/40 mt-4">{tHero("trustLine")}</p>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
              <Link
                href={ROUTES.START}
                className="bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center"
              >
                {tHero("primaryCta")}
              </Link>
              <Link
                href={ROUTES.DEMO}
                className="border border-white/20 text-white/90 font-medium rounded-xl px-5 py-2.5 hover:bg-white/10 transition-colors no-underline w-full sm:w-auto text-center"
              >
                {tHero("secondaryCta")}
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
              <span>✓ {tHero("checkmark.existingNumber")}</span>
              <span>✓ {tHero("checkmark.setup")}</span>
              <span>✓ {tHero("checkmark.noCard")}</span>
            </div>
          </div>

          {/* Right: static conversation demo (no live voice / no mic widget) */}
          <div className="max-w-md lg:ml-auto">
            <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span></span>
                <h3 className="text-base font-semibold text-white">See how your AI handles a call</h3>
              </div>
              <p className="text-sm text-white/60 mb-5">Real-time appointment booking — fully automated</p>
              <div className="space-y-3">
                <div className="rounded-lg p-3 bg-white/[0.04] mr-6"><p className="text-xs font-medium text-white/35 mb-0.5">Caller</p><p className="text-sm text-white">&ldquo;Hi, I&rsquo;d like to schedule an appointment for Thursday.&rdquo;</p></div>
                <div className="rounded-lg p-3 bg-zinc-900/70 border border-zinc-700 ml-6"><p className="text-xs font-medium text-emerald-400 mb-0.5">AI Agent</p><p className="text-sm text-white">&ldquo;Of course! I have openings at 10 AM, 2 PM, and 4 PM. Which works best?&rdquo;</p></div>
                <div className="rounded-lg p-3 bg-white/[0.04] mr-6"><p className="text-xs font-medium text-white/35 mb-0.5">Caller</p><p className="text-sm text-white">&ldquo;2 PM sounds perfect.&rdquo;</p></div>
                <div className="rounded-lg p-3 bg-zinc-900/70 border border-zinc-700 ml-6"><p className="text-xs font-medium text-emerald-400 mb-0.5">AI Agent</p><p className="text-sm text-white">&ldquo;Great — Thursday at 2 PM is booked. Can I get your name and number?&rdquo;</p></div>
                <div className="rounded-lg p-3 bg-white/[0.04] mr-6"><p className="text-xs font-medium text-white/35 mb-0.5">Caller</p><p className="text-sm text-white">&ldquo;Sarah, 555-0142.&rdquo;</p></div>
                <div className="rounded-lg p-3 bg-zinc-900/70 border border-zinc-700 ml-6"><p className="text-xs font-medium text-emerald-400 mb-0.5">AI Agent</p><p className="text-sm text-white">&ldquo;All set, Sarah! You&rsquo;ll get a confirmation text shortly.&rdquo;</p></div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center gap-3">
                <a href="/sign-in?create=1" className="px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors">Build yours free →</a>
                <span className="text-xs text-white/35">No credit card · 14-day trial</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
