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
  metadata?: { simulated?: boolean };
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
  const [forensics, setForensics] = useState<{ summary: string; likely_causes: string[]; recommendations: string[] } | null>(null);
  const [followUp, setFollowUp] = useState<{ suggested_delay_hours: number; tone: string; reason: string } | null>(null);
  const [prediction, setPrediction] = useState<{ probability: number; signals: string[] } | null>(null);
  const [closingCall, setClosingCall] = useState<{
    call: {
      call_session_id?: string;
      summary?: string;
      transcript_stored?: boolean;
      consent_granted?: boolean;
      provider?: string;
      show_status?: string;
      show_reason?: string;
      analysis_source?: string;
      analysis?: {
        outcome?: string;
        objections?: Array<{ type: string; quote?: string; severity?: string }>;
        risks?: Array<{ type: string; severity?: string; explanation?: string }>;
        next_best_action?: string;
        followup_plan?: Array<{ when_hours_from_now: number; action_type: string }>;
      };
    } | null;
  } | null>(null);
  const [wrapupLink, setWrapupLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofOpen, setProofOpen] = useState(false);
  const [inactionReason, setInactionReason] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/leads/${id}`).then((r) => r.json()),
      fetch(`/api/leads/${id}/messages`).then((r) => r.json()),
      fetch(`/api/leads/${id}/inaction-reason`).then((r) => r.json()),
    ])
      .then(([l, m, ir]) => {
        setLead(l.error ? null : l);
        setMessages(m.messages ?? []);
        setInactionReason((ir as { message?: string }).message ?? null);
      })
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((l) => setDeals(l.deals ?? []))
      .catch(() => setDeals([]));
  }, [id]);

  const loadForensics = () => {
    if (!id) return;
    fetch(`/api/leads/${id}/forensics`)
      .then((r) => r.json())
      .then(setForensics)
      .catch(() => setForensics(null));
  };
  const loadFollowUp = () => {
    if (!id) return;
    fetch(`/api/leads/${id}/follow-up`)
      .then((r) => r.json())
      .then(setFollowUp)
      .catch(() => setFollowUp(null));
  };
  const loadPrediction = () => {
    if (!id || deals.length === 0) return;
    fetch(`/api/deals/${deals[0].id}/prediction`)
      .then((r) => r.json())
      .then(setPrediction)
      .catch(() => setPrediction(null));
  };
  const loadClosingCall = () => {
    if (!id) return;
    fetch(`/api/leads/${id}/closing-call`)
      .then((r) => r.json())
      .then(setClosingCall)
      .catch(() => setClosingCall(null));
  };

  if (loading) return <div className="p-8 text-stone-400">Loading…</div>;
  if (!lead) return <div className="p-8 text-red-400">Lead not found</div>;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-8 relative">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-stone-500 hover:text-stone-300 mb-4">← Back</button>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">{lead.name || lead.email || "Unknown"}</h1>
          <p className="text-stone-400">{lead.company}</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded bg-stone-800 text-sm">{lead.state}</span>
          {lead.opt_out && (
            <span className="inline-block ml-2 mt-2 px-2 py-0.5 rounded bg-red-900/50 text-red-200 text-sm font-medium">OPTED OUT</span>
          )}
          <p className="text-xs text-stone-500 mt-1">Last activity: {new Date(lead.last_activity_at).toLocaleString()}</p>
          <button
            onClick={() => setProofOpen(true)}
            className="mt-3 px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-sm font-medium"
          >
            View Proof
          </button>
          {inactionReason && (
            <p className="mt-3 text-sm text-amber-400/90 italic">{inactionReason}</p>
          )}
        </div>

        <section className="mb-8 p-4 rounded-xl bg-stone-900 border border-stone-800">
          <h2 className="text-lg font-medium mb-2">Latest Call Outcome</h2>
          {!closingCall ? (
            <button onClick={loadClosingCall} className="px-3 py-1.5 rounded bg-amber-600/20 text-amber-400 text-sm">Load</button>
          ) : closingCall.call ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {closingCall.call.provider && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-stone-700 text-stone-300">{closingCall.call.provider === "calendar" ? "Calendar" : "Zoom"}</span>
                )}
                {closingCall.call.show_status && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    closingCall.call.show_status === "showed" ? "bg-emerald-900/50 text-emerald-400" :
                    closingCall.call.show_status === "no_show" ? "bg-red-900/50 text-red-400" : "bg-stone-700 text-stone-400"
                  }`}>
                    {closingCall.call.show_status === "showed" ? "Showed" : closingCall.call.show_status === "no_show" ? "No-show" : "Unknown"}
                  </span>
                )}
                {closingCall.call.analysis_source && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-stone-600 text-stone-300">
                    {closingCall.call.analysis_source === "zoom_transcript" ? "Zoom transcript" : closingCall.call.analysis_source === "calendar_fallback" ? "Calendar fallback" : closingCall.call.analysis_source === "wrap_up" ? "Wrap-up" : closingCall.call.analysis_source}
                  </span>
                )}
              </div>
              {closingCall.call.show_reason && <p className="text-stone-500 text-xs">{closingCall.call.show_reason}</p>}
              {closingCall.call.transcript_stored === false && (
                <p className="text-amber-400">Consent not granted—summary only</p>
              )}
              {closingCall.call.summary && <p className="text-stone-300">{closingCall.call.summary}</p>}
              {closingCall.call.analysis?.objections && closingCall.call.analysis.objections.length > 0 && (
                <div>
                  <span className="text-stone-500">Objections:</span>
                  <ul className="list-disc list-inside text-stone-400 mt-0.5">
                    {closingCall.call.analysis.objections.map((o, i) => (
                      <li key={i}>{o.type}{o.quote ? `: "${o.quote}"` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
              {closingCall.call.analysis?.risks && closingCall.call.analysis.risks.length > 0 && (
                <div>
                  <span className="text-stone-500">Risks:</span>
                  <ul className="list-disc list-inside text-stone-400 mt-0.5">
                    {closingCall.call.analysis.risks.map((r, i) => (
                      <li key={i}>{r.type}: {r.explanation}</li>
                    ))}
                  </ul>
                </div>
              )}
              {closingCall.call.analysis?.next_best_action && (
                <p><span className="text-stone-500">Next:</span> <span className="text-amber-400">{(closingCall.call.analysis.next_best_action as string).replace(/_/g, " ")}</span></p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {closingCall.call.call_session_id && (
                  <button
                    onClick={async () => {
                      const r = await fetch(`/api/calls/${closingCall.call!.call_session_id}/wrapup-link`, { method: "POST" });
                      const d = await r.json();
                      if (d.url) setWrapupLink(d.url);
                    }}
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
                  >
                    Send wrap-up link to closer
                  </button>
                )}
                {wrapupLink && (
                  <p className="text-xs text-stone-400 break-all">Link: {wrapupLink}</p>
                )}
                <button
                  onClick={async () => {
                    await fetch(`/api/leads/${id}/run-plan`, { method: "POST" });
                    loadClosingCall();
                  }}
                  className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-medium"
                >
                  Run plan now
                </button>
                <button
                  onClick={async () => {
                    await fetch(`/api/leads/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ paused_for_followup: true }),
                    });
                    loadClosingCall();
                  }}
                  className="px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-medium"
                >
                  Pause for this lead
                </button>
              </div>
            </div>
          ) : (
            <p className="text-stone-500">No closing call</p>
          )}
        </section>

        {lead.state === "LOST" && (
          <section className="mb-8 p-4 rounded-xl bg-stone-900 border border-stone-800">
            <h2 className="text-lg font-medium mb-2">Conversation Forensics</h2>
            {!forensics ? (
              <button onClick={loadForensics} className="px-3 py-1.5 rounded bg-amber-600/20 text-amber-400 text-sm">Generate</button>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-stone-300">{forensics.summary}</p>
                {forensics.likely_causes?.length > 0 && (
                  <p><span className="text-stone-500">Causes:</span> {forensics.likely_causes.join(", ")}</p>
                )}
                {forensics.recommendations?.length > 0 && (
                  <p><span className="text-stone-500">Recommendations:</span> {forensics.recommendations.join("; ")}</p>
                )}
              </div>
            )}
          </section>
        )}

        <section className="mb-8 p-4 rounded-xl bg-stone-900 border border-stone-800">
          <h2 className="text-lg font-medium mb-2">Follow-up Recommendation</h2>
          {!followUp ? (
            <button onClick={loadFollowUp} className="px-3 py-1.5 rounded bg-amber-600/20 text-amber-400 text-sm">Load</button>
          ) : (
            <p className="text-sm text-stone-300">Delay: {followUp.suggested_delay_hours}h · Tone: {followUp.tone} · {followUp.reason}</p>
          )}
        </section>

        {deals.length > 0 && (
          <section className="mb-8 p-4 rounded-xl bg-stone-900 border border-stone-800">
            <h2 className="text-lg font-medium mb-2">Deal Outcome Prediction</h2>
            {!prediction ? (
              <button onClick={loadPrediction} className="px-3 py-1.5 rounded bg-amber-600/20 text-amber-400 text-sm">Compute</button>
            ) : (
              <p className="text-sm text-stone-300">{Math.round(prediction.probability * 100)}% close probability · Signals: {prediction.signals.join(", ")}</p>
            )}
          </section>
        )}

        <div>
          <h2 className="text-lg font-medium mb-4">Timeline</h2>
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg relative ${m.role === "user" ? "bg-stone-800" : "bg-stone-900"}`}
              >
                <span className="text-xs text-stone-500">{m.role} · {new Date(m.created_at ?? "").toLocaleString()}</span>
                {m.metadata?.simulated && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-amber-600/30 text-amber-300">Preview</span>
                )}
                <p className="mt-1">{m.content}</p>
              </div>
            ))}
            {messages.length === 0 && <p className="text-stone-500">No messages yet</p>}
          </div>
        </div>
      </div>
      <ProofDrawer leadId={id} isOpen={proofOpen} onClose={() => setProofOpen(false)} />
    </div>
  );
}
