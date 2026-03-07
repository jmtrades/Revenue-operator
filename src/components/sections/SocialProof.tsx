"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Shield, Lock, Server, Zap } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { ROUTES } from "@/lib/constants";

const badges = [
  { icon: Shield, label: "SOC 2" },
  { icon: Lock, label: "GDPR" },
  { icon: Server, label: "256-bit encryption" },
  { icon: Zap, label: "99.9% uptime" },
];

export function SocialProof() {
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
      fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) }).catch(() => {});
    } catch {
      // silent fail
    }
    setSubmitted(true);
  };

  return (
    <section id="waitlist" className="marketing-section pt-8 pb-16 md:pt-10 md:pb-20" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center">
          <SectionLabel>Trust & compliance</SectionLabel>
          <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Enterprise-grade security and reliability. Start free — no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {badges.map((b) => (
              <div key={b.label} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <b.icon className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{b.label}</span>
              </div>
            ))}
          </div>
          <Link
            href={ROUTES.START}
            className="inline-flex items-center justify-center bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-200 transition-colors"
          >
            Start free →
          </Link>
          <p className="text-sm mt-6" style={{ color: "var(--text-tertiary)" }}>
            Optional: get product updates.{" "}
            {!submitted ? (
              <button type="button" onClick={() => document.getElementById("newsletter-email")?.focus()} className="underline" style={{ color: "var(--accent-primary)" }}>
                Notify me
              </button>
            ) : (
              <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> You&apos;re on the list.</span>
            )}
          </p>
          {!submitted && (
            <form onSubmit={handleEarlyAccess} className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto mt-3">
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email for product updates"
                className="flex-1 px-3 py-2 rounded-lg text-sm border"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              />
              <button type="submit" className="text-sm text-zinc-300 hover:text-white border border-zinc-600 rounded-lg px-4 py-2 shrink-0 transition-colors">
                Subscribe
              </button>
            </form>
          )}
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
