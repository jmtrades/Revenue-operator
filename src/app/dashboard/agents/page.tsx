"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

type Agent = { id: string; name: string; purpose: string; is_active: boolean; created_at: string };

export default function AgentsPage() {
  const { workspaceId } = useWorkspace();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    fetchWithFallback<{ agents: Agent[] }>(`/api/agents?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((res) => {
        if (res.data?.agents) setAgents(res.data.agents);
        else setAgents([]);
        if (res.error) setError(res.error);
      })
      .catch(() => setError("Could not load agents."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!workspaceId) {
      setAgents([]);
      setLoading(false);
      setError(null);
      return;
    }
    load();
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Agents" subtitle="AI phone agents." />
        <EmptyState icon="watch" title="Select a context." subtitle="Agents appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Agents" subtitle="Configure AI phone agents." />
      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <button type="button" onClick={load} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>Retry</button>
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No agents yet.</p>
          <Link href="/onboarding" className="inline-block mt-4 text-sm" style={{ color: "var(--accent)" }}>Onboarding</Link>
        </div>
      ) : (
        <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          {agents.map((a) => (
            <li key={a.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <Link href={`/dashboard/agents/${a.id}`} className="block px-4 py-3 hover:opacity-90" style={{ color: "var(--text-primary)" }}>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.purpose} · {a.is_active ? "Active" : "Paused"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
