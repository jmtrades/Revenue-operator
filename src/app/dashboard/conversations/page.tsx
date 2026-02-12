"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    ])
      .then(([convRes, ccRes]) => {
        setConversations(convRes.conversations ?? []);
        setCommandCenter(ccRes?.error ? null : ccRes);
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
    name,
    company,
    handling,
    futureWorkText,
  }: {
    leadId: string;
    name: string;
    company?: string | null;
    handling: string;
    futureWorkText: string;
  }) {
    return (
      <Link
        href={`/dashboard/leads/${leadId}`}
        className="block p-4 rounded-xl transition-opacity hover:opacity-90"
        style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
      >
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
        {company && <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{company}</p>}
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>Current responsibility: {handling}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Next planned touch: {futureWorkText}</p>
      </Link>
    );
  }

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Conversations</h1>
          <p className="mt-1" style={{ color: "var(--text-secondary)" }}>What we&apos;re maintaining for each conversation</p>
        </header>
        <div className="py-12 px-6 rounded-xl text-center" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>Watching for new conversations</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Maintaining continuity</p>
        </div>
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
                  <p style={{ color: "var(--text-primary)" }}>Watching for new conversations</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Preparing upcoming calls. All protected.</p>
                </div>
              ) : (
                readyToBook.map((l) => (
                  <LeadCard
                    key={l.lead_id}
                    leadId={l.lead_id}
                    name={l.displayName}
                    company={l.company}
                    handling={handlingState(l, "ready")}
                    futureWorkText={futureWork(l, "ready")}
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
                  <p style={{ color: "var(--text-primary)" }}>Maintaining engagement</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Keeping conversations active. No interventions needed.</p>
                </div>
              ) : (
                inProgress.map((l) => (
                  <LeadCard
                    key={l.lead_id}
                    leadId={l.lead_id}
                    name={l.displayName}
                    company={l.company}
                    handling={handlingState(l, "inprogress")}
                    futureWorkText={futureWork(l, "inprogress")}
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
                  <p style={{ color: "var(--text-primary)" }}>Watching for new conversations</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Scanning cooling conversations. All protected.</p>
                </div>
              ) : (
                cooling.map((c) => (
                  <LeadCard
                    key={c.lead_id}
                    leadId={c.lead_id}
                    name={c.displayName}
                    company={c.company}
                    handling="Watching"
                    futureWorkText="—"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
