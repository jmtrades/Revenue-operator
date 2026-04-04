"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";

interface LogEntry {
  at: string;
  subject: string;
  event: string;
}

type Filter = "all" | "outcomes" | "authority";

export default function RecordPage() {
  const t = useTranslations("dashboard");
  const tr = useTranslations("dashboard.recordPage");
  const { workspaceId } = useWorkspace();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/operational/record-log?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d: { entries?: LogEntry[] }) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{tr("selectWorkspace")}</p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("loadingMessage")}</p>
      </Shell>
    );
  }

  const filtered =
    filter === "all"
      ? entries
      : filter === "outcomes"
        ? entries.filter((e) => e.subject === "Outcome")
        : entries.filter((e) => e.subject === "Authority");

  return (
    <Shell>
      <div className="max-w-2xl">
        <div className="flex gap-6 pb-4 mb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-sm focus-ring py-1"
            style={{ color: filter === "all" ? "var(--text-primary)" : "var(--text-muted)", fontWeight: filter === "all" ? 500 : 400 }}
          >
            {tr("filterAll")}
          </button>
          <button
            type="button"
            onClick={() => setFilter("outcomes")}
            className="text-sm focus-ring py-1"
            style={{ color: filter === "outcomes" ? "var(--text-primary)" : "var(--text-muted)", fontWeight: filter === "outcomes" ? 500 : 400 }}
          >
            {tr("filterOutcomes")}
          </button>
          <button
            type="button"
            onClick={() => setFilter("authority")}
            className="text-sm focus-ring py-1"
            style={{ color: filter === "authority" ? "var(--text-primary)" : "var(--text-muted)", fontWeight: filter === "authority" ? 500 : 400 }}
          >
            {tr("filterAuthority")}
          </button>
        </div>
        <div className="space-y-0">
          {filtered.length === 0 ? (
            <div className="py-12">
              <p className="text-sm mb-2" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>
                {entries.length === 0 ? tr("emptyWhatHappened") : tr("emptyNoEntriesInView")}
              </p>
              {entries.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {tr("connectSourceHint")}
                </p>
              )}
            </div>
          ) : (
            filtered.map((e, i) => (
              <div
                key={i}
                className="flex gap-6 py-4 border-b"
                style={{ borderColor: "var(--border)", lineHeight: 1.6 }}
              >
                <span className="text-sm shrink-0 w-36" style={{ color: "var(--text-muted)" }}>
                  {new Date(e.at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className="text-sm shrink-0 w-24" style={{ color: "var(--text-secondary)" }}>
                  {e.subject}
                </span>
                <p className="text-sm flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
                  {e.event}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}
