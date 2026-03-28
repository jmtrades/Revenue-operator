"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PhoneCall, CalendarCheck, Sparkles, TrendingUp } from "lucide-react";
import { ROUTES } from "@/lib/constants";

type HeroKpi = {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const BASE_KPIS: HeroKpi[] = [
  { label: "Calls answered", value: 847, icon: PhoneCall, color: "text-blue-500" },
  { label: "Appointments booked", value: 312, icon: CalendarCheck, color: "text-emerald-500" },
  { label: "Follow-ups executed", value: 1243, icon: Sparkles, color: "text-amber-500" },
];

function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{count.toLocaleString()}</>;
}

export function HeroRevenueWidget() {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Revenue Recovered This Month
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                $<AnimatedCounter target={48720} />
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                <TrendingUp className="h-3 w-3" />
                +23%
              </span>
            </div>
          </div>
          <Link
            href={ROUTES.START}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors hidden sm:block"
          >
            Get started →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {BASE_KPIS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-[var(--text-secondary)] leading-tight">{kpi.label}</p>
                  <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
                <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                  <AnimatedCounter target={kpi.value} />
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--border-default)] bg-[var(--bg-inset)] px-5 py-2.5 flex items-center justify-between">
        <p className="text-[10px] text-[var(--text-tertiary)]">
          Sample dashboard — your data populates after first call
        </p>
        <Link
          href={ROUTES.DEMO}
          className="text-[10px] font-semibold text-[var(--accent-primary)] hover:underline"
        >
          See demo →
        </Link>
      </div>
    </div>
  );
}
