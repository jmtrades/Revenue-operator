"use client";

import type { LucideIcon } from "lucide-react";
import { Watch, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

type ActionLink =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

const STRING_ICONS: Record<string, LucideIcon> = { watch: Watch, pulse: Clock };

interface EmptyStateProps {
  icon?: LucideIcon | keyof typeof STRING_ICONS;
  title: string;
  description?: string;
  /** @deprecated Use description */
  subtitle?: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  footnote?: string;
  className?: string;
  ariaLabel?: string;
}

export function EmptyState({
  icon: iconProp,
  title,
  description,
  subtitle,
  primaryAction,
  secondaryAction,
  footnote,
  className,
  ariaLabel,
}: EmptyStateProps) {
  const Icon =
    typeof iconProp === "string" ? STRING_ICONS[iconProp] ?? Watch : iconProp;
  const desc = description ?? subtitle;
  const finalAriaLabel = ariaLabel || title;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1] as const,
      },
    },
  };

  return (
    <motion.div
      role="region"
      aria-label={finalAriaLabel}
      className={cn(
        "flex flex-col items-center justify-center text-center px-8 py-20 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-card)]",
        className,
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Icon && (
        <motion.div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/[0.08] ring-1 ring-[var(--accent-primary)]/15"
          aria-hidden="true"
          variants={itemVariants}
        >
          <Icon className="h-7 w-7 text-[var(--accent-primary)]" strokeWidth={1.5} />
        </motion.div>
      )}
      <motion.h3
        className="text-base font-semibold text-[var(--text-primary)] tracking-tight"
        variants={itemVariants}
      >
        {title}
      </motion.h3>
      {desc && (
        <motion.p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)] leading-relaxed" variants={itemVariants}>
          {desc}
        </motion.p>
      )}
      {(primaryAction || secondaryAction) && (
        <motion.div className="mt-7 flex flex-wrap items-center justify-center gap-3" variants={itemVariants}>
          {primaryAction && (
            <Button
              variant="primary"
              size="md"
              onClick={primaryAction.onClick}
              asChild={Boolean(primaryAction.href)}
            >
              {primaryAction.href ? <a href={primaryAction.href}>{primaryAction.label}</a> : primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size="md"
              onClick={secondaryAction.onClick}
              asChild={Boolean(secondaryAction.href)}
            >
              {secondaryAction.href ? <a href={secondaryAction.href}>{secondaryAction.label}</a> : secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
      {footnote && (
        <motion.p className="mt-5 text-xs text-[var(--text-tertiary)] max-w-sm" variants={itemVariants}>
          {footnote}
        </motion.p>
      )}
    </motion.div>
  );
}

