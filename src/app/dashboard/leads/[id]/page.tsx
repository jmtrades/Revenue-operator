"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ProofDrawer } from "@/components/ProofDrawer";
import { ReadinessProofDrawer } from "@/components/ReadinessProofDrawer";

interface Lead {
  id: string;
  workspace_id?: string;
  name: string | null;
  email: string | null;
  company: string | null;
  state: string;
  created_at?: string;
}

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface Deal {
  id: string;
}

interface PreCallBrief {
  context?: string;
  motivation?: string;
  risks?: string[];
  hesitations?: string[];
  recommended_strategy?: string;
}

export default function LeadViewPage() {
  const params = useParams();
  const _router = useRouter();
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [preCallBrief, setPreCallBrief] = useState<PreCallBrief | null>(null);
  const [readiness, setReadiness] = useState<{ conversation_readiness_score?: number } | null>(null);
  const [workspacePaused, setWorkspacePaused] = useState(false);
  const [callContinuity, setCallContinuity] = useState<{ status: "Prepared" | "Waiting" | "Recovering" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofOpen, setProofOpen] = useState(false);
  const [readinessProofOpen, setReadinessProofOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/leads/${id}`).then((r) => r.json()),
      fetch(`/api/leads/${id}/messages`).then((r) => r.json()),
    ])
      .then(([l, m]) => {
        setLead(l.error ? null : l);
        setMessages(m.messages ?? []);
        setDeals(l.deals ?? []);
      })
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !lead?.workspace_id) return;
    fetch(`/api/leads/${id}/readiness?workspace_id=${lead.workspace_id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? null : setReadiness(d)))
      .catch(() => setReadiness(null));
  }, [id, lead?.workspace_id]);

  useEffect(() => {
    if (!lead?.workspace_id) return;
    fetch(`/api/overview?workspace_id=${encodeURIComponent(lead.workspace_id)}`)
      .then((r) => r.json())
      .then((d) => setWorkspacePaused(d.workspace_status === "paused"))
      .catch(() => setWorkspacePaused(false));
  }, [lead?.workspace_id]);

  useEffect(() => {
    if (!id || !lead?.workspace_id) return;
    fetch(`/api/leads/${id}/call-continuity?workspace_id=${encodeURIComponent(lead.workspace_id)}`)
      .then((r) => r.json())
      .then((d) => (d.error ? null : setCallContinuity(d)))
      .catch(() => setCallContinuity(null));
  }, [id, lead?.workspace_id]);

  useEffect(() => {
    if (!id || !lead) return;
    const dealId = deals?.length && deals[0] ? (deals[0] as Deal).id : undefined;
    fetch(`/api/leads/${id}/pre-call-brief${dealId ? `?deal_id=${dealId}` : ""}`)
      .then((r) => r.json())
      .then((d) => (!d.error ? setPreCallBrief(d) : null))
      .catch(() => setPreCallBrief(null));
  }, [id, lead, deals]);

  if (loading) return (
    <div className="p-8 max-w-2xl mx-auto">
      <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
      <p style={{ color: "var(--text-primary)" }}>Watching over</p>
      <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Preparing your brief. Continuity monitoring in progress.</p>
    </div>
  );
  if (!lead) return <div className="p-8" style={{ color: "var(--meaning-red)" }}>Not found</div>;

  const displayName = lead.name || lead.email || lead.company || "Unknown";
  const risks = [...(preCallBrief?.risks ?? []), ...(preCallBrief?.hesitations ?? []).map((h) => `Hesitation: ${h}`)];
  const firstTimestamp = messages[0]?.created_at ?? lead.created_at;
  const daysBuilt = firstTimestamp
    ? Math.max(1, Math.floor((now - new Date(firstTimestamp).getTime()) / (24 * 60 * 60 * 1000)))
    : 1;

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/conversations" className="text-sm mb-4 inline-block" style={{ color: "var(--text-muted)" }}>
          ← Conversations
        </Link>

        <div className="p-4 rounded-xl mb-6" style={{ background: workspacePaused ? "rgba(243, 156, 18, 0.1)" : "rgba(46, 204, 113, 0.1)", borderColor: workspacePaused ? "var(--meaning-amber)" : "var(--meaning-green)", borderWidth: "1px" }}>
          {workspacePaused ? (
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              This conversation took {daysBuilt} day{daysBuilt !== 1 ? "s" : ""} to build. Momentum fades if continuity stops.
            </p>
          ) : (
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              You only take the call. We maintain this conversation.
            </p>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          {lead.company && <p className="mt-1" style={{ color: "var(--text-muted)" }}>{lead.company}</p>}
        </div>

        <div className="space-y-6">
          {callContinuity && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Call continuity</h2>
              <p className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: callContinuity.status === "Prepared" ? "rgba(46, 204, 113, 0.2)" : callContinuity.status === "Recovering" ? "rgba(243, 156, 18, 0.2)" : "rgba(77, 163, 255, 0.2)",
                    color: callContinuity.status === "Prepared" ? "var(--meaning-green)" : callContinuity.status === "Recovering" ? "var(--meaning-amber)" : "var(--meaning-blue)",
                  }}
                >
                  {callContinuity.status}
                </span>
              </p>
            </section>
          )}

          <section>
            <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Current responsibility</h2>
            <p className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
              {readiness?.conversation_readiness_score != null
                ? (readiness.conversation_readiness_score >= 70 ? "Preparing for call" : readiness.conversation_readiness_score >= 40 ? "Keeping engagement" : "Maintaining continuity")
                : "Maintaining continuity"}
              {readiness?.conversation_readiness_score != null && (
                <button onClick={() => setReadinessProofOpen(true)} className="ml-2 text-xs" style={{ color: "var(--meaning-blue)" }}>
                  ({readiness.conversation_readiness_score}% call readiness)
                </button>
              )}
            </p>
          </section>
          {preCallBrief?.context && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Conversation understanding</h2>
              <p className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                {preCallBrief.context}
              </p>
            </section>
          )}
          {preCallBrief?.motivation && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Motivation signals</h2>
              <p className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                {preCallBrief.motivation}
              </p>
            </section>
          )}
          {risks.length > 0 && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Risks to attendance</h2>
              <ul className="py-3 px-4 rounded-lg space-y-2" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                {risks.map((r, i) => (
                  <li key={i} className="list-disc list-inside" style={{ color: "var(--text-primary)" }}>{r}</li>
                ))}
              </ul>
            </section>
          )}
          {preCallBrief?.recommended_strategy && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Suggested approach</h2>
              <p className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--meaning-blue)", borderWidth: "1px", color: "var(--text-primary)" }}>
                {preCallBrief.recommended_strategy}
              </p>
            </section>
          )}
        </div>

        {!preCallBrief?.context && !preCallBrief?.motivation && !preCallBrief?.recommended_strategy && risks.length === 0 && (
          <div className="mt-8 py-6 px-6 rounded-xl text-center" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-muted)" }}>
            Brief is being prepared. You can take the call — we&apos;re watching over this conversation.
          </div>
        )}

        <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setControlOpen(!controlOpen)}
            className="text-sm font-medium"
            style={{ color: "var(--meaning-amber)" }}
          >
            {controlOpen ? "Hide control" : "Take control"}
          </button>
          {controlOpen && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={async () => {
                    await fetch(`/api/leads/${id}/run-plan`, { method: "POST" });
                  }}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: "var(--meaning-green)", color: "#0E1116" }}
                >
                  Add follow-up touch
                </button>
                <button
                  onClick={() => setProofOpen(true)}
                  className="px-4 py-2 rounded-lg"
                  style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                >
                  See what we&apos;ve done
                </button>
              </div>
              <section>
                <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Message thread</h3>
                {messages.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No messages yet</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className="p-3 rounded-lg" style={{ background: m.role === "user" ? "var(--surface)" : "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.role}</span>
                        <p className="mt-1">{m.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      <ProofDrawer leadId={id} isOpen={proofOpen} onClose={() => setProofOpen(false)} />
      {lead?.workspace_id && (
        <ReadinessProofDrawer leadId={id} workspaceId={lead.workspace_id} isOpen={readinessProofOpen} onClose={() => setReadinessProofOpen(false)} />
      )}
    </div>
  );
}
