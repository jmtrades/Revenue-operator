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
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight tracking-wide select-none";

  const variants: Record<BadgeVariant, string> = {
    success: "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20",
    warning: "bg-[var(--accent-warning)]/12 text-[var(--accent-warning)] border border-[var(--accent-warning)]/20",
    error: "bg-red-500/12 text-red-400 border border-red-500/20",
    info: "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20",
    neutral: "bg-[var(--bg-inset)]/50 text-[var(--text-secondary)] border border-[var(--border-default)]",
    lead: "bg-[var(--card-lead)]/12 text-[var(--card-lead)] border border-[var(--card-lead)]/20",
    appointment:
      "bg-[var(--card-appointment)]/12 text-[var(--card-appointment)] border border-[var(--card-appointment)]/20",
    urgent:
      "bg-[var(--card-emergency)]/12 text-[var(--card-emergency)] border border-[var(--card-emergency)]/20",
  };

  return (
    <span className={cn(base, variants[variant], className)} {...rest}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

