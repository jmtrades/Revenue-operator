"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlertTriangle } from "lucide-react";

type ErrorEntry = {
  id: string;
  message: string;
  error_type: string | null;
  metadata: { page_url?: string | null } | null;
  created_at: string;
};

export default function AppSettingsErrorsPage() {
  const t = useTranslations("settings");
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
      .catch((err) => { /* silenced */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[700px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: t("title"), href: "/app/settings" }, { label: t("errorsPage.title") }]} />
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("errorsPage.title")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{t("errorsPage.description")}</p>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("errorsPage.loading")}</p>
      ) : (
        <>
          {Object.keys(grouped).length > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              {Object.entries(grouped).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {type}: {count}
                </span>
              ))}
            </div>
          )}
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("errorsPage.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={e.message}>
                    {e.message}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    {e.error_type && (
                      <span className="rounded border border-[var(--border-default)] px-1.5 py-0.5">{e.error_type}</span>
                    )}
                    {e.metadata?.page_url && (
                      <span className="truncate max-w-[200px]" title={e.metadata.page_url}>
                        {e.metadata.page_url}
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
        <Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{t("errorsPage.backToSettings")}</Link>
      </p>
    </div>
  );
}
