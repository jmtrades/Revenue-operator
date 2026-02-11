"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProofDrawer } from "@/components/ProofDrawer";
import { ReadinessProofDrawer } from "@/components/ReadinessProofDrawer";
import { ConversationProgressIndicator } from "@/components/ConversationProgressIndicator";
import { leadStateToProgress } from "@/lib/progress/conversation-progress";

interface Lead {
  id: string;
  workspace_id?: string;
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
  const [readinessProofOpen, setReadinessProofOpen] = useState(false);
  const [readiness, setReadiness] = useState<{
    conversation_readiness_score?: number;
    readiness_drivers?: Array<{ factor: string; contribution: number }>;
  } | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [preCallBrief, setPreCallBrief] = useState<{
    context?: string;
    motivation?: string;
    risks?: string[];
    hesitations?: string[];
    recommended_strategy?: string;
    suggested_questions?: string[];
  } | null>(null);
  const [momentum, setMomentum] = useState<{
    warmth_score?: number;
    cooling_state?: string | null;
    learned_preferences?: string[];
    momentum_loss_warning?: string | null;
  } | null>(null);
  const [timeline, setTimeline] = useState<{
    timeline: Array<{ phase: string; when: string; what: string; detail?: string }>;
    phase_summary: { protection: number; preparation: number; attendance: number };
  } | null>(null);
  const [stability, setStability] = useState<{
    plan?: { next_action_type: string; next_action_at: string; sequence_step?: number };
    cooldown?: { reason: string; cooldown_until?: string };
    sequence?: { current_step: number; sequence_name?: string };
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/leads/${id}`).then((r) => r.json()),
      fetch(`/api/leads/${id}/messages`).then((r) => r.json()),
      fetch(`/api/leads/${id}/momentum`).then((r) => r.json()),
      fetch(`/api/leads/${id}/accountability-timeline`).then((r) => r.json()),
    ])
      .then(([l, m, mom, tl]) => {
        setLead(l.error ? null : l);
        setMessages(m.messages ?? []);
        setDeals(l.deals ?? []);
        setMomentum(mom.error ? null : mom);
        setTimeline(tl.error ? null : tl);
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
    if (!id || !lead?.workspace_id) return;
    fetch(`/api/leads/${id}/stability?workspace_id=${lead.workspace_id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? null : setStability(d)))
      .catch(() => setStability(null));
  }, [id, lead?.workspace_id]);

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
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <ConversationProgressIndicator stage={leadStateToProgress(lead.state)} />
            <span className="inline-block px-2 py-0.5 rounded bg-stone-800 text-sm">{lead.state}</span>
            {lead.opt_out && <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-200 text-sm">Opted out</span>}
            {readiness?.conversation_readiness_score != null && (
              <button
                onClick={() => setReadinessProofOpen(true)}
                className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 text-sm hover:bg-amber-800/50"
              >
                {readiness.conversation_readiness_score}% ready
              </button>
            )}
            {momentum?.warmth_score != null && (
              <span className="px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-sm">
                Relationship built: {momentum.warmth_score}%
              </span>
            )}
            {momentum?.cooling_state && (
              <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 text-sm">{momentum.cooling_state}</span>
            )}
            {stability?.sequence && (
              <span className="px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 text-sm">
                {stability.sequence.sequence_name ?? "Sequence"} step {stability.sequence.current_step}
              </span>
            )}
            {stability?.plan && !stability?.cooldown && (
              <span className="px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-sm">
                Next: {stability.plan.next_action_type} at {new Date(stability.plan.next_action_at).toLocaleString()}
              </span>
            )}
            {stability?.cooldown && (
              <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 text-sm" title={stability.cooldown.cooldown_until ?? ""}>
                Held until {stability.cooldown.cooldown_until ? new Date(stability.cooldown.cooldown_until).toLocaleString() : "—"}
              </span>
            )}
          </div>
          {momentum?.momentum_loss_warning && (
            <p className="mt-2 text-sm text-amber-400/90">{momentum.momentum_loss_warning}</p>
          )}
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
          <button
            onClick={async () => {
              setBriefOpen(!briefOpen);
              if (!briefOpen && !preCallBrief) {
                const dealId = deals?.length && deals[0] ? (deals[0] as { id?: string }).id : undefined;
                const r = await fetch(`/api/leads/${id}/pre-call-brief${dealId ? `?deal_id=${dealId}` : ""}`);
                const d = await r.json();
                if (!d.error) setPreCallBrief(d);
              }
            }}
            className="px-4 py-2.5 rounded-lg bg-sky-900/50 hover:bg-sky-800/50 text-sky-200 text-sm border border-sky-800/50"
          >
            Pre-call brief
          </button>
        </div>

        {briefOpen && preCallBrief && (
          <section className="mb-6 p-4 rounded-xl bg-sky-950/30 border border-sky-800/50">
            <h2 className="text-sm font-medium text-sky-300 mb-3">Pre-call brief</h2>
            <div className="space-y-3 text-sm">
              {preCallBrief.context && (
                <div>
                  <p className="text-stone-500 text-xs mb-0.5">Context</p>
                  <p className="text-stone-300">{preCallBrief.context}</p>
                </div>
              )}
              {preCallBrief.motivation && (
                <div>
                  <p className="text-stone-500 text-xs mb-0.5">Motivation</p>
                  <p className="text-stone-300">{preCallBrief.motivation}</p>
                </div>
              )}
              {preCallBrief.risks && preCallBrief.risks.length > 0 && (
                <div>
                  <p className="text-stone-500 text-xs mb-0.5">Risks</p>
                  <ul className="list-disc list-inside text-stone-300 space-y-0.5">
                    {preCallBrief.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {preCallBrief.hesitations && preCallBrief.hesitations.length > 0 && (
                <div>
                  <p className="text-stone-500 text-xs mb-0.5">Hesitations</p>
                  <p className="text-stone-300">{preCallBrief.hesitations.join(", ")}</p>
                </div>
              )}
              {preCallBrief.recommended_strategy && (
                <div>
                  <p className="text-stone-500 text-xs mb-0.5">Strategy</p>
                  <p className="text-amber-300">{preCallBrief.recommended_strategy}</p>
                </div>
              )}
            </div>
          </section>
        )}

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

        {momentum?.learned_preferences && momentum.learned_preferences.length > 0 && (
          <section className="mb-6 p-4 rounded-xl bg-stone-900 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-2">What we&apos;ve learned about this lead</h2>
            <ul className="space-y-1 text-sm text-stone-300">
              {momentum.learned_preferences.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {timeline && timeline.timeline.length > 0 && (
          <section className="mb-6 p-4 rounded-xl bg-stone-900 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Accountability timeline</h2>
            <p className="text-xs text-stone-500 mb-3">
              Protection → preparation → attendance
            </p>
            <div className="space-y-2">
              {timeline.timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs ${
                      t.phase === "protection" ? "bg-sky-900/50 text-sky-300" :
                      t.phase === "preparation" ? "bg-amber-900/50 text-amber-300" :
                      "bg-emerald-900/50 text-emerald-300"
                    }`}
                  >
                    {t.phase}
                  </span>
                  <div>
                    <p className="text-stone-300">{t.what}</p>
                    {t.detail && <p className="text-stone-500 text-xs">{t.detail}</p>}
                    <p className="text-stone-600 text-xs">{new Date(t.when).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-stone-500">
              <span>Protection: {timeline.phase_summary?.protection ?? 0}</span>
              <span>Preparation: {timeline.phase_summary?.preparation ?? 0}</span>
              <span>Attendance: {timeline.phase_summary?.attendance ?? 0}</span>
            </div>
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
      {lead?.workspace_id && (
        <ReadinessProofDrawer
          leadId={id}
          workspaceId={lead.workspace_id}
          isOpen={readinessProofOpen}
          onClose={() => setReadinessProofOpen(false)}
        />
      )}
    </div>
  );
}
