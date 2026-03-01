"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  total_contacts: number;
  called: number;
  answered: number;
  appointments_booked: number;
  created_at: string;
}

export default function CampaignsPage() {
  const { workspaceId } = useWorkspace();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    fetchWithFallback<{ campaigns: Campaign[] }>(
      `/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" }
    )
      .then((res) => {
        if (res.data?.campaigns) setCampaigns(res.data.campaigns);
        else setCampaigns([]);
        if (res.error) setError(res.error);
      })
      .catch(() => setError("Could not load campaigns."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!workspaceId) {
      setCampaigns([]);
      setLoading(false);
      setError(null);
      return;
    }
    load();
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Campaigns" subtitle="Outbound calling campaigns." />
        <EmptyState icon="watch" title="Select a context." subtitle="Campaigns appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Campaigns" subtitle="Outbound call campaigns." />
      <p className="mb-4">
        <Link href={`/dashboard/campaigns/new?workspace_id=${encodeURIComponent(workspaceId)}`} className="text-sm" style={{ color: "var(--accent)" }}>
          New campaign
        </Link>
      </p>
      {loading ? (
        <ListSkeleton rows={4} header />
      ) : error ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <button type="button" onClick={load} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>Retry</button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No campaigns yet.</p>
          <Link href={`/dashboard/campaigns/new?workspace_id=${encodeURIComponent(workspaceId)}`} className="inline-block mt-4 text-sm" style={{ color: "var(--accent)" }}>Create one</Link>
        </div>
      ) : (
        <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          {campaigns.map((c) => (
            <li key={c.id} className="border-b last:border-b-0 flex items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
              <div className="px-4 py-3 flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {c.type} · {c.status} · {c.called}/{c.total_contacts} called · {c.appointments_booked} booked
                </p>
              </div>
              {c.status === "draft" && (
                <button
                  type="button"
                  className="mr-4 text-xs px-2 py-1 rounded border"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  onClick={async () => {
                    const r = await fetch(`/api/campaigns/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "active" }) });
                    if (r.ok) load();
                  }}
                >
                  Activate
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
