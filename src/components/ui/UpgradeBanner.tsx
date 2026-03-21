"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

type UpgradeBannerProps = {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
};

export function UpgradeBanner({ title, description, ctaLabel, href }: UpgradeBannerProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-black text-xs font-semibold px-4 py-2 hover:opacity-90 transition-colors whitespace-nowrap"
      >
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

