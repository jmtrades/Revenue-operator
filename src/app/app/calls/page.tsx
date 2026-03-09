"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, PhoneCall } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { EmptyState } from "@/components/EmptyState";

const PAGE_TITLE = "Calls — Recall Touch";

type CallType = "inbound" | "outbound" | null;
type CallOutcome = "appointment" | "lead" | "info" | "transfer" | "voicemail" | null;
type CallSentiment = "positive" | "neutral" | "negative" | null;

interface CallRecord {
  id: string;
  lead_id?: string | null;
  matched_lead_id?: string | null;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  outcome?: string | null;
  matched_lead?: { name?: string | null; email?: string | null; company?: string | null } | null;
  analysis_outcome?: unknown;
  started_at?: string | null;
  transcript_text?: string | null;
  summary?: string | null;
}

const PAGE_SIZE = 10;
const CALLS_SNAPSHOT_PREFIX = "rt_calls_snapshot:";

const OUTCOME_LABELS: Record<Exclude<CallOutcome, null>, string> = {
  appointment: "Appointment",
  lead: "Lead",
  info: "Info",
  transfer: "Transfer",
  voicemail: "Voicemail",
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

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load calls");
        return r.json();
      })
      .then((data: { calls?: CallRecord[] }) => {
        const next = data.calls ?? [];
        setError(null);
        setRecords(next);
        persistCallsSnapshot(workspaceId, next);
      })
      .catch(() => setError("Could not load calls for this workspace."))
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
        <button
          type="button"
          onClick={async () => {
            if (!workspaceId) return;
            try {
              const res = await fetch(
                `/api/calls/export?workspace_id=${encodeURIComponent(workspaceId)}`,
                { credentials: "include" },
              );
              if (!res.ok) return;
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
            } catch {
              // silent failure; future: toast
            }
          }}
          className="text-xs md:text-sm rounded-xl border border-[var(--border-default)] px-4 py-2 text-zinc-200 hover:bg-[var(--bg-input)]"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)]"
            placeholder="Search by caller or phone…"
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
          >
            <option value="all">All outcomes</option>
            {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={sentimentFilter}
            onChange={(e) => {
              setSentimentFilter(e.target.value as NonNullable<CallSentiment> | "all");
              setPage(1);
            }}
            className="text-xs md:text-sm rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-[var(--border-medium)]"
          >
            <option value="all">All sentiment</option>
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
        <div className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8">
          <div className="h-8 w-48 rounded-lg bg-zinc-800 animate-pulse mb-4" />
          <div className="h-4 w-full max-w-xl rounded bg-zinc-800/80 animate-pulse mb-2" />
          <div className="h-4 w-3/4 max-w-md rounded bg-zinc-800/60 animate-pulse" />
        </div>
      ) : error ? (
        <div className="mt-6 text-sm text-[var(--accent-red)]" role="alert">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <EmptyState
            icon={<PhoneCall className="h-6 w-6" />}
            title="No calls yet"
            description="Connect your phone number to get started. Calls will appear here with transcripts and summaries."
            actions={
              <>
                <Link
                  href="/app/settings/phone"
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                >
                  Connect number →
                </Link>
                <Link
                  href="/app/agents"
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[var(--border-medium)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                >
                  Test your agent →
                </Link>
              </>
            }
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
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Type</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Outcome</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Sentiment</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Agent</th>
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
              const kind: Exclude<CallType, null> = "inbound";
              return (
                <tr
                  key={c.id}
                  className="border-t border-zinc-900/70 hover:bg-[var(--bg-hover)] cursor-pointer"
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
                    {c.matched_lead?.email ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-300">
                    {durSec > 0 ? (
                      <>
                        {durMin}m {durSec.toString().padStart(2, "0")}s
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5 text-[11px] text-zinc-200">
                      {TYPE_LABELS[kind]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5 text-[11px] text-zinc-200">
                      {OUTCOME_LABELS[(c.outcome ?? "lead") as Exclude<CallOutcome, null>]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span className="inline-flex items-center gap-1 text-zinc-200">
                      {sentiment && (
                        <>
                          <span
                            className={`h-2 w-2 rounded-full ${sentimentDotColor(sentiment)}`}
                          />
                          <span>{SENTIMENT_LABELS[sentiment]}</span>
                        </>
                      )}
                      {!sentiment && <span className="text-zinc-500">—</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-300">
                    {c.matched_lead?.name ? "Agent" : "—"}
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 px-4 text-center text-sm text-zinc-500">
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

      {selectedCall && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={() => setSelectedCall(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close call details"
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-lg bg-black border-l border-[var(--border-default)] shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Call</p>
                <h2 className="text-lg font-semibold text-white">
                  {selectedCall.matched_lead?.name ??
                    selectedCall.matched_lead?.company ??
                    selectedCall.matched_lead?.email ??
                    "Caller"}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedCall.call_started_at
                    ? new Date(
                        selectedCall.call_started_at,
                      ).toLocaleString()
                    : "Time unknown"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="text-zinc-500 hover:text-white text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                  Summary
                </h3>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {selectedCall.summary || "No summary available for this call yet."}
                </p>
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                  Transcript
                </h3>
                {drawerLoading ? (
                  <p className="text-xs text-zinc-500">Loading transcript…</p>
                ) : selectedCall.transcript_text ? (
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {selectedCall.transcript_text}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    No transcript stored for this call.
                  </p>
                )}
              </section>
            </div>
            <div className="px-5 py-4 border-t border-[var(--border-default)] flex justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push(`/app/calls/${selectedCall.id}`)}
                className="flex-1 rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-zinc-200 hover:bg-[var(--bg-input)]"
              >
                Open full call
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100"
              >
                Add to knowledge
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

