"use client";

import { Shield, Lock, Server, Zap } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

const badges = [
  { icon: Shield, label: "SOC 2" },
  { icon: Lock, label: "GDPR" },
  { icon: Server, label: "256-bit encryption" },
  { icon: Zap, label: "99.9% uptime" },
];

export function SocialProof() {
  return (
    <section className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center">
          <SectionLabel>Trusted by</SectionLabel>
          <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Used by operations teams in financial services, healthcare, and insurance.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {badges.map((b) => (
              <div key={b.label} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <b.icon className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{b.label}</span>
              </div>
            ))}
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
