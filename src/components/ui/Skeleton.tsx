"use client";

import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  lines?: number;
  delay?: number;
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  lines = 1,
  delay = 0,
}: SkeletonProps) {
  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : undefined;
  const baseClasses =
    "relative overflow-hidden bg-[var(--bg-hover)] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent";

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              "h-4 rounded-md",
              i === lines - 1 ? "w-3/4" : "w-full",
            )}
            style={{ width: i < lines - 1 ? width : undefined, height, ...delayStyle }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-xl",
        variant === "card" && "rounded-2xl",
        variant === "text" && "rounded-md h-4",
        className,
      )}
      style={{ width, height, ...delayStyle }}
      aria-hidden
    />
  );
}

