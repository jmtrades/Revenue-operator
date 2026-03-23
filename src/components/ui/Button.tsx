"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  asChild,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition-[background-color,box-shadow,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] rounded-[var(--radius-btn)]",
    secondary:
      "border border-[var(--border-default)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] rounded-[var(--radius-btn)]",
    ghost:
      "text-[var(--text-secondary)] bg-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[var(--radius-btn)]",
    danger:
      "bg-[var(--accent-danger)] text-white hover:bg-red-500 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] rounded-[var(--radius-btn)]",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs h-8 tracking-wide",
    md: "px-4 py-2 text-sm h-9",
    lg: "px-5 py-2.5 text-[15px] h-10",
  };

  const Comp = (asChild ? "span" : "button") as "span" | "button";
  const isDisabled = disabled || loading;

  return (
    <Comp
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={isDisabled}
      {...rest}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {Icon && !loading && <Icon className="h-4 w-4" aria-hidden="true" />}
      <span>{children}</span>
    </Comp>
  );
}

