"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, X, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";

type CheckItem = {
  key: string;
  label: string;
  passed: boolean;
  fixUrl: string;
  fixLabel: string;
};

export function ReadinessChecklist() {
  const t = useTranslations("readinessChecklist");
  const { workspaceId } = useWorkspace();
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/readiness?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.checks) setItems(data.checks);
      })
      .catch((e: unknown) => { console.warn("[ReadinessChecklist] fetch failed:", e instanceof Error ? e.message : String(e)); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="skeleton-shimmer h-48 rounded-2xl bg-[var(--bg-surface)]" />;

  const passed = items.filter((i) => i.passed).length;
  const total = items.length;
  const allPassed = passed === total;

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("title")}</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("checksPassed", { passed, total })}</p>
        </div>
        <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${allPassed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
          {allPassed ? t("ready") : t("actionNeeded")}
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2 border-b border-[var(--border-default)] last:border-0">
            <div className="flex items-center gap-2">
              {item.passed ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm ${item.passed ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)] font-medium"}`}>
                {item.label}
              </span>
            </div>
            {!item.passed && (
              <Link href={item.fixUrl} className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline">
                {item.fixLabel} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
