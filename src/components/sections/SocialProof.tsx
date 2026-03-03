"use client";

import { useState } from "react";
import Link from "next/link";
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
    <section className="marketing-section pt-8 pb-16 md:pt-10 md:pb-20" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
            EARLY ACCESS
          </span>
          <SectionLabel>Founding members</SectionLabel>
          <p className="text-base mb-6 max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Launching to the first 100 businesses. Get in early. Lock in founding pricing for life.
          </p>
          {!submitted ? (
            <form onSubmit={handleEarlyAccess} className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto mb-10">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="flex-1 px-4 py-2.5 rounded-lg text-sm border"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
              />
              <button type="submit" className="btn-marketing-primary px-5 py-2.5 rounded-xl text-sm font-semibold shrink-0">
                Join waitlist →
              </button>
            </form>
          ) : (
            <p className="text-sm mb-10" style={{ color: "var(--meaning-green)" }}>You&apos;re on the list! 🎉</p>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            {badges.map((b) => (
              <div key={b.label} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <b.icon className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm mt-6" style={{ color: "var(--text-tertiary)" }}>
            Or <Link href={ROUTES.START} className="underline" style={{ color: "var(--accent-primary)" }}>get started free now</Link> and set up in 5 minutes.
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
