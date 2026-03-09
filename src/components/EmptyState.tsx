"use client";

import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-5 text-zinc-400">
        {icon}
      </div>
      <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] text-center max-w-md mb-6">{description}</p>
      {actions != null && <div className="flex items-center gap-3 flex-wrap justify-center">{actions}</div>}
    </div>
  );
}
