"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type ActivityEntry = {
  id: string;
  action_type: string;
  details: Record<string, unknown>;
  recorded_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  settings_update: "Settings updated",
  settings_business_update: "Business settings updated",
};

export default function AppSettingsActivityPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    fetch("/api/workspace/activity", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries?: ActivityEntry[] }) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: "Settings", href: "/app/settings" }, { label: "Activity log" }]} />
      <h1 className="text-lg font-semibold text-white mb-2">Activity log</h1>
      <p className="text-sm text-zinc-500 mb-6">Recent settings and workspace changes.</p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No activity yet. Changes to business profile and settings will appear here.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border-default)] last:border-0">
              <div>
                <p className="text-sm font-medium text-white">
                  {ACTION_LABELS[e.action_type] ?? e.action_type.replace(/_/g, " ")}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {new Date(e.recorded_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6">
        <Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link>
      </p>
    </div>
  );
}
