"use client";

import type { HTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "elevated" | "interactive";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function Card({ children, className, variant = "default", onClick, ...rest }: CardProps) {
  const baseClasses =
    "rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-card)] p-6 transition-[border-color,box-shadow,transform] duration-200";

  const variantClasses: Record<CardVariant, string> = {
    default: "shadow-[var(--shadow-xs)]",
    elevated: "shadow-[var(--shadow-md)]",
    interactive:
      "cursor-pointer shadow-[var(--shadow-xs)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:ring-offset-2",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      onClick={onClick}
      role={variant === "interactive" && onClick ? "button" : undefined}
      tabIndex={variant === "interactive" && onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 text-[13px] font-semibold text-[var(--text-secondary)] tracking-wide", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
