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
    "rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-card)] p-6";

  const variantClasses: Record<CardVariant, string> = {
    default: "shadow-[var(--shadow-xs)]",
    elevated: "shadow-[var(--shadow-md)]",
    interactive:
      "cursor-pointer shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out-expo)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:ring-offset-2",
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      onClick={onClick}
      onKeyDown={variant === "interactive" && onClick ? handleKeyDown : undefined}
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
    <div className={cn("mb-4 text-[13px] font-semibold text-[var(--text-secondary)] tracking-wide uppercase", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
