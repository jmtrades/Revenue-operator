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
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 disabled:opacity-60 disabled:cursor-not-allowed";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] shadow-sm shadow-black/40",
    secondary:
      "border border-[var(--border-hover)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-hover)]",
    ghost:
      "text-[var(--text-secondary)] bg-transparent hover:bg-[var(--bg-hover)]",
    danger:
      "bg-[var(--accent-danger)] text-white hover:bg-red-500 shadow-sm shadow-black/40",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
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

