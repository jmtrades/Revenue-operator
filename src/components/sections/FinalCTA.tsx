"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { Container } from "@/components/ui/Container";
import { DemoVoiceButton } from "@/components/demo/DemoVoiceButton";
import { ROUTES, SOCIAL_PROOF } from "@/lib/constants";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";

export function FinalCTA() {
  const t = useTranslations("marketing.finalCta");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setSubmitted(true);
    try {
      await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "final_cta" }),
      });
    } catch {
      // Non-blocking
    }
    window.location.href = `${ROUTES.START}?email=${encodeURIComponent(email.trim())}`;
  };

  return (
    <section
      className="relative py-24 md:py-36 overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Premium gradient backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(37,99,235,0.04), transparent 70%)",
        }}
      />
      {/* Top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--border-default) 30%, var(--border-default) 70%, transparent 100%)",
        }}
      />

      <Container className="relative z-10">
        <div className="text-center max-w-2xl mx-auto">
          <AnimateOnScroll>
            {/* Eyebrow */}
            <motion.div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
              style={{
                background: "var(--bg-hover)",
                border: "1px solid var(--border-default)",
              }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Phone className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>
                {t("label")}
              </span>
            </motion.div>

            <h2
              className="font-semibold mb-5"
              style={{
                fontSize: "clamp(1.875rem, 4vw, 3rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.12,
                color: "var(--text-primary)",
              }}
            >
              {t("heading")}
            </h2>

            <p
              className="text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("description")}
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-8">
              {[t("noCreditCard"), t("moneyBackGuarantee"), t("compliance")].map((item, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-secondary)" }} />
                  {i === 2 ? (
                    <Link href="/security" className="no-underline" style={{ color: "inherit" }}>{item}</Link>
                  ) : (
                    item
                  )}
                </span>
              ))}
            </div>

            {/* Email capture */}
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
                className="flex-1 px-4 py-3 rounded-[10px] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
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
                {submitted ? t("redirecting") : t("getStarted")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="text-xs mb-10" style={{ color: "var(--text-tertiary)" }}>
              {t("liveInMinutes")}
            </p>

            {/* Separator */}
            <div className="flex items-center gap-4 max-w-xs mx-auto mb-8">
              <div className="flex-1 h-px" style={{ background: "var(--border-default)" }} />
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-disabled)" }}>
                or
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border-default)" }} />
            </div>

            {/* Demo section */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/demo"
                  className="btn-marketing-ghost no-underline text-sm px-5 py-2.5"
                >
                  {t("bookDemo")}
                </Link>
              </div>

              <p className="text-sm mb-2" style={{ color: "var(--text-tertiary)" }}>
                {t("stillNotSure")}
              </p>
              <DemoVoiceButton />
            </div>

            {/* Social proof */}
            <p className="text-xs mt-12" style={{ color: "var(--text-disabled)" }}>
              {t("joinBusinesses", { count: SOCIAL_PROOF.businessCount })}
            </p>
          </AnimateOnScroll>
        </div>
      </Container>
    </section>
  );
}
