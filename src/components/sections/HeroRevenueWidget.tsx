"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, PhoneCall, CalendarCheck, Sparkles, Info } from "lucide-react";
import { ROUTES } from "@/lib/constants";

type HeroKpi = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "lead" | "appointment" | "followup";
};

export function HeroRevenueWidget() {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const kpis: HeroKpi[] = [
    {
      label: "Calls answered",
      value: "—",
      icon: PhoneCall,
      tone: "lead",
    },
    {
      label: "Appointments booked",
      value: "—",
      icon: CalendarCheck,
      tone: "appointment",
    },
    {
      label: "Follow-ups executed",
      value: "—",
      icon: Sparkles,
      tone: "followup",
    },
  ];

  const toneStyles: Record<HeroKpi["tone"], { border: string; fg: string; bg: string }> = {
    lead: { border: "border-[var(--border-default)]", fg: "text-blue-500", bg: "bg-[var(--bg-inset)]" },
    appointment: { border: "border-[var(--border-default)]", fg: "text-green-500", bg: "bg-[var(--bg-inset)]" },
    followup: { border: "border-[var(--border-default)]", fg: "text-amber-500", bg: "bg-[var(--bg-inset)]" },
  };

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Revenue recovered (preview)
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tabular-nums">—</p>
              <span className="inline-flex items-center gap-1 text-sm text-[var(--accent-secondary)]">
                <ArrowUpRight className="h-4 w-4" />
                Populates after your first test call
              </span>
            </div>
            {!prefersReducedMotion && <div className="mt-3 h-1.5 w-28 rounded-full bg-[var(--bg-inset)] overflow-hidden">
              <div className="h-full w-1/2 bg-[var(--accent-primary)]/20 animate-pulse" />
            </div>}
          </div>
          <div className="hidden sm:block">
            <Link
              href="/app/analytics"
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              View analytics →
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const tone = toneStyles[kpi.tone];
            return (
              <div
                key={kpi.label}
                className={`rounded-xl border ${tone.border} bg-[var(--bg-inset)] p-4`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-secondary)]">{kpi.label}</p>
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone.bg}`}>
                    <Icon className={`h-4 w-4 ${tone.fg}`} />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {kpi.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--border-default)] bg-[var(--bg-inset)] px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)]">
            <Info className="h-3 w-3 text-[var(--text-secondary)]" />
          </span>
          <p className="text-xs text-[var(--text-secondary)]">
            Your dashboard KPIs populate after your first live test call and recovery follow-ups run.
          </p>
        </div>
        <div className="hidden sm:block">
          <Link
            href={ROUTES.DEMO}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
          >
            See a live demo →
          </Link>
        </div>
      </div>
    </div>
  );
}

