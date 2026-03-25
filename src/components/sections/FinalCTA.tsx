"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { Container } from "@/components/ui/Container";
import { DemoVoiceButton } from "@/components/demo/DemoVoiceButton";
import { ROUTES, SOCIAL_PROOF } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  const t = useTranslations("marketing.finalCta");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setSubmitted(true);
    // Capture the lead before redirecting — don't lose it if they bounce from signup
    try {
      await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "final_cta" }),
      });
    } catch {
      // Non-blocking — still redirect even if capture fails
    }
    window.location.href = `${ROUTES.START}?email=${encodeURIComponent(email.trim())}`;
  };

  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden"
      style={{
        background: "var(--bg-primary)",
        borderTop: "1px solid var(--border-default)",
      }}
    >
      <Container>
        <AnimateOnScroll className="text-center max-w-2xl mx-auto relative z-10">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label")}
          </p>

          <h2
            className="font-semibold mb-5"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              color: "var(--text-primary)",
            }}
          >
            {t("heading")}
          </h2>

          <p
            className="text-base md:text-lg max-w-xl mx-auto mb-6 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("description")}
          </p>

          {/* Trust signals ABOVE the form — build confidence before the ask */}
          <div
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-6 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
              </svg>
              {t("noCreditCard")}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
              </svg>
              {t("moneyBackGuarantee")}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
              </svg>
              <Link href="/security" className="no-underline" style={{ color: "inherit" }}>{t("compliance")}</Link>
            </span>
          </div>

          {/* Inline email capture — zero-friction conversion */}
          <form
            onSubmit={handleEmailSubmit}
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto mb-3"
          >
            <label htmlFor="final-cta-email" className="sr-only">{t("emailLabel")}</label>
            <input
              id="final-cta-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="flex-1 px-4 py-3 rounded-[10px] text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--bg-inset)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
              required
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={submitted}
              className="btn-marketing-blue px-6 py-3 text-sm whitespace-nowrap group inline-flex items-center justify-center gap-2"
            >
              {submitted ? t("redirecting") : t("startFreeTrial")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="text-xs mb-8" style={{ color: "var(--text-tertiary)" }}>
            {t("liveInMinutes")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Link
              href="/demo"
              className="btn-marketing-ghost no-underline text-sm px-5 py-2.5"
            >
              {t("bookDemo")}
            </Link>
          </div>

          {/* Instant demo call */}
          <div className="flex flex-col items-center">
            <p
              className="text-sm mb-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("stillNotSure")}
            </p>
            <DemoVoiceButton />
          </div>

          {/* Social proof below demo */}
          <p className="text-xs mt-10" style={{ color: "var(--text-tertiary)" }}>
            {t("joinBusinesses", { count: SOCIAL_PROOF.businessCount })}
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
