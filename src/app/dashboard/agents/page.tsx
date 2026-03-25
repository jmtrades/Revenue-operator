"use client";

import { useCallback, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { Plus, X } from "lucide-react";

type Agent = { id: string; name: string; purpose: string; is_active: boolean; created_at: string };

export default function AgentsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("inbound");
  const [creating, setCreating] = useState(false);

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
      <div className="flex items-center justify-between mb-6">
        <PageHeader title={t("pages.agents.title")} subtitle={t("pages.agents.subtitle")} />
        {agents.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm font-semibold px-4 py-2 hover:bg-[var(--bg-inset)] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Agent
          </button>
        )}
      </div>
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
          <button type="button" onClick={() => setShowCreate(true)} className="inline-block text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{t("empty.createFirstAgent")}</button>
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

      {/* Create Agent Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Create New Agent</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Agent Name *</span>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="e.g., Sarah — Inbound" />
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Purpose</span>
                <select value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="inbound">Inbound Call Handling</option>
                  <option value="outbound">Outbound Campaigns</option>
                  <option value="follow_up">Follow-up Sequences</option>
                  <option value="triage">Triage & Routing</option>
                  <option value="booking">Booking & Scheduling</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                disabled={creating || !newName.trim()}
                onClick={async () => {
                  if (!workspaceId || !newName.trim()) return;
                  setCreating(true);
                  try {
                    const res = await fetch("/api/agents", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ workspace_id: workspaceId, name: newName.trim(), purpose: newPurpose }),
                    });
                    if (res.ok) {
                      setShowCreate(false);
                      setNewName("");
                      setNewPurpose("inbound");
                      load();
                    }
                  } finally {
                    setCreating(false);
                  }
                }}
                className="flex-1 rounded-xl bg-emerald-500 text-black font-semibold py-2.5 text-sm hover:bg-emerald-400 transition-colors disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create Agent"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
