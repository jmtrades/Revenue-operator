"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items || items.length === 0) return null;
  return (
    <nav
      className="mb-4 flex items-center gap-1 text-xs text-[var(--text-secondary)]"
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content = item.href && !isLast ? (
          <Link
            href={item.href}
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            {item.label}
          </Link>
        ) : (
          <span
            className={isLast ? "text-[var(--text-primary)]" : undefined}
            aria-current={isLast ? "page" : undefined}
          >
            {item.label}
          </span>
        );
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3 text-[var(--text-tertiary)]" />}
            {content}
          </span>
        );
      })}
    </nav>
  );
}

