"use client";

import Link from "next/link";
import { ShieldCheck, Timer, Banknote, Calendar, Cable, CreditCard } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const INTEGRATIONS = [
  { label: "Twilio", icon: Cable },
  { label: "Google Calendar", icon: Calendar },
  { label: "Stripe", icon: CreditCard },
  { label: "Webhooks", icon: Banknote },
];

const BADGES = [
  { label: "SOC 2 roadmap", icon: ShieldCheck },
  { label: "99.9% uptime target", icon: Timer },
];

export function HomepageTrustBar() {
  return (
    <section className="py-10 border-t border-white/[0.06]" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-white/60">
              Trusted by teams that can’t afford missed revenue.
              <span className="text-white/30"> </span>
              <span className="text-white/80 font-semibold">500+</span>{" "}
              workspaces, <span className="text-white/80 font-semibold">$2.4M+</span>{" "}
              estimated revenue recovered.
            </p>
            <Link
              href={ROUTES.PRICING}
              className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
            >
              See pricing →
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-white/50 mb-3">
                Works with your stack
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEGRATIONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80"
                    >
                      <Icon className="h-4 w-4 text-white/60" />
                      {item.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-white/50 mb-3">
                Trust & control
              </p>
              <div className="flex flex-wrap gap-2">
                {BADGES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80"
                    >
                      <Icon className="h-4 w-4 text-white/60" />
                      {item.label}
                    </span>
                  );
                })}
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80">
                  <ShieldCheck className="h-4 w-4 text-white/60" />
                  Audit-ready logs
                </span>
              </div>
              <p className="mt-3 text-xs text-white/40">
                Your team can review every action before it sends.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

