"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SkeletonVariant = "text" | "heading" | "circle" | "card" | "stat" | "row";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

export function Skeleton({ className, variant = "text", ...rest }: SkeletonProps) {
  const base = "relative overflow-hidden bg-[var(--border-default)]";

  const variantClasses: Record<SkeletonVariant, string> = {
    text: "h-4 w-full rounded-md",
    heading: "h-6 w-48 rounded-md",
    circle: "h-10 w-10 rounded-full",
    card: "h-32 w-full rounded-xl",
    stat: "h-24 w-full rounded-xl",
    row: "h-10 w-full rounded-lg",
  };

  return (
    <div
      className={cn(base, "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_1.2s_infinite]", variantClasses[variant], className)}
      aria-hidden
      {...rest}
    />
  );
}

// keyframes are defined in globals.css via @keyframes shimmer if needed

