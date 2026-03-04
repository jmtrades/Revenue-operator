"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, PhoneCall } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";

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
}

const PAGE_SIZE = 10;

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

export default function CallsPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<NonNullable<CallOutcome> | "all">("all");
  const [sentimentFilter, setSentimentFilter] =
    useState<NonNullable<CallSentiment> | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!workspaceId) return;
    setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);
    fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load calls");
        return r.json();
      })
      .then((data: { calls?: CallRecord[] }) => {
        setRecords(data.calls ?? []);
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
    router.push(`/app/calls/${id}`);
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
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
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
            className="text-xs md:text-sm rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
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
            className="text-xs md:text-sm rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
          >
            <option value="all">All sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-xs md:text-sm rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
          >
            <option value="newest">Newest first</option>
            <option value="duration">Longest calls</option>
            <option value="sentiment">Best sentiment</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
          <div className="h-8 w-48 rounded-lg bg-zinc-800 animate-pulse mb-4" />
          <div className="h-4 w-full max-w-xl rounded bg-zinc-800/80 animate-pulse mb-2" />
          <div className="h-4 w-3/4 max-w-md rounded bg-zinc-800/60 animate-pulse" />
        </div>
      ) : error ? (
        <div className="mt-6 text-sm text-red-400">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <PhoneCall className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
          <p className="text-sm font-medium text-white mb-1">No calls yet</p>
          <p className="text-xs text-zinc-500 mb-4">Once your AI starts taking calls, they&apos;ll appear here with full transcripts and summaries.</p>
          <Link href="/app/settings/phone" className="text-sm font-medium text-white underline underline-offset-2 hover:no-underline">Connect your number →</Link>
        </div>
      ) : (
      <div className="hidden md:block rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950/80">
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
                  className="border-t border-zinc-900/70 hover:bg-zinc-900/60 cursor-pointer"
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
                    <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200">
                      {TYPE_LABELS[kind]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200">
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
              onClick={() => handleRowClick(c.id)}
              className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col gap-1.5"
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
                  <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5">
                    {TYPE_LABELS[kind]}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5">
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
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-900"
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
            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-900"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

