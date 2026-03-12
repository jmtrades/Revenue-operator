"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArrowLeft, RefreshCw, Inbox, Send } from "lucide-react";

type SyncLogEntry = {
  id: string;
  workspace_id: string;
  provider: string;
  direction: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string | null;
  payload_snapshot: Record<string, unknown>;
  created_at: string;
};

const PROVIDER_NAMES: Record<string, string> = {
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  zoho_crm: "Zoho CRM",
  pipedrive: "Pipedrive",
  gohighlevel: "GoHighLevel",
  google_contacts: "Google Contacts",
  microsoft_365: "Microsoft 365",
};

export default function IntegrationsSyncLogPage() {
  const [entries, setEntries] = useState<SyncLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("");
  const [direction, setDirection] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const fetchLog = useCallback((off: number) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
    if (provider) params.set("provider", provider);
    if (direction) params.set("direction", direction);
    fetch(`/api/integrations/sync-log?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [], total: 0 }))
      .then((data: { entries?: SyncLogEntry[]; total?: number }) => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [provider, direction]);

  useEffect(() => {
    const id = setTimeout(() => {
      setOffset(0);
      fetchLog(0);
    }, 0);
    return () => clearTimeout(id);
  }, [fetchLog]);

  const loadMore = () => {
    const next = offset + limit;
    setOffset(next);
    fetch(`/api/integrations/sync-log?limit=${limit}&offset=${next}${provider ? `&provider=${provider}` : ""}${direction ? `&direction=${direction}` : ""}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries?: SyncLogEntry[] }) => {
        setEntries((prev) => [...prev, ...(data.entries ?? [])]);
      });
  };

  return (
    <div className="max-w-[800px] mx-auto p-4 md:p-6">
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/app/settings" },
          { label: "Integrations", href: "/app/settings/integrations" },
          { label: "Sync log" },
        ]}
      />
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mt-2 mb-1">
        Sync log
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Audit trail of CRM sync events: outbound (Recall Touch → CRM) and inbound (CRM → Recall Touch).
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
        >
          <option value="">All providers</option>
          {Object.entries(PROVIDER_NAMES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
        >
          <option value="">All directions</option>
          <option value="outbound">Outbound</option>
          <option value="inbound">Inbound</option>
        </select>
        <button
          type="button"
          onClick={() => fetchLog(0)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-zinc-300 hover:border-zinc-500"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading && entries.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center text-zinc-500">
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center text-zinc-500">
          No sync events yet. Sync activity will appear here when you connect a CRM and push or receive updates.
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
          <ul className="divide-y divide-[var(--border-default)]">
            {entries.map((e) => (
              <li key={e.id} className="p-4 flex flex-wrap items-start gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  {e.direction === "inbound" ? (
                    <Inbox className="w-4 h-4 text-zinc-500" aria-hidden />
                  ) : (
                    <Send className="w-4 h-4 text-zinc-500" aria-hidden />
                  )}
                  <span className="text-[11px] font-medium text-zinc-500 uppercase">
                    {e.direction}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-primary)]">
                    {PROVIDER_NAMES[e.provider] ?? e.provider} · {e.action}
                    {e.summary ? ` — ${e.summary}` : ""}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {new Date(e.created_at).toLocaleString()}
                    {e.entity_id ? ` · ${e.entity_type} ${e.entity_id.slice(0, 8)}…` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {entries.length < total && (
            <div className="p-4 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={loadMore}
                className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
              >
                Load more ({total - entries.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-6">
        <Link
          href="/app/settings/integrations"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Integrations
        </Link>
      </p>
    </div>
  );
}
