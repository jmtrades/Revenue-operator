"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

type ActionLink =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  footnote?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  footnote,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-8 py-16 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-[var(--text-tertiary)]">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">{description}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
        </div>
      )}
      {footnote && (
        <p className="mt-4 text-xs text-[var(--text-tertiary)] max-w-md">{footnote}</p>
      )}
    </div>
  );
}

