"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { ProofDrawer } from "@/components/ProofDrawer";

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
  warmth_score?: number;
  handling_status?: string;
  scheduled_intent?: string;
  next_action_in_min?: number;
}

export default function ConversationsPage() {
  const { workspaceId } = useWorkspace();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [commandCenter, setCommandCenter] = useState<{
    hot_leads?: CommandCenterLead[];
    at_risk?: CommandCenterLead[];
  } | null>(null);
  const [riskSurface, setRiskSurface] = useState<{ conversations_at_risk: Array<{ lead_id: string; risk_type: string }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofLeadId, setProofLeadId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!workspaceId) {
      setConversations([]);
      setCommandCenter(null);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/conversations?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/risk-surface?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([convRes, ccRes, riskRes]) => {
        setConversations(convRes.conversations ?? []);
        setCommandCenter(ccRes?.error ? null : ccRes);
        setRiskSurface(riskRes?.error ? null : riskRes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const hotIds = new Set((commandCenter?.hot_leads ?? []).map((h) => h.lead_id ?? h.id).filter(Boolean));
  const atRiskIds = new Set((commandCenter?.at_risk ?? []).map((a) => a.lead_id ?? a.id).filter(Boolean));
  const _hotMap = (commandCenter?.hot_leads ?? []).reduce(
    (acc, h) => { acc[h.lead_id ?? h.id ?? ""] = h; return acc; },
    {} as Record<string, CommandCenterLead>
  );
  const _atRiskMap = (commandCenter?.at_risk ?? []).reduce(
    (acc, a) => { acc[a.lead_id ?? a.id ?? ""] = a; return acc; },
    {} as Record<string, CommandCenterLead>
  );
  const riskLeadIds = new Set((riskSurface?.conversations_at_risk ?? []).map((r) => r.lead_id));

  const readyToBook = (commandCenter?.hot_leads ?? []).map((h) => {
    const id = h.lead_id ?? h.id ?? "";
    return { ...h, lead_id: id, displayName: h.name ?? h.email ?? h.company ?? "—" };
  });
  const inProgress = (commandCenter?.at_risk ?? []).map((a) => {
    const id = a.lead_id ?? a.id ?? "";
    return { ...a, lead_id: id, displayName: a.name ?? a.email ?? a.company ?? "—" };
  });
  const cooling = conversations
    .filter((c) => !hotIds.has(c.lead_id) && !atRiskIds.has(c.lead_id) && !c.opt_out)
    .map((c) => ({
      lead_id: c.lead_id,
      displayName: c.lead_name ?? c.lead_email ?? c.company ?? "—",
      company: c.company,
      last_activity_at: c.last_activity_at,
      warmth_score: Math.max(0, 100 - Math.min(100, (now - new Date(c.last_activity_at).getTime()) / (24 * 60 * 60 * 1000) * 10)),
    }))
    .slice(0, 20);

  function handlingState(lead: CommandCenterLead, column: "ready" | "inprogress" | "cooling"): string {
    const h = lead.handling_status ?? lead.scheduled_intent;
    if (column === "cooling") return "Watching";
    if (h) {
      const s = String(h).toLowerCase();
      if (s.includes("preparing") || s.includes("prepare")) return "Preparing";
      if (s.includes("re-engaging") || s.includes("recover")) return "Recovering";
      if (s.includes("pacing") || s.includes("sequence") || s.includes("keeping")) return "Keeping engaged";
      if (s.includes("confirm")) return "Confirming";
      if (s.includes("watch") || s.includes("monitor")) return "Watching";
    }
    return column === "ready" ? "Preparing" : "Recovering";
  }

  function futureWork(lead: CommandCenterLead, column: "ready" | "inprogress" | "cooling"): string {
    if (column === "cooling") return "—";
    if (lead.next_action_in_min != null && lead.next_action_in_min > 0) {
      const intent = column === "ready" ? "Confirmation" : "Recovery";
      return `${intent} pending`;
    }
    if (lead.scheduled_intent) {
      const s = String(lead.scheduled_intent).toLowerCase();
      if (s.includes("follow") || s.includes("outreach")) return "Follow-up scheduled";
      if (s.includes("confirm")) return "Confirmation pending";
      if (s.includes("recover") || s.includes("re-engag")) return "Recovery planned";
    }
    return column === "ready" ? "Confirmation pending" : "Recovery planned";
  }

  function LeadCard({
    leadId,
    riskLeadIds,
    name,
    company,
    warmth,
    handling,
    futureWorkText,
    onProof,
    column: _column,
  }: {
    leadId: string;
    name: string;
    company?: string | null;
    warmth: number;
    handling: string;
    futureWorkText: string;
    onProof?: () => void;
    column: "ready" | "inprogress" | "cooling";
    riskLeadIds?: Set<string>;
  }) {
    return (
      <div
        className="p-4 rounded-xl"
        style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
              {riskLeadIds?.has(leadId) && (
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(243, 156, 18, 0.2)", color: "var(--meaning-amber)" }}>At risk</span>
              )}
            </div>
            {company && <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{company}</p>}
          </div>
          {onProof && (
            <button
              onClick={(e) => { e.preventDefault(); onProof(); }}
              className="text-xs px-2 py-1 rounded"
              style={{ color: "var(--text-muted)", background: "transparent" }}
            >
              Proof
            </button>
          )}
        </div>
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Relationship built: {Math.round(warmth)}%</p>
        <div className="mb-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, warmth))}%`,
                background: warmth >= 60 ? "var(--meaning-green)" : warmth >= 30 ? "var(--meaning-amber)" : "var(--text-muted)",
              }}
            />
          </div>
        </div>
        <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Current responsibility: {handling}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Next planned touch: {futureWorkText}</p>
        <Link
          href={`/dashboard/leads/${leadId}`}
          className="mt-3 inline-block text-sm font-medium"
          style={{ color: "var(--meaning-blue)" }}
        >
          View details
        </Link>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Select an account.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Conversations</h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>What we&apos;re maintaining for each conversation</p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(231, 76, 60, 0.1)", borderColor: "var(--meaning-red)", borderWidth: "1px", color: "var(--meaning-red)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 px-6 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
          <p style={{ color: "var(--text-primary)" }}>Watching over</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Continuity monitoring in progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--meaning-green)" }}>Ready for call</h2>
            <div className="space-y-3">
              {readyToBook.length === 0 ? (
                <div className="py-6 px-4 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
                  <p style={{ color: "var(--text-primary)" }}>Preparing</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Warming conversations. Call readiness building.</p>
                </div>
              ) : (
                readyToBook.map((l) => (
                  <LeadCard
                    key={l.lead_id}
                    leadId={l.lead_id}
                    riskLeadIds={riskLeadIds}
                    name={l.displayName}
                    company={l.company}
                    warmth={l.warmth_score ?? 70}
                    handling={handlingState(l, "ready")}
                    futureWorkText={futureWork(l, "ready")}
                    onProof={() => setProofLeadId(l.lead_id)}
                    column="ready"
                  />
                ))
              )}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--meaning-amber)" }}>Being maintained</h2>
            <div className="space-y-3">
              {inProgress.length === 0 ? (
                <div className="py-6 px-4 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
                  <p style={{ color: "var(--text-primary)" }}>Recovering</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Keeping engagement. No interventions needed right now.</p>
                </div>
              ) : (
                inProgress.map((l) => (
                  <LeadCard
                    key={l.lead_id}
                    leadId={l.lead_id}
                    riskLeadIds={riskLeadIds}
                    name={l.displayName}
                    company={l.company}
                    warmth={l.warmth_score ?? 45}
                    handling={handlingState(l, "inprogress")}
                    futureWorkText={futureWork(l, "inprogress")}
                    onProof={() => setProofLeadId(l.lead_id)}
                    column="inprogress"
                  />
                ))
              )}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-muted)" }}>Cooling — intervention planned</h2>
            <div className="space-y-3">
              {cooling.length === 0 ? (
                <div className="py-6 px-4 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
                  <p style={{ color: "var(--text-primary)" }}>Watching</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Scanning cooling conversations. All protected.</p>
                </div>
              ) : (
                cooling.map((c) => (
                  <LeadCard
                    key={c.lead_id}
                    leadId={c.lead_id}
                    riskLeadIds={riskLeadIds}
                    name={c.displayName}
                    company={c.company}
                    warmth={c.warmth_score}
                    handling="Watching"
                    futureWorkText="—"
                    onProof={() => setProofLeadId(c.lead_id)}
                    column="cooling"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ProofDrawer leadId={proofLeadId ?? ""} isOpen={!!proofLeadId} onClose={() => setProofLeadId(null)} />
    </div>
  );
}
