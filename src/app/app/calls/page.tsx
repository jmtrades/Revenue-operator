"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Search, ChevronLeft, ChevronRight, PhoneCall, Play, FileText, MessageSquare, UserPlus, Flag, Brain, AlertCircle, Smile, Frown, Minus } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { apiFetch, ApiError } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/useDebounce";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";

type CallType = "inbound" | "outbound" | null;
type CallOutcome = "appointment" | "lead" | "info" | "transfer" | "voicemail" | "missed" | null;
type CallSentiment = "positive" | "neutral" | "negative" | null;

interface CallRecord {
  id: string;
  lead_id?: string | null;
  matched_lead_id?: string | null;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  outcome?: string | null;
  matched_lead?: { name?: string | null; email?: string | null; company?: string | null; phone?: string | null } | null;
  analysis_outcome?: unknown;
  started_at?: string | null;
  transcript_text?: string | null;
  summary?: string | null;
  recording_url?: string | null;
}

const PAGE_SIZE = 10;
const CALLS_SNAPSHOT_PREFIX = "rt_calls_snapshot:";

const getOutcomeLabels = (t: (k: string) => string): Record<Exclude<CallOutcome, null>, string> => ({
  appointment: t("calls.outcomes.booked"),
  lead: t("calls.outcomes.lead"),
  info: t("calls.outcomes.info"),
  transfer: t("calls.outcomes.transferred"),
  voicemail: t("calls.outcomes.voicemail"),
  missed: t("calls.outcomes.missed"),
});

const getTypeLabels = (t: (k: string) => string): Record<Exclude<CallType, null>, string> => ({
  inbound: t("calls.types.inbound"),
  outbound: t("calls.types.outbound"),
});

const getSentimentLabels = (t: (k: string) => string): Record<Exclude<CallSentiment, null>, string> => ({
  positive: t("calls.sentiments.positive"),
  neutral: t("calls.sentiments.neutral"),
  negative: t("calls.sentiments.negative"),
});

const AudioPlayer = dynamic(
  () => import("@/components/ui/AudioPlayer").then((mod) => mod.AudioPlayer),
  { ssr: false },
);

type SortKey = "newest" | "duration" | "sentiment";

function durationSeconds(c: CallRecord): number {
  const start = c.call_started_at ?? c.started_at ?? null;
  const end = c.call_ended_at ?? null;
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.floor((e - s) / 1000));
}

