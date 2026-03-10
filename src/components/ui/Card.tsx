"use client";

import type { HTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "elevated" | "interactive";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function Card({ children, className, variant = "default", onClick, ...rest }: CardProps) {
  const baseClasses =
    "rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 transition-all duration-200";

  const variantClasses: Record<CardVariant, string> = {
    default: "",
    elevated: "shadow-md shadow-black/40",
    interactive: "cursor-pointer hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-black/40",
  };

  const Comp = variant === "interactive" ? motion.div : "div";

  return (
    <Comp
      className={cn(baseClasses, variantClasses[variant], className)}
      {...(variant === "interactive" ? { whileHover: { scale: 1.01 } } : {})}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 text-sm font-medium text-[var(--text-secondary)]", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

