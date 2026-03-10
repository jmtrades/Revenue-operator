"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "lead"
  | "appointment"
  | "urgent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ variant = "neutral", dot = false, className, children, ...rest }: BadgeProps) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";

  const variants: Record<BadgeVariant, string> = {
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    warning: "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] border border-[var(--accent-warning)]/30",
    error: "bg-red-500/15 text-red-400 border border-red-500/25",
    info: "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30",
    neutral: "bg-zinc-700/40 text-zinc-300 border border-zinc-600",
    lead: "bg-[var(--card-lead)]/15 text-[var(--card-lead)] border border-[var(--card-lead)]/30",
    appointment:
      "bg-[var(--card-appointment)]/15 text-[var(--card-appointment)] border border-[var(--card-appointment)]/30",
    urgent:
      "bg-[var(--card-emergency)]/15 text-[var(--card-emergency)] border border-[var(--card-emergency)]/30",
  };

  return (
    <span className={cn(base, variants[variant], className)} {...rest}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

