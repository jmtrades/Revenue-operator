"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, Building2, Clock, Star, Globe, Shield } from "lucide-react";

/* ─── Animated Number Counter ─── */
function AnimatedNumber({ target, duration = 2000, prefix = "", suffix = "", decimals = 0 }: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * target * Math.pow(10, decimals)) / Math.pow(10, decimals));
      if (progress < 1) requestAnimationFrame(step);
      else setCurrent(target);
    };
    requestAnimationFrame(step);
  }, [started, target, duration, decimals]);

  const formatted = current >= 1000000
    ? `${(current / 1000000).toFixed(1)}M`
    : current >= 1000
      ? `${(current / 1000).toFixed(current >= 10000 ? 0 : 1)}K`
      : decimals > 0
        ? current.toFixed(decimals)
        : current.toLocaleString();

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}

/* ─── Stats Grid ─── */
const STATS = [
  {
    icon: Building2,
    value: 12400,
    prefix: "",
    suffix: "+",
    label: "Businesses Powered",
    sublabel: "Across 200+ industries",
    color: "emerald",
    raw: true,
  },
  {
    icon: Phone,
    value: 8.7,
    prefix: "",
    suffix: "M+",
    label: "Calls Handled",
    sublabel: "This quarter alone",
    color: "blue",
    decimals: 1,
    raw: true,
  },
  {
    icon: Star,
    value: 4.9,
    prefix: "",
    suffix: "",
    label: "Customer Rating",
    sublabel: "From 3,200+ verified reviews",
    color: "amber",
    decimals: 1,
    raw: true,
  },
  {
    icon: Clock,
    value: 99.97,
    prefix: "",
    suffix: "%",
    label: "Uptime SLA",
    sublabel: "Enterprise-grade reliability",
    color: "purple",
    decimals: 2,
    raw: true,
  },
  {
    icon: Globe,
    value: 47,
    prefix: "",
    suffix: "",
    label: "States Covered",
    sublabel: "Plus 12 countries",
    color: "cyan",
    raw: true,
  },
  {
    icon: Shield,
    value: 0.8,
    prefix: "<",
    suffix: "s",
    label: "Avg Response Time",
    sublabel: "Faster than any human",
    color: "rose",
    decimals: 1,
    raw: true,
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "rgba(16,185,129,0.1)", text: "rgb(52,211,153)", border: "rgba(16,185,129,0.2)" },
  blue: { bg: "rgba(59,130,246,0.1)", text: "rgb(96,165,250)", border: "rgba(59,130,246,0.2)" },
  amber: { bg: "rgba(245,158,11,0.1)", text: "rgb(252,211,77)", border: "rgba(245,158,11,0.2)" },
  purple: { bg: "rgba(139,92,246,0.1)", text: "rgb(167,139,250)", border: "rgba(139,92,246,0.2)" },
  cyan: { bg: "rgba(6,182,212,0.1)", text: "rgb(103,232,249)", border: "rgba(6,182,212,0.2)" },
  rose: { bg: "rgba(244,63,94,0.1)", text: "rgb(251,113,133)", border: "rgba(244,63,94,0.2)" },
};

export function AnimatedStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {STATS.map((stat) => {
        const c = COLOR_MAP[stat.color];
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="text-center py-5 px-3 rounded-2xl border transition-[border-color,box-shadow,transform] hover:scale-[1.02]"
            style={{ background: c.bg, borderColor: c.border }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <Icon className="w-5 h-5" style={{ color: c.text }} />
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: c.text }}>
              {stat.raw ? (
                <span className="tabular-nums">
                  {stat.prefix}{typeof stat.value === "number" && stat.value >= 1000 && !stat.suffix?.includes("M") && !stat.suffix?.includes("s") ? stat.value.toLocaleString() : stat.value}{stat.suffix}
                </span>
              ) : (
                <AnimatedNumber
                  target={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals ?? 0}
                />
              )}
            </p>
            <p className="text-xs font-semibold text-white/80">{stat.label}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{stat.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
