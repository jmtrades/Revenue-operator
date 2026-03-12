"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlertTriangle } from "lucide-react";

type ErrorEntry = {
  id: string;
  error_message: string;
  error_type: string | null;
  page_url: string | null;
  created_at: string;
};

export default function AppSettingsErrorsPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [grouped, setGrouped] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/workspace/errors", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [], grouped: {} }))
      .then((data: { entries?: ErrorEntry[]; grouped?: Record<string, number> }) => {
        setEntries(data.entries ?? []);
        setGrouped(data.grouped ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[700px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: "Settings", href: "/app/settings" }, { label: "Error reports" }]} />
      <h1 className="text-lg font-semibold text-white mb-2">Error reports</h1>
      <p className="text-sm text-zinc-500 mb-6">Recent client errors from this workspace. Use this to spot recurring issues.</p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          {Object.keys(grouped).length > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              {Object.entries(grouped).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {type}: {count}
                </span>
              ))}
            </div>
          )}
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500">No error reports yet.</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
                >
                  <p className="text-sm font-medium text-white truncate" title={e.error_message}>
                    {e.error_message}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                    {e.error_type && (
                      <span className="rounded border border-zinc-700 px-1.5 py-0.5">{e.error_type}</span>
                    )}
                    {e.page_url && (
                      <span className="truncate max-w-[200px]" title={e.page_url}>
                        {e.page_url}
                      </span>
                    )}
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="mt-6">
        <Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link>
      </p>
    </div>
  );
}
