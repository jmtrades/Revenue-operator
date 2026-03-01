"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { Phone, MessageSquare, Check, ChevronDown, ChevronUp } from "lucide-react";
import { ActivityFeedSkeleton } from "@/components/ui/ActivityFeedSkeleton";

type FilterId = "all" | "needs_action" | "leads" | "appointments" | "urgent" | "outbound" | "spam";
type CardType = "lead" | "appointment" | "emergency" | "outbound" | "action" | "info" | "spam";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_action", label: "Needs action" },
  { id: "leads", label: "Leads" },
  { id: "appointments", label: "Appointments" },
  { id: "urgent", label: "Urgent" },
  { id: "outbound", label: "Outbound" },
  { id: "spam", label: "Spam" },
];

const CARD_ACCENT: Record<CardType, string> = {
  lead: "var(--card-lead)",
  appointment: "var(--card-appointment)",
  emergency: "var(--card-emergency)",
  outbound: "var(--card-outbound)",
  action: "var(--card-action)",
  info: "var(--card-info)",
  spam: "var(--card-spam)",
};

interface CallRow {
  id: string;
  lead_id?: string | null;
  outcome?: string | null;
  transcript_text?: string | null;
  summary?: string | null;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  provider?: string | null;
  matched_lead?: { id: string; name?: string | null; email?: string | null; company?: string | null } | null;
  analysis_outcome?: string | null;
}

