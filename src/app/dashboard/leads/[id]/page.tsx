"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ProofDrawer } from "@/components/ProofDrawer";
import { LoadingState } from "@/components/ui";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

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
  const [workspacePaused, setWorkspacePaused] = useState(false);
  const [callContinuity, setCallContinuity] = useState<{ status: "Prepared" | "Waiting" | "Recovering" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofOpen, setProofOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchWithFallback(`/api/leads/${id}`, { cacheKey: `lead-${id}` }),
      fetchWithFallback(`/api/leads/${id}/messages`, { cacheKey: `lead-messages-${id}` }),
    ])
      .then(([lResult, mResult]) => {
        if (lResult.data && !(lResult.data as { error?: unknown }).error) {
          const leadData = lResult.data as Lead & { deals?: Deal[] };
          setLead(leadData);
          setDeals(leadData.deals ?? []);
        }
        if (mResult.data) {
          const msgData = mResult.data as { messages?: Message[] };
          setMessages(msgData.messages ?? []);
        }
        // Keep previous state on error
      })
      .catch(() => {
        // Keep previous state
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!lead?.workspace_id) return;
    fetchWithFallback(`/api/overview?workspace_id=${encodeURIComponent(lead.workspace_id)}`, {
      cacheKey: `overview-${lead.workspace_id}`,
    }).then((result) => {
      if (result.data) {
        setWorkspacePaused((result.data as { workspace_status?: string }).workspace_status === "paused");
      }
    });
  }, [lead?.workspace_id]);

  useEffect(() => {
    if (!id || !lead?.workspace_id) return;
    fetchWithFallback<{ status: "Prepared" | "Waiting" | "Recovering" }>(`/api/leads/${id}/call-continuity?workspace_id=${encodeURIComponent(lead.workspace_id)}`, {
      cacheKey: `call-continuity-${id}`,
    }).then((result) => {
      if (result.data && !(result.data as { error?: unknown }).error) {
        setCallContinuity(result.data as { status: "Prepared" | "Waiting" | "Recovering" });
      }
      // Keep previous state on error
    });
  }, [id, lead?.workspace_id]);

  useEffect(() => {
    if (!id || !lead) return;
    const dealId = deals?.length && deals[0] ? (deals[0] as Deal).id : undefined;
    fetchWithFallback<PreCallBrief>(`/api/leads/${id}/pre-call-brief${dealId ? `?deal_id=${dealId}` : ""}`, {
      cacheKey: `pre-call-brief-${id}-${dealId ?? "none"}`,
    }).then((result) => {
      if (result.data && !(result.data as { error?: unknown }).error) {
        setPreCallBrief(result.data);
      }
      // Keep previous state on error
    });
  }, [id, lead, deals]);

  if (loading) return (
    <div className="p-8 max-w-2xl mx-auto">
      <LoadingState message="Watching over" submessage="Preparing your brief. Continuity monitoring in progress." />
    </div>
  );
  if (!lead) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="p-4 rounded-lg text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-secondary)" }}>
        <span className="inline-block w-2 h-2 rounded-full animate-pulse mr-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
        Still monitoring — retrying in the background
      </div>
    </div>
  );

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

        <div className="p-4 rounded-xl mb-6" style={{ background: workspacePaused ? "rgba(243, 156, 18, 0.1)" : "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            You only take the call. We maintain this conversation.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Messages stay natural and low-pressure.
          </p>
        </div>

        <div className="mb-8">
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Here&apos;s what matters before the call</h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{displayName}</p>
          {lead.company && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{lead.company}</p>}
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
                {callContinuity.status === "Prepared" && (
                  <p className="text-xs mt-2" style={{ color: "var(--meaning-green)", opacity: 0.8 }}>
                    This conversation has been kept warm
                  </p>
                )}
              </p>
            </section>
          )}

          {preCallBrief?.context && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Context</h2>
              <p className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                {preCallBrief.context}
              </p>
            </section>
          )}
          {preCallBrief?.motivation && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Motivation</h2>
              <p className="py-3 px-4 rounded-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
                {preCallBrief.motivation}
              </p>
            </section>
          )}
          {risks.length > 0 && (
            <section>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Concern signals</h2>
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
            {controlOpen ? "Hide control" : "Open conversation"}
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
                  What we did
                </button>
              </div>
              <section>
                <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Message thread</h3>
                {messages.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Watching for new messages</p>
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
    </div>
  );
}
