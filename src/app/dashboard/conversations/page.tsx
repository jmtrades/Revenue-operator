"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Conversation {
  lead_id: string;
  lead_name: string | null;
  lead_email: string | null;
  company: string | null;
  state: string;
  last_activity_at: string;
  opt_out: boolean;
}
interface CommandCenterLead {
  lead_id?: string;
  id?: string;
  name?: string;
  email?: string;
  company?: string;
  handling_status?: string;
  scheduled_intent?: string;
}
interface CommandCenter {
  hot_leads?: CommandCenterLead[];
  at_risk?: CommandCenterLead[];
}

export default function ConversationsPage() {
  const { workspaceId } = useWorkspace();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [commandCenter, setCommandCenter] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setConversations([]);
      setCommandCenter(null);
      return;
    }
    setLoading(true);
    setError(false);
    Promise.all([
      fetchWithFallback<{ conversations?: Conversation[] }>(`/api/conversations?workspace_id=${encodeURIComponent(workspaceId)}`, { cacheKey: `conversations-${workspaceId}` }),
      fetchWithFallback<CommandCenter>(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`, { cacheKey: `command-center-${workspaceId}` }),
    ])
      .then(([convRes, ccRes]) => {
        if (convRes.data?.conversations) setConversations(convRes.data.conversations);
        if (ccRes.data && !(ccRes.data as { error?: unknown }).error) setCommandCenter(ccRes.data);
        if (convRes.error || ccRes.error) setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const hotIds = new Set((commandCenter?.hot_leads ?? []).map((h) => h.lead_id ?? h.id).filter(Boolean));
  const atRiskIds = new Set((commandCenter?.at_risk ?? []).map((a) => a.lead_id ?? a.id).filter(Boolean));
  const allLeads = [
    ...(commandCenter?.hot_leads ?? []).map((h) => ({ ...h, lead_id: h.lead_id ?? h.id ?? "", displayName: h.name ?? h.email ?? h.company ?? "—", column: "active" as const })),
    ...(commandCenter?.at_risk ?? []).map((a) => ({ ...a, lead_id: a.lead_id ?? a.id ?? "", displayName: a.name ?? a.email ?? a.company ?? "—", column: "in_progress" as const })),
    ...conversations
      .filter((c) => !hotIds.has(c.lead_id) && !atRiskIds.has(c.lead_id) && !c.opt_out)
      .slice(0, 20)
      .map((c) => ({ lead_id: c.lead_id, displayName: c.lead_name ?? c.lead_email ?? c.company ?? "—", company: c.company, column: "continuing" as const })),
  ];

  function stateLine(lead: { handling_status?: string; scheduled_intent?: string; column: string }): string {
    const h = lead.handling_status ?? lead.scheduled_intent;
    if (lead.column === "continuing") return "In progress.";
    if (h) {
      const s = String(h).toLowerCase();
      if (s.includes("confirm")) return "Confirmation in progress.";
      if (s.includes("recover") || s.includes("re-engag")) return "Recovery in progress.";
      if (s.includes("follow") || s.includes("outreach")) return "Follow-through in progress.";
    }
    return "In progress.";
  }

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Follow-through by lead appears when operation is in place.</p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl">
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
          <Link href="/dashboard/activity" style={{ color: "var(--meaning-blue)" }}>
            Activity
          </Link>
        </p>
        {error && (
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>Normal conditions are not present.</p>
        )}
        {allLeads.length === 0 ? (
          <p className="text-sm py-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            No follow-through in progress. Entries appear as work continues.
          </p>
        ) : (
          <ul className="space-y-0">
            {allLeads.map((lead) => (
              <li
                key={lead.lead_id}
                className="py-4 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {lead.displayName}
                    </p>
                    {"company" in lead && lead.company && (
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{lead.company}</p>
                    )}
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      {stateLine(lead)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/leads/${lead.lead_id}`}
                    className="text-sm shrink-0"
                    style={{ color: "var(--meaning-blue)" }}
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
