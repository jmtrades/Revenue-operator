"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, PhoneCall, CalendarCheck, Sparkles } from "lucide-react";
import { ROUTES } from "@/lib/constants";

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

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

  const recovered = 12840;

  const kpis: HeroKpi[] = [
    {
      label: "Calls answered",
      value: "127",
      icon: PhoneCall,
      tone: "lead",
    },
    {
      label: "Appointments booked",
      value: "34",
      icon: CalendarCheck,
      tone: "appointment",
    },
    {
      label: "Follow-ups executed",
      value: "412",
      icon: Sparkles,
      tone: "followup",
    },
  ];

  const toneStyles: Record<HeroKpi["tone"], { border: string; fg: string; bg: string }> = {
    lead: { border: "border-blue-500/60", fg: "text-blue-400", bg: "bg-blue-500/10" },
    appointment: { border: "border-green-500/60", fg: "text-green-400", bg: "bg-green-500/10" },
    followup: { border: "border-amber-500/60", fg: "text-amber-300", bg: "bg-amber-500/10" },
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">
              Revenue recovered this month
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="text-3xl md:text-4xl font-bold text-white tabular-nums">
                {formatCurrency(recovered)}
              </p>
              <span className="inline-flex items-center gap-1 text-sm text-emerald-300">
                <ArrowUpRight className="h-4 w-4" />
                Live
              </span>
            </div>
            {!prefersReducedMotion && <div className="mt-3 h-1.5 w-28 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full w-1/2 bg-white/[0.18] animate-pulse" />
            </div>}
          </div>
          <div className="hidden sm:block">
            <Link
              href="/app/analytics"
              className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
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
                className={`rounded-xl border ${tone.border} bg-white/[0.03] p-4`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/50">{kpi.label}</p>
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone.bg}`}>
                    <Icon className={`h-4 w-4 ${tone.fg}`} />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-white tabular-nums">
                  {kpi.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/[0.08] bg-black/20 px-6 py-4 flex items-center justify-between gap-4">
        <p className="text-xs text-white/45">
          See what your AI did while you were busy.
        </p>
        <Link
          href={ROUTES.DEMO}
          className="text-xs font-semibold text-white hover:text-zinc-100 transition-colors"
        >
          Watch it work →
        </Link>
      </div>
    </div>
  );
}

