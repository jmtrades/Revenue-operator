"use client";

import { useCallback, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

type Agent = { id: string; name: string; purpose: string; is_active: boolean; created_at: string };

export default function AgentsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    fetchWithFallback<{ agents: Agent[] }>(`/api/agents?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((res) => {
        if (res.data?.agents) setAgents(res.data.agents);
        else setAgents([]);
        if (res.error) setError(res.error);
      })
      .catch(() => setError(t("empty.loadAgentsError")))
      .finally(() => setLoading(false));
  }, [workspaceId, t]);

  useEffect(() => {
    if (!workspaceId) {
      setAgents([]);
      setLoading(false);
      setError(null);
      return;
    }
    load();
  }, [workspaceId, load]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.agents.title")} subtitle={t("pages.agents.subtitleShort")} />
        <EmptyState icon="watch" title={t("empty.selectContext")} subtitle={t("empty.agentsAppearHere")} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title={t("pages.agents.title")} subtitle={t("pages.agents.subtitle")} />
      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <button type="button" onClick={load} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>{t("loadError.retry")}</button>
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border py-12 px-6 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{t("empty.noAgentsYet")}</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>{t("empty.noAgentsYetHint")}</p>
          <Link href="/dashboard/onboarding" className="inline-block text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{t("empty.createFirstAgent")}</Link>
        </div>
      ) : (
        <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          {agents.map((a) => (
            <li key={a.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <Link href={`/dashboard/agents/${a.id}`} className="block px-4 py-3 hover:opacity-90" style={{ color: "var(--text-primary)" }}>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.purpose} · {a.is_active ? t("agentDetail.activeLabel") : t("agentDetail.paused")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
