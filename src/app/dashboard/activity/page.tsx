"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Handoff {
  id: string;
  lead_id: string;
  who: string;
  when: string;
  decision_needed: string;
}
interface CommandCenterActivity {
  activity?: Array<{ what: string; who: string; when: string; effort_preserved?: boolean }>;
}
interface RequiresAuthority {
  count: number;
}
interface Conversation {
  lead_id: string;
  lead_name: string | null;
  lead_email: string | null;
  company: string | null;
}

export default function ActivityPage() {
  const { workspaceId } = useWorkspace();
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [continuing, setContinuing] = useState<Array<{ line: string; maintained: boolean }>>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requiresAuthority, setRequiresAuthority] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setHandoffs([]);
      setContinuing([]);
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchWithFallback<{ handoffs: Handoff[] }>(`/api/handoffs?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<CommandCenterActivity>(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<{ conversations: Conversation[] }>(`/api/conversations?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<RequiresAuthority>(`/api/enterprise/requires-authority?workspace_id=${encodeURIComponent(workspaceId)}`),
    ]).then(([hRes, ccRes, cRes, raRes]) => {
      if (hRes.data?.handoffs) setHandoffs(hRes.data.handoffs);
      const act = (ccRes.data?.activity ?? []).slice(0, 15);
      setContinuing(
        act.map((a) => {
          const line = (a.who && a.who !== "System" && a.who !== "—" ? `${a.what} — ${a.who}` : a.what).trim();
          return { line: line || "", maintained: !!a.effort_preserved };
        }).filter((x) => x.line)
      );
      if (cRes.data?.conversations) setConversations(cRes.data.conversations.slice(0, 30));
      if (raRes.data?.count != null) setRequiresAuthority(raRes.data.count);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Activity appears when operation is in place.</p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl space-y-12">
        {requiresAuthority > 0 && (
          <section>
            <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Requires authority
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              <Link href="/dashboard/record" style={{ color: "var(--text-primary)" }}>{requiresAuthority} record entries</Link>
            </p>
          </section>
        )}

        {handoffs.length > 0 && (
          <section>
            <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Requires attention
            </h2>
            <ul className="space-y-4">
              {handoffs.map((h) => (
                <li key={h.id} className="text-sm" style={{ lineHeight: 1.7 }}>
                  <Link
                    href={`/dashboard/record/lead/${h.lead_id}`}
                    className="font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {h.who}
                  </Link>
                  <span style={{ color: "var(--text-secondary)" }}> — {h.decision_needed}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            Continuing work
          </h2>
          {continuing.length === 0 && handoffs.length === 0 && conversations.length === 0 ? (
            <div>
              <p className="text-sm mb-2" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>
                No activity yet.
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                Connect a source or upload leads to begin.
              </p>
            </div>
          ) : continuing.length === 0 ? null : (
            <ul className="space-y-3">
              {continuing.map((item, i) => (
                <li key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {item.line}{item.maintained ? " — maintained" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        {conversations.length > 0 && (
          <section>
            <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Follow-through by lead
            </h2>
            <ul className="space-y-2">
              {conversations.map((c) => (
                <li key={c.lead_id} className="text-sm" style={{ lineHeight: 1.7 }}>
                  <Link href={`/dashboard/record/lead/${c.lead_id}`} style={{ color: "var(--text-primary)" }}>
                    {c.lead_name || c.lead_email || c.company || "—"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Shell>
  );
}
