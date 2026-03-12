"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, PhoneCall, Play, FileText, MessageSquare, UserPlus, Flag, Brain } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch, ApiError } from "@/lib/api";

const PAGE_TITLE = "Calls — Recall Touch";

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

const OUTCOME_LABELS: Record<Exclude<CallOutcome, null>, string> = {
  appointment: "Booked",
  lead: "Lead",
  info: "Info",
  transfer: "Transferred",
  voicemail: "Voicemail",
  missed: "Missed",
};

const TYPE_LABELS: Record<Exclude<CallType, null>, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
};

const SENTIMENT_LABELS: Record<Exclude<CallSentiment, null>, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

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
  try {
    const raw = window.localStorage.getItem(`${CALLS_SNAPSHOT_PREFIX}${workspaceId}`);
    const parsed = raw ? (JSON.parse(raw) as CallRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCallsSnapshot(workspaceId: string, calls: CallRecord[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(
      `${CALLS_SNAPSHOT_PREFIX}${workspaceId}`,
      JSON.stringify(calls),
    );
  } catch {
    // ignore persistence errors
  }
}

export default function CallsPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialRecords = readCallsSnapshot(snapshotWorkspaceId);
  const [loading, setLoading] = useState(initialRecords.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<CallRecord[]>(initialRecords);
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<NonNullable<CallOutcome> | "all">("all");
  const [sentimentFilter, setSentimentFilter] =
    useState<NonNullable<CallSentiment> | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedCall?.id) return;
    try {
      const raw = localStorage.getItem(`rt_call_notes_${selectedCall.id}`);
      if (raw) {
        // This effect syncs localStorage into component state for the
        // currently selected call. It is safe to update local state here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCallNotes((prev) => ({ ...prev, [selectedCall.id]: raw }));
      }
    } catch {
      // ignore
    }
  }, [selectedCall?.id]);

  useEffect(() => {
    if (!workspaceId) return;
    apiFetch<{ calls?: CallRecord[] }>(
      `/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include", timeout: 8000, retries: 1 },
    )
      .then((data) => {
        const next = data.calls ?? [];
        setError(null);
        setRecords(next);
        persistCallsSnapshot(workspaceId, next);
      })
      .catch((err) => {
        const message =
          err instanceof ApiError && err.status === 408
            ? "Request timed out. Try again."
            : "Could not load calls for this workspace.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
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
  }, [records, query, outcomeFilter, sentimentFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);

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
    if (s === "positive") return "bg-emerald-500";
    if (s === "negative") return "bg-rose-500";
    return "bg-amber-400";
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-zinc-400" />
            Call log
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Every answered call, decision, and follow-up in one place.
          </p>
        </div>
        <Link
          href="/app/calls/live"
          className="inline-flex items-center gap-1.5 border border-zinc-700 text-zinc-300 rounded-xl px-4 py-2 text-sm font-medium hover:bg-zinc-800 hover:text-white"
        >
          Live
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
                toast.error("Export failed. Try again.");
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `recall-touch-calls-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              toast.success("Calls exported. Check your downloads.");
            } catch {
              toast.error("Export failed. Try again.");
            }
          }}
          className="text-xs md:text-sm rounded-xl border border-[var(--border-default)] px-4 py-2 text-zinc-200 hover:bg-[var(--bg-input)]"
        >
          Export CSV
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
            placeholder="Search by caller or phone…"
            className="bg-[var(--bg-input)] border-[var(--border-default)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value as NonNullable<CallOutcome> | "all");
              setPage(1);
            }}
            className="text-xs md:text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-[var(--border-medium)]"
            aria-label="Filter by outcome"
          >
            <option value="all">All</option>
            <option value="appointment">Booked</option>
            <option value="lead">Lead</option>
            <option value="info">Info</option>
            <option value="transfer">Transferred</option>
            <option value="missed">Missed</option>
            <option value="voicemail">Voicemail</option>
          </select>
          <select
            value={sentimentFilter}
            onChange={(e) => {
              setSentimentFilter(e.target.value as NonNullable<CallSentiment> | "all");
              setPage(1);
            }}
            className="text-xs md:text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-[var(--border-medium)]"
            aria-label="Filter by sentiment"
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-xs md:text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-[var(--border-medium)]"
          >
            <option value="newest">Newest first</option>
            <option value="duration">Longest calls</option>
            <option value="sentiment">Best sentiment</option>
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
      ) : error ? (
        <div className="mt-6 text-sm text-[var(--accent-red)]" role="alert">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <EmptyState
            icon={PhoneCall}
            title="No calls yet"
            description="Connect your phone number to get started. Calls will appear here with transcripts and summaries."
            primaryAction={{ label: "Connect number →", href: "/app/settings/phone" }}
            secondaryAction={{ label: "Test your agent →", href: "/app/agents" }}
          />
        </div>
      ) : (
      <div className="hidden md:block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Date / time</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Caller</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Phone</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Duration</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Outcome</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Sentiment</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Agent</th>
              <th className="py-3 px-4 text-right text-xs font-medium text-zinc-500 w-20" aria-label="Actions" />
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
                "Caller";
              const sentiment =
                (c.analysis_outcome as { sentiment?: CallSentiment } | undefined)?.sentiment ??
                null;
              const _kind: Exclude<CallType, null> = "inbound";
              const outcomeKey = (c.outcome ?? "lead") as Exclude<CallOutcome, null>;
              const sentimentEmoji = sentiment === "positive" ? "🙂" : sentiment === "negative" ? "😞" : sentiment === "neutral" ? "😐" : null;
              const durationLabel = durSec > 0 ? `${durMin}m ${(durSec % 60).toString().padStart(2, "0")}s` : "—";
              return (
                <tr
                  key={c.id}
                  className="group border-t border-zinc-900/70 hover:bg-[var(--bg-hover)] cursor-pointer"
                  onClick={() => handleRowClick(c.id)}
                >
                  <td className="py-3 px-4 text-xs text-zinc-400 whitespace-nowrap">
                    {d
                      ? `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-100">{name}</td>
                  <td className="py-3 px-4 text-xs text-zinc-400">
                    {(c.matched_lead as { phone?: string | null } | undefined)?.phone ?? c.matched_lead?.email ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <Badge variant="neutral">{durationLabel}</Badge>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <Badge variant={outcomeKey === "appointment" ? "appointment" : outcomeKey === "lead" ? "lead" : "neutral"}>
                      {OUTCOME_LABELS[outcomeKey] ?? c.outcome ?? "—"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-200">
                    {sentimentEmoji && <span aria-hidden>{sentimentEmoji}</span>}
                    {!sentimentEmoji && sentiment && <span>{SENTIMENT_LABELS[sentiment]}</span>}
                    {!sentiment && !sentimentEmoji && <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-300">
                    {c.matched_lead?.name ? "Agent" : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label="Play recording"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                        onClick={() => handleRowClick(c.id)}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="View transcript"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
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
                <td colSpan={9} className="py-8 px-4 text-center text-sm text-zinc-500">
                  No calls match these filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
            "Caller";
          const sentiment =
            (c.analysis_outcome as { sentiment?: CallSentiment } | undefined)?.sentiment ??
            null;
          const kind: Exclude<CallType, null> = "inbound";
          return (
              <button
                key={c.id}
                type="button"
                onClick={() => router.push(`/app/calls/${c.id}`)}
                className="w-full text-left rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex flex-col gap-1.5"
              >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-100 truncate">{name}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                  {sentiment ? (
                    <>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${sentimentDotColor(sentiment)}`}
                      />
                      {SENTIMENT_LABELS[sentiment]}
                    </>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {d
                  ? `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "—"}
              </p>
              <p className="text-xs text-zinc-400">
                {c.matched_lead?.email ?? "—"}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                  <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5">
                    {TYPE_LABELS[kind]}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5">
                    {OUTCOME_LABELS[(c.outcome ?? "lead") as Exclude<CallOutcome, null>]}
                  </span>
                </div>
                <span className="text-xs text-zinc-300">
                  {durSec > 0 ? (
                    <>
                      {durMin}m {durSec.toString().padStart(2, "2")}s
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Agent: {c.matched_lead?.name ? "Assigned" : "—"}
              </p>
            </button>
          );
        })}
        {pageItems.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">No calls match these filters yet.</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span>
          Showing {pageItems.length === 0 ? 0 : start + 1}–
          {Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} calls
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe === 1}
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--border-default)] text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-input)]"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="mx-1">
            Page {pageSafe} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe === totalPages}
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--border-default)] text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-input)]"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <Sheet
        open={!!selectedCall}
        onClose={() => setSelectedCall(null)}
        title={selectedCall ? "Call details" : undefined}
      >
        {selectedCall && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedCall.matched_lead?.name ??
                  selectedCall.matched_lead?.company ??
                  selectedCall.matched_lead?.email ??
                  "Caller"}
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
                  {OUTCOME_LABELS[(selectedCall.outcome ?? "lead") as Exclude<CallOutcome, null>] ?? selectedCall.outcome}
                </Badge>
                {(() => {
                  const s = (selectedCall.analysis_outcome as { sentiment?: CallSentiment })?.sentiment ?? null;
                  return s ? (
                    <Badge variant={s === "positive" ? "success" : s === "negative" ? "error" : "neutral"}>
                      {s === "positive" ? "🙂 Positive" : s === "negative" ? "😞 Negative" : "😐 Neutral"}
                    </Badge>
                  ) : null;
                })()}
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Agent: {selectedCall.matched_lead?.name ? "Assigned" : "—"}
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
                    View lead details →
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
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Transcript</p>
              {drawerLoading ? (
                <p className="text-xs text-[var(--text-tertiary)]">Loading…</p>
              ) : selectedCall.transcript_text ? (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 max-h-48 overflow-y-auto">
                  <p className="text-[11px] text-[var(--text-tertiary)] mb-1">
                    Transcript (AI-processed, caller and agent turns)
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {selectedCall.transcript_text}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">No transcript for this call.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">AI Summary</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {selectedCall.summary ?? "No summary available."}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                Call intelligence
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
                Send this call to Call Intelligence to compare patterns, coaching insights, and recurring objections over time.
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
                Add to Call Intelligence
              </Button>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Actions taken</p>
              <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-0.5">
                {selectedCall.outcome === "appointment" && <li>Appointment booked</li>}
                {selectedCall.outcome === "lead" && <li>Lead captured</li>}
                {selectedCall.outcome === "transfer" && <li>Call transferred</li>}
                {selectedCall.outcome === "voicemail" && <li>Voicemail left</li>}
                {!["appointment", "lead", "transfer", "voicemail"].includes(selectedCall.outcome ?? "") && (
                  <li>Call handled</li>
                )}
              </ul>
            </div>

            <div>
              <label htmlFor="call-notes" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes</label>
              <textarea
                id="call-notes"
                value={callNotes[selectedCall.id] ?? ""}
                onChange={(e) => setCallNotes((prev) => ({ ...prev, [selectedCall.id]: e.target.value }))}
                onBlur={() => {
                  try {
                    const key = `rt_call_notes_${selectedCall.id}`;
                    const v = callNotes[selectedCall.id] ?? "";
                    if (v) localStorage.setItem(key, v);
                    else localStorage.removeItem(key);
                  } catch {
                    // ignore
                  }
                }}
                placeholder="Add notes…"
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
                Call back
              </a>
              <Button variant="secondary" size="sm">
                <MessageSquare className="h-3.5 w-3.5" />
                Send SMS
              </Button>
              <Link
                href="/app/leads"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-hover)]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add to leads
              </Link>
              <Button variant="ghost" size="sm">
                <Flag className="h-3.5 w-3.5" />
                Flag
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

