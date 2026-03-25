"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";

type Sequence = { id: string; name: string; trigger_type?: string; is_active?: boolean };

export default function AppFollowUpsPage() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations("followUps");
  const [tab, setTab] = useState<"templates" | "active">("templates");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (active) { setLoading(true); setFetchError(null); }
    });
    fetch(`/api/sequences?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load sequences (${r.status})`);
        return r.json();
      })
      .then((d: { sequences?: Sequence[] }) => {
        if (active) setSequences(d.sequences ?? []);
      })
      .catch((err) => {
        if (active) {
          setSequences([]);
          setFetchError(err instanceof Error ? err.message : t("loadError"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspaceId]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("title")}</h1>
        <Link href="/app/follow-ups/create">
          <Button variant="primary" size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            {t("create")}
          </Button>
        </Link>
      </div>
      <div className="flex gap-2 mb-6 border-b border-[var(--border-default)] pb-2">
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${tab === "templates" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
        >
          {t("tabs.templates")}
        </button>
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${tab === "active" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
        >
          {t("tabs.active")}
        </button>
      </div>
      {loading ? (
        <div className="animate-pulse h-40 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]" />
      ) : fetchError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <p className="text-sm text-red-300">{fetchError}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); setFetchError(null); window.location.reload(); }}
            className="mt-3 px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
          >
            {t("retry")}
          </button>
        </div>
      ) : tab === "templates" ? (
        sequences.length === 0 ? (
          <EmptyState
            title={t("empty.templatesTitle")}
            description={t("empty.templatesBody")}
            primaryAction={{ label: t("create"), href: "/app/follow-ups/create" }}
          />
        ) : (
          <ul className="space-y-3">
            {sequences.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{s.trigger_type ?? "manual"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" aria-label="Pause">
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Resume">
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <EmptyState
          title={t("empty.activeTitle")}
          description={t("empty.activeBody")}
          primaryAction={{ label: t("create"), href: "/app/follow-ups/create" }}
        />
      )}
    </div>
  );
}
