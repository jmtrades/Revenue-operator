"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  sparklineData?: number[];
  className?: string;
}

export function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  trend,
  sparklineData,
  className,
}: StatCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.6,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [count, value]);

  const TrendIcon = trend && trend > 0 ? ArrowUpRight : ArrowDownRight;
  const trendColor =
    trend == null
      ? "text-[var(--text-tertiary)]"
      : trend > 0
        ? "text-emerald-400"
        : trend < 0
          ? "text-red-400"
          : "text-[var(--text-tertiary)]";

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex flex-col justify-between gap-3 transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        className,
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          {label}
        </p>
        <motion.p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] leading-tight tabular-nums">
          {prefix}
          <motion.span>{rounded}</motion.span>
          {suffix}
        </motion.p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div
          className={cn(
            "flex items-center gap-1 text-xs transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
            trendColor
          )}
        >
          {trend != null && (
            <>
              <TrendIcon className="h-3 w-3" />
              <span className="tabular-nums">{Math.abs(trend).toFixed(1)}%</span>
            </>
          )}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} />
        )}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="text-[var(--accent-primary)]"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