function deriveCardType(call: CallRow): CardType {
  const out = (call.analysis_outcome ?? call.outcome ?? "").toLowerCase();
  const summary = (call.summary ?? call.transcript_text ?? "").toLowerCase();
  if (out.includes("booked") || summary.includes("appointment") || summary.includes("scheduled")) return "appointment";
  if (out.includes("urgent") || summary.includes("emergency") || summary.includes("urgent")) return "emergency";
  if (call.provider === "twilio" && call.matched_lead && !call.call_ended_at) return "lead";
  if (call.provider === "twilio") return "info";
  return "info";
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function cardLabel(type: CardType): string {
  const map: Record<CardType, string> = {
    lead: "NEW LEAD",
    appointment: "APPOINTMENT BOOKED",
    emergency: "URGENT",
    outbound: "FOLLOW-UP CALL",
    action: "NEEDS ACTION",
    info: "HANDLED",
    spam: "SPAM",
  };
  return map[type];
}

interface Handoff {
  id: string;
  lead_id: string;
  who: string;
  when: string;
  decision_needed: string;
}

interface SummaryMetrics {
  calls_last_7_days?: number;
  appointments_total?: number;
  appointments_upcoming?: number;
}

export default function ActivityPage() {
  const { workspaceId } = useWorkspace();
  const [filter, setFilter] = useState<FilterId>("needs_action");
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [callInProgress, setCallInProgress] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  const refetch = (silent?: boolean) => {
    if (!workspaceId) return;
    if (!silent) setLoading(true);
    Promise.all([
      fetchWithFallback<{ calls: CallRow[] }>(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<{ handoffs: Handoff[] }>(`/api/handoffs?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<SummaryMetrics>(`/api/analytics/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
    ])
      .then(([cRes, hRes, sRes]) => {
        if (cRes.data?.calls) setCalls(cRes.data.calls);
        if (hRes.data?.handoffs) setHandoffs(hRes.data.handoffs);
        if (sRes.data) setSummary(sRes.data);
      })
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    if (!workspaceId) {
      setCalls([]);
      setHandoffs([]);
      setLoading(false);
      return;
    }
    refetch();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const interval = setInterval(() => refetch(true), 15000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const onFocus = () => refetch(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [workspaceId]);

  const feedCards = calls.map((call) => {
    const type = deriveCardType(call);
    const name = call.matched_lead?.name || call.matched_lead?.email || call.matched_lead?.company || "Caller";
    const meta = call.summary?.slice(0, 60) || call.transcript_text?.slice(0, 60) || "Call";
    const detail = call.call_started_at ? formatTime(call.call_started_at) + " · " + (call.call_ended_at ? "Completed" : "In progress") : "";
    return { ...call, cardType: type, name, meta, detail };
  });

  const filtered = filter === "all"
    ? feedCards
    : filter === "needs_action"
      ? feedCards.filter((c) => c.cardType === "lead" || c.cardType === "emergency" || c.cardType === "action")
      : filter === "leads"
        ? feedCards.filter((c) => c.cardType === "lead")
        : filter === "appointments"
          ? feedCards.filter((c) => c.cardType === "appointment")
          : filter === "urgent"
            ? feedCards.filter((c) => c.cardType === "emergency")
            : filter === "outbound"
              ? feedCards.filter((c) => c.cardType === "outbound")
              : filter === "spam"
                ? feedCards.filter((c) => c.cardType === "spam")
                : feedCards;

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select a workspace to see activity.</p>
      </Shell>
    );
  }

  const leadsCount = calls.filter((c) => deriveCardType(c) === "lead").length;

  const startOutboundCall = async (leadId: string) => {
    setCallError(null);
    setCallInProgress(leadId);
    try {
      const r = await fetch("/api/outbound/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lead_id: leadId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Call failed");
      refetch(true);
    } catch (e) {
      setCallError(e instanceof Error ? e.message : "Call failed");
    } finally {
      setCallInProgress(null);
    }
  };

  return (
    <Shell size="md" className="max-w-[600px]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Activity</h1>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }} aria-live="polite">Live</span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6 overflow-x-auto scrollbar-hide">
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{summary?.calls_last_7_days ?? "—"}</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>calls (7d)</p>
        </div>
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>100%</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>answered</p>
        </div>
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{leadsCount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>new leads</p>
        </div>
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{summary?.appointments_upcoming ?? "—"}</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>appts</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background: filter === f.id ? "var(--accent-primary-subtle)" : "var(--bg-elevated)",
              color: filter === f.id ? "var(--accent-primary)" : "var(--text-secondary)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <ActivityFeedSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border py-12 px-6 text-center" style={{ borderColor: "var(--border-default)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No external action was required.</p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Calls and leads will appear here.</p>
          <Link href="/dashboard/record" className="inline-block mt-4 text-sm" style={{ color: "var(--accent-primary)" }}>Record a call</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((card) => {
            const accent = CARD_ACCENT[card.cardType];
            const isExpanded = expandedId === card.id;
            return (
              <li key={card.id} className="rounded-xl border-l-4 overflow-hidden" style={{ borderColor: accent, background: "var(--bg-elevated)" }}>
                <button
                  type="button"
                  className="w-full text-left p-4"
                  onClick={() => setExpandedId(isExpanded ? null : card.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
                      {cardLabel(card.cardType)}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{formatTime(card.call_started_at)}</span>
                  </div>
                  <p className="text-sm font-medium mt-1 truncate" style={{ color: "var(--text-primary)" }}>{card.name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{card.meta}</p>
                  {card.detail && (
                    <p className="text-[10px] mt-1.5 truncate" style={{ color: "var(--text-tertiary)" }}>{card.detail}</p>
                  )}
                  <div className="flex justify-end mt-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t space-y-3" style={{ borderColor: "var(--border-default)" }}>
                    {card.summary && (
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{card.summary}</p>
                    )}
                    {card.transcript_text && (
                      <p className="text-xs line-clamp-3" style={{ color: "var(--text-tertiary)" }}>{card.transcript_text}</p>
                    )}
                    {callError && (
                      <p className="text-xs mb-2" style={{ color: "var(--accent-danger, #ef4444)" }}>{callError}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {card.lead_id && (
                        <>
                          <button
                            type="button"
                            onClick={() => startOutboundCall(card.lead_id!)}
                            disabled={!!callInProgress}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60"
                            style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {callInProgress === card.lead_id ? "Calling…" : "Call back"}
                          </button>
                          <Link
                            href={`/dashboard/messages?lead=${card.lead_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Message
                          </Link>
                          <Link
                            href={`/dashboard/record/lead/${card.lead_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                          >
                            View
                          </Link>
                        </>
                      )}
                      <Link
                        href={`/dashboard/calls/${card.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                      >
                        View details
                      </Link>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
                      >
                        <Check className="w-3.5 h-3.5" /> Mark done
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {handoffs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>Requires attention</h2>
          <ul className="space-y-3">
            {handoffs.map((h) => (
              <li key={h.id} className="text-sm">
                <Link href={`/dashboard/record/lead/${h.lead_id}`} className="font-medium" style={{ color: "var(--accent-primary)" }}>
                  {h.who}
                </Link>
                <span style={{ color: "var(--text-secondary)" }}> — {h.decision_needed}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}
