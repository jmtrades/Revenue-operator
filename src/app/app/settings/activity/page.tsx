"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useTranslations } from "next-intl";

type ActivityEntry = {
  id: string;
  action_type: string;
  details: Record<string, unknown>;
  recorded_at: string;
};

export default function AppSettingsActivityPage() {
  const tSettings = useTranslations("settings");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    fetch("/api/workspace/activity", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries?: ActivityEntry[] }) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const getActionLabel = (actionType: string) => {
    const key = `activity.actions.${actionType}`;
    const out = tSettings(key);
    return out !== key ? out : actionType.replace(/_/g, " ");
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: tSettings("integrations.breadcrumbSettings"), href: "/app/settings" }, { label: tSettings("activityLog") }]} />
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tSettings("activity.heading")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tSettings("activity.description")}</p>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{tSettings("activity.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{tSettings("activity.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border-default)] last:border-0">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {getActionLabel(e.action_type)}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {new Date(e.recorded_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6">
        <Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tSettings("activity.backToSettings")}</Link>
      </p>
    </div>
  );
}
