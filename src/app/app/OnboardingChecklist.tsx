"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";
import { safeGetItem, safeRemoveItem } from "@/lib/client/safe-storage";

const ITEM_KEYS = [
  { key: "business", href: "/activate" },
  { key: "agent", href: "/app/agents" },
  { key: "services", href: "/activate" },
  { key: "phone", href: "/app/settings/phone" },
  { key: "test_call", href: "/activate" },
  { key: "first_call", href: "/app/dashboard" },
  { key: "calendar", href: "/app/settings/integrations" },
  { key: "team", href: "/app/settings/team" },
] as const;

function getProgress(): { completed: number; done: Set<string> } {
  if (typeof window === "undefined") return { completed: 0, done: new Set() };
  const key = "rt_onboarding_checklist";
  try {
    const raw = safeGetItem(key);
    const done = raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    return { completed: done.size, done };
  } catch {
    safeRemoveItem(key);
    return { completed: 0, done: new Set() };
  }
}

export function OnboardingChecklist({
  initialItems,
}: {
  initialItems?: Array<{ key: string; completed: boolean }>;
}) {
  const t = useTranslations("app.onboardingChecklist");
  const items = useMemo(() => ITEM_KEYS.map(({ key, href }) => ({ key, label: t(`item.${key}`), href })), [t]);
  const [progress, setProgress] = useState(() => {
    if (Array.isArray(initialItems) && initialItems.length > 0) {
      const done = new Set(initialItems.filter((item) => item.completed).map((item) => item.key));
      return { completed: done.size, done };
    }
    return { completed: 0, done: new Set<string>() };
  });

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceMeCached()
      .then((data: { progress?: { items?: Array<{ key: string; completed: boolean }> } } | null) => {
        if (cancelled) return;
        const items = data?.progress?.items ?? [];
        if (items.length > 0) {
          const done = new Set(items.filter((item) => item.completed).map((item) => item.key));
          setProgress({ completed: done.size, done });
          return;
        }
        setProgress(getProgress());
      })
      .catch(() => setProgress(getProgress()));
    return () => {
      cancelled = true;
    };
  }, []);

  const total = items.length;
  const pct = total ? Math.round((progress.completed / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
      <p className="text-[10px] font-medium text-[var(--text-tertiary)] mb-1.5">
        {t("complete", { completed: progress.completed, total })}
      </p>
      <div className="h-1 rounded-full bg-[var(--border-default)] overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1">
        {items.slice(0, 4).map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-[10px]">
            {progress.done.has(item.key) ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)]/10">
                <Check className="h-4 w-4 text-[var(--accent-primary)]" />
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-inset)]">
                <Circle className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              </div>
            )}
            <Link href={item.href} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] truncate">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      {progress.completed < total && (
        <p className="text-[9px] text-[var(--text-secondary)] mt-1">{t("finishCta")}</p>
      )}
    </div>
  );
}