function readCallsSnapshot(workspaceId: string): CallRecord[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  const key = `${CALLS_SNAPSHOT_PREFIX}${workspaceId}`;
  try {
    const raw = safeGetItem(key);
    const parsed = raw ? (JSON.parse(raw) as CallRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    safeRemoveItem(key);
    return [];
  }
}

function persistCallsSnapshot(workspaceId: string, calls: CallRecord[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  safeSetItem(`${CALLS_SNAPSHOT_PREFIX}${workspaceId}`, JSON.stringify(calls));
}

export default function CallsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialRecords = readCallsSnapshot(snapshotWorkspaceId);
  const [loading, setLoading] = useState(initialRecords.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [records, setRecords] = useState<CallRecord[]>(initialRecords);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [outcomeFilter, setOutcomeFilter] = useState<NonNullable<CallOutcome> | "all">("all");
  const [sentimentFilter, setSentimentFilter] =
    useState<NonNullable<CallSentiment> | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});
  const [flaggedCalls, setFlaggedCalls] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = safeGetItem("flagged_calls");
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const [notesStatus, setNotesStatus] = useState<Record<string, "saving" | "saved" | null>>({});
  const outcomeLabels = useMemo(() => getOutcomeLabels(t), [t]);
  const sentimentLabels = useMemo(() => getSentimentLabels(t), [t]);
  const typeLabels = useMemo(() => getTypeLabels(t), [t]);

  useEffect(() => {
    if (!selectedCall?.id) return;
    const raw = safeGetItem(`rt_call_notes_${selectedCall.id}`);
    if (raw) {
      // This effect syncs localStorage into component state for the
      // currently selected call. It is safe to update local state here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCallNotes((prev) => ({ ...prev, [selectedCall.id]: raw }));
    }
  }, [selectedCall?.id]);

  useEffect(() => {
    if (!workspaceId) return;
    apiFetch<{ calls?: CallRecord[] }>(
      `/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include", timeout: 8000, retries: 1 },
    )
      .then((data) => {
        const next = Array.isArray(data?.calls) ? data.calls : [];
        setError(null);
        setRecords(next);
        if (next.length > 0) persistCallsSnapshot(workspaceId, next);
      })
      .catch((err) => {
        const message =
          err instanceof ApiError && err.status === 408
            ? t("calls.errors.timeout")
            : t("calls.errors.loadFailed");
        setError(message);
        toast.error(t("calls.errors.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [workspaceId, t, retryTrigger]);

  const filtered = useMemo(() => {
    const q = (debouncedQuery ?? "").trim().toLowerCase();
    let list = [...records];
    if (q) {
      list = list.filter((c) => {
        const name = c.matched_lead?.name ?? c.matched_lead?.company ?? "";
        return (
          name.toLowerCase().includes(q) ||
          (c.matched_lead?.email ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (outcomeFilter !== "all") {
      list = list.filter((c) => (c.outcome ?? null) === outcomeFilter);
    }
    if (sentimentFilter !== "all") {
      list = list.filter((c) => {
        const ao = (c.analysis_outcome as { sentiment?: CallSentiment } | undefined)?.sentiment ?? null;
        return ao === sentimentFilter;
      });
    }

    list.sort((a, b) => {
      const startA = a.call_started_at ?? a.started_at ?? null;
      const startB = b.call_started_at ?? b.started_at ?? null;
      if (sort === "newest") {
        return new Date(startB ?? 0).getTime() - new Date(startA ?? 0).getTime();
      }
      if (sort === "duration") {
        const durA = durationSeconds(a);
        const durB = durationSeconds(b);
        return durB - durA;
      }
      if (sort === "sentiment") {
        const score = (c: CallRecord) => {
          const s = (c.analysis_outcome as { sentiment?: CallSentiment } | undefined)?.sentiment ?? null;
          if (s === "positive") return 3;
          if (s === "neutral") return 2;
          if (s === "negative") return 1;
          return 0;
        };
        return score(b) - score(a);
      }
      return 0;
    });

    return list;
  }, [records, debouncedQuery, outcomeFilter, sentimentFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    document.title = t("calls.pageTitle", { defaultValue: "Calls — Revenue Operator" });
    return () => {
      document.title = "";
    };
  }, [t]);

  const handleRowClick = (id: string) => {
    const existing = records.find((c) => c.id === id);
    if (existing && existing.summary && existing.transcript_text) {
      setSelectedCall(existing);
      return;
    }
    setDrawerLoading(true);
    fetch(`/api/calls/${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data:
            | {
                call?: CallRecord;
              }
            | null,
        ) => {
          if (data?.call) {
            setSelectedCall(data.call);
          } else if (existing) {
            setSelectedCall(existing);
          }
        },
      )
      .catch(() => {
        if (existing) {
          setSelectedCall(existing);
        }
      })
      .finally(() => setDrawerLoading(false));
  };

  const sentimentDotColor = (s: CallSentiment): string => {
    if (s === "positive") return "bg-[var(--accent-primary)]";
    if (s === "negative") return "bg-[var(--accent-danger,#ef4444)]";
    return "bg-[var(--accent-warning,#f59e0b)]";
  };

  const toggleFlagCall = (callId: string) => {
    setFlaggedCalls((prev) => {
      const next = new Set(prev);
      const isFlagged = next.has(callId);
      if (isFlagged) {
        next.delete(callId);
        toast.success(t("calls.toast.flagRemoved"));
      } else {
        next.add(callId);
        toast.success(t("calls.toast.flagged"));
      }
      safeSetItem("flagged_calls", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const saveCallNotes = async (callId: string, notes: string) => {
    setNotesStatus((prev) => ({ ...prev, [callId]: "saving" }));
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/notes`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error(t("calls.errors.noteSaveFailed"));
      setNotesStatus((prev) => ({ ...prev, [callId]: "saved" }));
      setTimeout(() => setNotesStatus((prev) => ({ ...prev, [callId]: null })), 2000);
    } catch (err) {
      safeSetItem(`rt_call_notes_${callId}`, notes);
      setNotesStatus((prev) => ({ ...prev, [callId]: null }));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <Breadcrumbs items={[{ label: t("common.home"), href: "/app" }, { label: t("calls.heading", { defaultValue: "Calls" }) }]} />
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-[var(--text-tertiary)]" />
            {t("calls.heading", { defaultValue: "Call log" })}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            {t("calls.subtitle", { defaultValue: "Call execution log. Every inbound and outbound call, with AI intelligence and next-action recommendations." })}
          </p>
        </div>
        <Link
          href="/app/calls/live"
          className="inline-flex items-center gap-1.5 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-xl px-4 py-2 text-sm font-medium hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)]"
        >
          {t("calls.liveLabel", { defaultValue: "Live" })}
        </Link>
        <button
          type="button"
          onClick={async () => {
            if (!workspaceId) return;
            try {
              const res = await fetch(
                `/api/calls/export?workspace_id=${encodeURIComponent(workspaceId)}`,
                { credentials: "include" },
              );
              if (!res.ok) {
                toast.error(t("calls.errors.exportFailed"));
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `revenue-operator-calls-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              toast.success(t("calls.toast.exportSuccess"));
            } catch {
              toast.error(t("calls.errors.exportFailed"));
            }
          }}
          className="text-xs md:text-sm rounded-xl border border-[var(--border-default)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-input)]"
        >
          {t("calls.exportCsv", { defaultValue: "Export CSV" })}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="flex-1 min-w-[180px]">
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            icon={Search}
            placeholder={t("calls.searchPlaceholder", { defaultValue: "Search by caller or phone…" })}
            className="bg-[var(--bg-input)] border-[var(--border-default)]"
          />
          {(debouncedQuery || outcomeFilter !== "all" || sentimentFilter !== "all") && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
              Showing {pageItems.length} of {filtered.length} {filtered.length === 1 ? "call" : "calls"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value as NonNullable<CallOutcome> | "all");
              setPage(1);
            }}
            className="text-xs md:text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            aria-label={t("calls.filterOutcome", { defaultValue: "Filter by outcome" })}
          >
            <option value="all">{t("calls.all", { defaultValue: "All" })}</option>
            <option value="appointment">{t("calls.outcomes.booked")}</option>
            <option value="lead">{t("calls.outcomes.lead")}</option>
            <option value="info">{t("calls.outcomes.info")}</option>
            <option value="transfer">{t("calls.outcomes.transferred")}</option>
            <option value="missed">{t("calls.outcomes.missed")}</option>
            <option value="voicemail">{t("calls.outcomes.voicemail")}</option>
          </select>
          <select
            value={sentimentFilter}
            onChange={(e) => {
              setSentimentFilter(e.target.value as NonNullable<CallSentiment> | "all");
              setPage(1);
            }}
            className="text-xs md:text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            aria-label={t("calls.filterSentiment", { defaultValue: "Filter by sentiment" })}
          >
            <option value="all">{t("calls.all", { defaultValue: "All" })}</option>
            <option value="positive">{t("calls.sentiments.positive")}</option>
            <option value="neutral">{t("calls.sentiments.neutral")}</option>
            <option value="negative">{t("calls.sentiments.negative")}</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-xs md:text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
          >
            <option value="newest">{t("calls.sort.newest")}</option>
            <option value="duration">{t("calls.sort.longest")}</option>
            <option value="sentiment">{t("calls.sort.bestSentiment")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 flex items-center gap-3">
              <Skeleton variant="rectangular" className="h-9 w-40 rounded-xl" />
              <Skeleton variant="rectangular" className="h-9 w-32 rounded-xl" />
              <Skeleton variant="rectangular" className="h-9 w-32 rounded-xl" />
            </div>
            <Skeleton variant="rectangular" className="h-9 w-28 rounded-xl" />
          </div>
          <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="grid grid-cols-[1.5fr,1.2fr,1fr,0.9fr,1fr,1fr,1fr,0.5fr] gap-2 px-4 py-3 border-b border-[var(--border-default)]">
              <Skeleton variant="text" className="h-4 w-24" />
              <Skeleton variant="text" className="h-4 w-20" />
              <Skeleton variant="text" className="h-4 w-16" />
              <Skeleton variant="text" className="h-4 w-16" />
              <Skeleton variant="text" className="h-4 w-16" />
              <Skeleton variant="text" className="h-4 w-16" />
              <Skeleton variant="text" className="h-4 w-16" />
              <Skeleton variant="text" className="h-4 w-10" />
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1.5fr,1.2fr,1fr,0.9fr,1fr,1fr,1fr,0.5fr] gap-2 px-4 py-3">
                  <Skeleton variant="text" className="h-4 w-32" />
                  <Skeleton variant="text" className="h-4 w-28" />
                  <Skeleton variant="text" className="h-4 w-24" />
                  <Skeleton variant="text" className="h-4 w-16" />
                  <Skeleton variant="text" className="h-4 w-20" />
                  <Skeleton variant="text" className="h-4 w-16" />
                  <Skeleton variant="text" className="h-4 w-24" />
                  <Skeleton variant="circular" className="h-6 w-6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : error && records.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-danger,#ef4444)]/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-[var(--accent-danger,#ef4444)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("calls.errors.errorTitle")}</h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setLoading(true); setRetryTrigger((c) => c + 1); }}
            className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:opacity-90"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : error ? (
        <div className="mt-6 text-sm text-[var(--accent-red)]" role="alert">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <EmptyState
            icon={PhoneCall}
            title={t("calls.emptyTitle") ?? "Your operator is standing by"}
            description={t("calls.emptyDescription") ?? "Connect your number and it answers every call in under 3 seconds — 24/7, no breaks, no missed revenue. Every call will appear here with full AI intelligence."}
            primaryAction={{ label: t("calls.testCall") ?? "Test Call", href: "/app/settings/phone" }}
          />
        </div>
      ) : (
      <Card className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("calls.table.dateTime", { defaultValue: "Date / time" })}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("calls.table.caller", { defaultValue: "Caller" })}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("calls.table.phone", { defaultValue: "Phone" })}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("calls.table.duration", { defaultValue: "Duration" })}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("calls.table.outcome", { defaultValue: "Outcome" })}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("calls.table.sentiment", { defaultValue: "Sentiment" })}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("calls.table.agent", { defaultValue: "Agent" })}</th>
              <th className="py-3 px-4 text-right text-xs font-medium text-[var(--text-secondary)] w-20" aria-label={t("calls.table.actions", { defaultValue: "Actions" })} />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => {
              const started = c.call_started_at ?? c.started_at ?? null;
              const d = started ? new Date(started) : null;
              const durSec = durationSeconds(c);
              const durMin = Math.floor(durSec / 60);
              const name =
                c.matched_lead?.name ??
                c.matched_lead?.company ??
                c.matched_lead?.email ??
                t("calls.defaultCaller");
              const sentiment =
                (c.analysis_outcome as { sentiment?: CallSentiment } | undefined)?.sentiment ??
                null;
              const _kind: Exclude<CallType, null> = "inbound";
              const outcomeKey = (c.outcome ?? "lead") as Exclude<CallOutcome, null>;
              const sentimentIcon = sentiment === "positive" ? <Smile className="w-4 h-4 text-[var(--accent-primary)]" /> : sentiment === "negative" ? <Frown className="w-4 h-4 text-[var(--accent-danger,#ef4444)]" /> : sentiment === "neutral" ? <Minus className="w-4 h-4 text-[var(--text-tertiary)]" /> : null;
              const durationLabel = durSec > 0 ? `${durMin}m ${(durSec % 60).toString().padStart(2, "0")}s` : "—";
              return (
                <tr
                  key={c.id}
                  className="group border-t border-[var(--border-default)]/70 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30"
                  onClick={() => handleRowClick(c.id)}
                >
                  <td className="py-3 px-4 text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                    {d
                      ? `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-primary)]">{name}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-tertiary)]">
                    {(c.matched_lead as { phone?: string | null } | undefined)?.phone ?? c.matched_lead?.email ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <Badge variant="neutral">{durationLabel}</Badge>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <Badge variant={outcomeKey === "appointment" ? "appointment" : outcomeKey === "lead" ? "lead" : "neutral"}>
                      {outcomeLabels[outcomeKey] ?? c.outcome ?? "—"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-primary)]">
                    {sentimentIcon && <span aria-hidden className="flex items-center gap-1">{sentimentIcon}</span>}
                    {!sentimentIcon && sentiment && <span>{sentimentLabels[sentiment]}</span>}
                    {!sentiment && !sentimentIcon && <span className="text-[var(--text-secondary)]">—</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                    {c.matched_lead?.name ? t("calls.table.agent") : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label={t("calls.playRecording")}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        onClick={() => handleRowClick(c.id)}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("calls.viewTranscript")}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        onClick={() => handleRowClick(c.id)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td             colSpan={9} className="py-8 px-4 text-center text-sm text-[var(--text-secondary)]">
                  {t("calls.noMatchFilters")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      )}

      <div className="md:hidden space-y-3 mt-2">
        {pageItems.map((c) => {
          const started = c.call_started_at ?? c.started_at ?? null;
          const d = started ? new Date(started) : null;
          const durSec = durationSeconds(c);
          const durMin = Math.floor(durSec / 60);
          const name =
            c.matched_lead?.name ??
            c.matched_lead?.company ??
            c.matched_lead?.email ??
            t("calls.defaultCaller");
          const sentiment =
            (c.analysis_outcome as { sentiment?: CallSentiment } | undefined)?.sentiment ??
            null;
          const outcomeKey = (c.outcome ?? "lead") as Exclude<CallOutcome, null>;
          return (
              <button
                key={c.id}
                type="button"
                onClick={() => router.push(`/app/calls/${c.id}`)}
                className="w-full text-left rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex flex-col gap-1.5"
              >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                  {sentiment ? (
                    <>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${sentimentDotColor(sentiment)}`}
                      />
                      {sentimentLabels[sentiment]}
                    </>
                  ) : (
                    <span className="text-[var(--text-secondary)]">—</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {d
                  ? `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "—"}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {c.matched_lead?.email ?? "—"}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                  <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5">
                    {outcomeLabels[outcomeKey]}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  {durSec > 0 ? (
                    <>
                      {durMin}m {durSec.toString().padStart(2, "0")}s
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {t("calls.agentLabel")} {c.matched_lead?.name ? t("calls.assigned") : "—"}
              </p>
            </button>
          );
        })}
        {pageItems.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">{t("calls.noMatchFilters")}</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
        <span>
          {t("calls.showing")} {pageItems.length === 0 ? 0 : start + 1}–
          {Math.min(start + PAGE_SIZE, filtered.length)} {t("calls.of")} {filtered.length} {t("calls.callsLabel")}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe === 1}
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-input)]"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="mx-1">
            {t("calls.page")} {pageSafe} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe === totalPages}
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-input)]"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <Sheet
        open={!!selectedCall}
        onClose={() => setSelectedCall(null)}
        title={selectedCall ? t("calls.details") : undefined}
      >
        {selectedCall && (
          <div className="space-y-5 relative">
            {drawerLoading && (
              <div className="absolute inset-0 z-40 bg-[var(--bg-primary)]/40 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedCall.matched_lead?.name ??
                  selectedCall.matched_lead?.company ??
                  selectedCall.matched_lead?.email ??
                  t("calls.defaultCaller")}
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {(selectedCall.matched_lead as { phone?: string | null })?.phone ?? selectedCall.matched_lead?.email ?? "—"}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {selectedCall.call_started_at
                  ? new Date(selectedCall.call_started_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                  : "—"}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="neutral">
                  {(() => {
                    const secs = durationSeconds(selectedCall);
                    if (!secs) return "—";
                    const m = Math.floor(secs / 60);
                    const s = secs % 60;
                    return `${m}m ${s.toString().padStart(2, "0")}s`;
                  })()}
                </Badge>
                <Badge variant={(selectedCall.outcome ?? "lead") === "appointment" ? "appointment" : (selectedCall.outcome ?? "lead") === "lead" ? "lead" : "neutral"}>
                  {outcomeLabels[(selectedCall.outcome ?? "lead") as Exclude<CallOutcome, null>] ?? selectedCall.outcome}
                </Badge>
                {(() => {
                  const s = (selectedCall.analysis_outcome as { sentiment?: CallSentiment })?.sentiment ?? null;
                  return s ? (
                    <Badge variant={s === "positive" ? "success" : s === "negative" ? "error" : "neutral"} className="flex items-center gap-1">
                      {s === "positive" ? <Smile className="w-3 h-3" /> : s === "negative" ? <Frown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {s === "positive" ? sentimentLabels.positive : s === "negative" ? sentimentLabels.negative : sentimentLabels.neutral}
                    </Badge>
                  ) : null;
                })()}
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                {t("calls.agentLabel")} {selectedCall.matched_lead?.name ? t("calls.assigned") : "—"}
              </p>
              {(selectedCall.lead_id || selectedCall.matched_lead_id) && (
                <div className="mt-2">
                  <Link
                    href={
                      selectedCall.lead_id
                        ? `/app/leads?leadId=${encodeURIComponent(selectedCall.lead_id)}`
                        : `/app/leads?leadId=${encodeURIComponent(
                            selectedCall.matched_lead_id as string,
                          )}`
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-primary)] hover:underline"
                  >
                    {t("calls.detail.viewLead")}
                  </Link>
                </div>
              )}
            </div>

            {selectedCall.recording_url && (
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Recording</p>
                <AudioPlayer src={selectedCall.recording_url} className="w-full" />
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t("calls.detail.transcript")}</p>
              {drawerLoading ? (
                <p className="text-xs text-[var(--text-tertiary)]">{t("common.loadingEllipsis")}</p>
              ) : selectedCall.transcript_text ? (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 max-h-48 overflow-y-auto">
                  <p className="text-[11px] text-[var(--text-tertiary)] mb-1">
                    {t("calls.detail.transcriptDesc")}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {selectedCall.transcript_text}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">{t("calls.detail.noTranscript")}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t("calls.aiSummary")}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {selectedCall.summary ?? t("calls.noSummary")}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                {t("calls.callIntelligenceLabel")}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
                {t("calls.callIntelligenceDesc")}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  router.push(
                    `/app/call-intelligence?call_id=${encodeURIComponent(selectedCall.id)}`,
                  )
                }
                className="inline-flex items-center gap-1.5"
              >
                <Brain className="h-3.5 w-3.5" />
                {t("calls.addToIntelligence")}
              </Button>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t("calls.detail.actionsTaken")}</p>
              <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-0.5">
                {selectedCall.outcome === "appointment" && <li>{t("calls.detail.actions.appointmentBooked")}</li>}
                {selectedCall.outcome === "lead" && <li>{t("calls.detail.actions.leadCaptured")}</li>}
                {selectedCall.outcome === "transfer" && <li>{t("calls.detail.actions.callTransferred")}</li>}
                {selectedCall.outcome === "voicemail" && <li>{t("calls.detail.actions.voicemailLeft")}</li>}
                {!["appointment", "lead", "transfer", "voicemail"].includes(selectedCall.outcome ?? "") && (
                  <li>{t("calls.detail.actions.callHandled")}</li>
                )}
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="call-notes" className="block text-xs font-medium text-[var(--text-secondary)]">{t("calls.detail.notes")}</label>
                {notesStatus[selectedCall.id] === "saving" && (
                  <span className="text-xs text-[var(--text-tertiary)]">Saving...</span>
                )}
                {notesStatus[selectedCall.id] === "saved" && (
                  <span className="text-xs text-[var(--accent-primary)]">Saved</span>
                )}
              </div>
              <textarea
                id="call-notes"
                value={callNotes[selectedCall.id] ?? ""}
                onChange={(e) => setCallNotes((prev) => ({ ...prev, [selectedCall.id]: e.target.value }))}
                onBlur={() => {
                  const key = `rt_call_notes_${selectedCall.id}`;
                  const v = callNotes[selectedCall.id] ?? "";
                  if (v) {
                    safeSetItem(key, v);
                    saveCallNotes(selectedCall.id, v);
                  } else {
                    safeRemoveItem(key);
                  }
                }}
                placeholder={t("calls.addNotesPlaceholder")}
                rows={3}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-default)]">
              <a
                href={(selectedCall.matched_lead as { phone?: string } | undefined)?.phone ? `tel:${(selectedCall.matched_lead as { phone: string }).phone}` : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-hover)]"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                {t("calls.detail.callBack")}
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const phone = (selectedCall.matched_lead as { phone?: string } | undefined)?.phone;
                  if (phone) {
                    toast.success(t("calls.toast.openingSms"));
                    router.push(`/app/inbox?phone=${encodeURIComponent(phone)}&channel=sms`);
                  } else {
                    toast.error(t("calls.toast.noPhoneForSms"));
                  }
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Send SMS
              </Button>
              <Link
                href="/app/leads"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-hover)]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("calls.detail.addToLeads")}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFlagCall(selectedCall.id)}
                className={flaggedCalls.has(selectedCall.id) ? "text-[var(--accent-danger,#ef4444)] hover:opacity-80" : ""}
              >
                <Flag className={`h-3.5 w-3.5 ${flaggedCalls.has(selectedCall.id) ? "fill-current" : ""}`} />
                {t("calls.detail.flag")}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

