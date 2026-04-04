"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { Phone, MessageSquare, Check, ChevronDown, ChevronUp } from "lucide-react";
import { ActivityFeedSkeleton } from "@/components/ui/ActivityFeedSkeleton";

type FilterId = "all" | "needs_action" | "leads" | "appointments" | "urgent" | "outbound" | "spam";
type CardType = "lead" | "appointment" | "emergency" | "outbound" | "action" | "info" | "spam";

const FILTER_IDS: FilterId[] = ["all", "needs_action", "leads", "appointments", "urgent", "outbound", "spam"];

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
  if (call.matched_lead && !call.call_ended_at) return "lead";
  if (call.matched_lead) return "lead";
  return "info";
}

function formatTime(iso: string | null | undefined, dash: string): string {
  if (!iso) return dash;
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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
  const ta = useTranslations("dashboard.activity");
  const { workspaceId } = useWorkspace();
  const [filter, setFilter] = useState<FilterId>("needs_action");
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [callInProgress, setCallInProgress] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const dash = "—";
  const cardLabel = (type: CardType) => ta(`cardLabels.${type}` as "cardLabels.lead");

  const refetch = useCallback((silent?: boolean) => {
    if (!workspaceId) return;
    if (!silent) setLoading(true);
    Promise.all([
      fetchWithFallback<{ calls: CallRow[] }>(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<{ handoffs: Handoff[] }>(`/api/handoffs?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<SummaryMetrics>(`/api/analytics/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
    ])
      .then(([cRes, hRes, sRes]) => {
        if (cRes.data?.calls) setCalls(cRes.data.calls);
        if (hRes.data?.handoffs) setHandoffs(hRes.data.handoffs);
        if (sRes.data) setSummary(sRes.data);
      })
      .finally(() => { if (!silent) setLoading(false); });
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setCalls([]);
      setHandoffs([]);
      setLoading(false);
      return;
    }
    refetch();
  }, [workspaceId, refetch]);

  useEffect(() => {
    if (!workspaceId) return;
    const onFocus = () => refetch(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [workspaceId, refetch]);

  const feedCards = useMemo(() => calls.map((call) => {
    const type = deriveCardType(call);
    const name = call.matched_lead?.name || call.matched_lead?.email || call.matched_lead?.company || ta("callerFallback");
    const meta = call.summary?.slice(0, 60) || call.transcript_text?.slice(0, 60) || ta("callFallback");
    const detail = call.call_started_at
      ? formatTime(call.call_started_at, dash) + " · " + (call.call_ended_at ? ta("completed") : ta("inProgress"))
      : "";
    return { ...call, cardType: type, name, meta, detail };
  }), [calls, ta, dash]);

  const handleMarkDone = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    setExpandedId(null);
  }, []);

  const visibleCards = feedCards.filter((c) => !dismissedIds.has(c.id));
  const filtered = filter === "all"
    ? visibleCards
    : filter === "needs_action"
      ? visibleCards.filter((c) => c.cardType === "lead" || c.cardType === "emergency" || c.cardType === "action")
      : filter === "leads"
        ? visibleCards.filter((c) => c.cardType === "lead")
        : filter === "appointments"
          ? visibleCards.filter((c) => c.cardType === "appointment")
          : filter === "urgent"
            ? visibleCards.filter((c) => c.cardType === "emergency")
            : filter === "outbound"
              ? visibleCards.filter((c) => c.cardType === "outbound")
              : filter === "spam"
                ? visibleCards.filter((c) => c.cardType === "spam")
                : visibleCards;

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{ta("selectWorkspace")}</p>
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
      if (!r.ok) throw new Error(data.error ?? ta("callFailed"));
      refetch(true);
    } catch (e) {
      setCallError(e instanceof Error ? e.message : ta("callFailed"));
    } finally {
      setCallInProgress(null);
    }
  };

  return (
    <Shell size="md" className="max-w-[600px]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)" }}>{ta("title")}</h1>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }} aria-live="polite">{ta("liveBadge")}</span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6 overflow-x-auto scrollbar-hide">
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{summary?.calls_last_7_days ?? 0}</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{ta("statCalls7d")}</p>
        </div>
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{summary?.calls_last_7_days ? "100%" : dash}</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{ta("statAnswered")}</p>
        </div>
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{leadsCount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{ta("statNewLeads")}</p>
        </div>
        <div className="min-w-[72px] rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{summary?.appointments_upcoming ?? 0}</p>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{ta("statAppts")}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
        {FILTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background: filter === id ? "var(--accent-primary-subtle)" : "var(--bg-elevated)",
              color: filter === id ? "var(--accent-primary)" : "var(--text-secondary)",
            }}
          >
            {ta(`filters.${id}` as const)}
          </button>
        ))}
      </div>

      {loading ? (
        <ActivityFeedSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border py-12 px-6 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{ta("noCallsYet")}</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>{ta("noCallsHint")}</p>
          <Link href="/docs#call-forwarding" className="inline-block mt-2 text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{ta("setUpForwarding")}</Link>
          <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>·</span>
          <Link href="/dashboard/record" className="inline-block mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{ta("recordACall")}</Link>
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
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{formatTime(card.call_started_at, dash)}</span>
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
                            {callInProgress === card.lead_id ? ta("calling") : ta("callBack")}
                          </button>
                          <Link
                            href={`/dashboard/messages?lead=${card.lead_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> {ta("message")}
                          </Link>
                          <Link
                            href={`/dashboard/record/lead/${card.lead_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                          >
                            {ta("view")}
                          </Link>
                        </>
                      )}
                      <Link
                        href={`/dashboard/calls/${card.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                      >
                        {ta("viewDetails")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleMarkDone(card.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
                        style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
                      >
                        <Check className="w-3.5 h-3.5" /> {ta("markDone")}
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
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>{ta("requiresAttention")}</h2>
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
