"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Shield, Lock, Server, Zap } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { ROUTES } from "@/lib/constants";

const BADGE_KEYS = ["badgeSoc2", "badgeGdpr", "badgeEncryption", "badgeUptime"] as const;
const BADGE_ICONS = [Shield, Lock, Server, Zap];

export function SocialProof() {
  const t = useTranslations("hero.trust");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleEarlyAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const payload = { email: email.trim(), at: Date.now() };
    try {
      localStorage.setItem("rt_waitlist", JSON.stringify(payload));
      localStorage.setItem("rt_early_access", JSON.stringify(payload));
    } catch {
      // ignore
    }
    try {
      fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) })
        .catch((err) => console.error("Waitlist submit error:", err));
    } catch (err) {
      console.error("Waitlist submit error:", err);
    }
    setSubmitted(true);
  };

  return (
    <section id="waitlist" className="marketing-section pt-8 pb-16 md:pt-10 md:pb-20" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center">
          <SectionLabel>{t("sectionLabel")}</SectionLabel>
          <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {t("description")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {BADGE_KEYS.map((key, i) => {
              const Icon = BADGE_ICONS[i];
              return (
                <div key={key} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t(key)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-4 mb-8" style={{ color: "var(--text-tertiary)" }}>
            <Link href="/security" className="underline hover:opacity-80 transition-opacity" style={{ color: "var(--accent-primary)" }}>
              {t("complianceAndSecurity")}
            </Link>
          </p>
          <Link
            href={ROUTES.START}
            className="inline-flex items-center justify-center bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-200 transition-colors"
          >
            {t("ctaStartFree")}
          </Link>
          <p className="text-sm mt-6" style={{ color: "var(--text-tertiary)" }}>
            {t("optionalUpdates")}{" "}
            {!submitted ? (
              <button type="button" onClick={() => document.getElementById("newsletter-email")?.focus()} className="underline" style={{ color: "var(--accent-primary)" }}>
                {t("notifyMe")}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> {t("onList")}</span>
            )}
          </p>
          {!submitted && (
            <form onSubmit={handleEarlyAccess} className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto mt-3">
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                aria-label={t("emailAriaLabel")}
                className="flex-1 px-3 py-2 rounded-lg text-sm border"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              />
              <button type="submit" className="text-sm font-semibold bg-white text-black rounded-xl px-4 py-2 shrink-0 hover:bg-zinc-100 transition-colors">
                {t("getUpdates")}
              </button>
            </form>
          )}
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
