"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProofDrawer } from "@/components/ProofDrawer";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  state: string;
  last_activity_at: string;
  opt_out?: boolean;
}

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface Deal {
  id: string;
  value_cents: number;
  status: string;
}

export default function LeadViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [closingCall, setClosingCall] = useState<{
    call: {
      call_session_id?: string;
      summary?: string;
      show_status?: string;
      show_reason?: string;
      analysis?: {
        outcome?: string;
        objections?: Array<{ type: string; quote?: string }>;
        next_best_action?: string;
      };
    } | null;
  } | null>(null);
  const [wrapupLink, setWrapupLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofOpen, setProofOpen] = useState(false);

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
    if (!id) return;
    fetch(`/api/leads/${id}/closing-call`)
      .then((r) => r.json())
      .then(setClosingCall)
      .catch(() => setClosingCall(null));
  }, [id]);

  if (loading) return <div className="p-8 text-stone-400">Loading…</div>;
  if (!lead) return <div className="p-8 text-red-400">Lead not found</div>;

  const objections = closingCall?.call?.analysis?.objections ?? [];
  const nextAction = closingCall?.call?.analysis?.next_best_action;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-8 relative">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-stone-500 hover:text-stone-300 mb-4">← Back to leads</button>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{lead.name || lead.email || "Unknown"}</h1>
          <p className="text-stone-400">{lead.company}</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded bg-stone-800 text-sm">{lead.state}</span>
          {lead.opt_out && <span className="ml-2 px-2 py-0.5 rounded bg-red-900/50 text-red-200 text-sm">Opted out</span>}
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={async () => {
              await fetch(`/api/leads/${id}/run-plan`, { method: "POST" });
              if (closingCall) fetch(`/api/leads/${id}/closing-call`).then((r) => r.json()).then(setClosingCall);
            }}
            className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium"
          >
            Run follow-up plan
          </button>
          <button
            onClick={() => setProofOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm"
          >
            Why we suggested this
          </button>
        </div>

        {closingCall?.call && (
          <section className="mb-6 p-4 rounded-xl bg-stone-900 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-2">Latest call</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs ${
                closingCall.call.show_status === "showed" ? "bg-emerald-900/50 text-emerald-400" :
                closingCall.call.show_status === "no_show" ? "bg-red-900/50 text-red-400" : "bg-stone-700 text-stone-400"
              }`}>
                {closingCall.call.show_status === "showed" ? "Showed" : closingCall.call.show_status === "no_show" ? "No-show" : "Unknown"}
              </span>
              {closingCall.call.show_reason && <span className="text-xs text-stone-500">{closingCall.call.show_reason}</span>}
            </div>
            {closingCall.call.summary && <p className="text-stone-300 text-sm mb-2">{closingCall.call.summary}</p>}
            {nextAction && (
              <p className="text-amber-400 text-sm">Suggested next: {(nextAction as string).replace(/_/g, " ")}</p>
            )}
            {closingCall.call.call_session_id && (
              <button
                onClick={async () => {
                  const r = await fetch(`/api/calls/${closingCall.call!.call_session_id}/wrapup-link`, { method: "POST" });
                  const d = await r.json();
                  if (d.url) setWrapupLink(d.url);
                }}
                className="mt-2 text-sm text-blue-400 hover:underline"
              >
                Send wrap-up link to closer
              </button>
            )}
            {wrapupLink && <p className="text-xs text-stone-500 mt-1 break-all">{wrapupLink}</p>}
          </section>
        )}

        {objections.length > 0 && (
          <section className="mb-6 p-4 rounded-xl bg-stone-900 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-2">Detected hesitation</h2>
            <ul className="space-y-1 text-sm text-stone-300">
              {objections.map((o, i) => (
                <li key={i}>{o.type}{o.quote ? ` — "${o.quote}"` : ""}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm font-medium text-stone-400 mb-3">Conversation</h2>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-stone-500 text-sm">No messages yet</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-lg ${m.role === "user" ? "bg-stone-800" : "bg-stone-900"}`}>
                  <span className="text-xs text-stone-500">{m.role}</span>
                  <p className="mt-1">{m.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <ProofDrawer leadId={id} isOpen={proofOpen} onClose={() => setProofOpen(false)} />
    </div>
  );
}
