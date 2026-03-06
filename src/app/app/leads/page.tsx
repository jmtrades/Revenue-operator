"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";

const PAGE_TITLE = "Leads — Recall Touch";

interface ApiLead {
  id: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  state: string;
  last_activity_at: string;
  opt_out?: boolean | null;
  deal_id?: string | null;
  value_cents?: number | null;
}

type ViewMode = "table" | "board";
type ScoreBucket = "all" | "high" | "medium" | "low";

type LeadStatus = "New" | "Contacted" | "Qualified" | "Appointment Set" | "Won" | "Lost";
type LeadSource = "Inbound Call" | "Outbound Outreach" | "Website" | "Referral";

const STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
];

const SCORE_COLORS: Record<ScoreBucket, string> = {
  high: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  low: "bg-rose-500/15 text-rose-200 border-rose-500/40",
  all: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

function scoreBucket(score: number): ScoreBucket {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function timeSince(iso: string): string {
  const d = new Date(iso).getTime();
  const diffMs = Date.now() - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}

type SortKey = "newest" | "score" | "recent-contact";

export default function LeadsPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([]);
  const [sourceFilter, setSourceFilter] = useState<LeadSource[]>([]);
  const [scoreFilter, setScoreFilter] = useState<ScoreBucket>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerLead, setDrawerLead] = useState<LeadView | null>(null);

  type LeadView = {
    id: string;
    name: string;
    phone: string;
    email: string;
    source: LeadSource;
    status: LeadStatus;
    score: number;
    service: string;
    createdAt: string;
    lastContactAt: string;
    assignedAgent: string;
    notes: string;
    linkedCallId?: string;
    timeline: { at: string; label: string }[];
  };

  const [leads, setLeads] = useState<LeadView[]>([]);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);
    fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load leads");
        return r.json();
      })
      .then((data: { leads?: ApiLead[] }) => {
        const apiLeads = data.leads ?? [];
        const mapped: LeadView[] = apiLeads.map((l, index) => {
          const name = l.name?.trim() || l.company?.trim() || "Lead";
          const status: LeadStatus =
            (l.state === "new" && "New") ||
            (l.state === "contacted" && "Contacted") ||
            (l.state === "qualified" && "Qualified") ||
            (l.state === "appointment_set" && "Appointment Set") ||
            (l.state === "won" && "Won") ||
            (l.state === "lost" && "Lost") ||
            "New";
          const source: LeadSource = "Inbound Call";
          const score: number = 60 + (index * 7) % 40;
          const service = l.company || "Service request";
          const createdAt = l.last_activity_at;
          const lastContactAt = l.last_activity_at;
          const assignedAgent = "Sarah";
          const notes =
            l.company && l.value_cents
              ? `${l.company} with potential value ~$${Math.round(
                  (l.value_cents ?? 0) / 100
                ).toLocaleString()}.`
              : "Lead captured from a recent conversation and kept in your pipeline.";
          const timeline = [
            { at: createdAt, label: "Created from recent activity" },
            { at: createdAt, label: "Lead added to active pipeline" },
          ];
          return {
            id: l.id,
            name,
            phone: "",
            email: l.email ?? "",
            source,
            status,
            score,
            service,
            createdAt,
            lastContactAt,
            assignedAgent,
            notes,
            linkedCallId: undefined,
            timeline,
          };
        });
        setLeads(mapped);
      })
      .catch(() => setError("Could not load leads for this workspace."))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const totalCount = leads.length;

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...leads];
    if (q) {
      list = list.filter((l) => {
        return (
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter.length > 0) {
      list = list.filter((l) => statusFilter.includes(l.status));
    }
    if (sourceFilter.length > 0) {
      list = list.filter((l) => sourceFilter.includes(l.source));
    }
    if (scoreFilter !== "all") {
      list = list.filter((l) => scoreBucket(l.score) === scoreFilter);
    }

    list.sort((a, b) => {
      if (sort === "score") {
        return b.score - a.score;
      }
      if (sort === "recent-contact") {
        return new Date(b.lastContactAt).getTime() - new Date(a.lastContactAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [leads, search, sort, sourceFilter, scoreFilter, statusFilter]);

  const groupedByStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadView[]>();
    STATUS_ORDER.forEach((s) => map.set(s, []));
    filteredLeads.forEach((lead) => {
      const arr = map.get(lead.status);
      if (arr) arr.push(lead);
    });
    return map;
  }, [filteredLeads]);

  const toggleStatusFilter = (status: LeadStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleSourceFilter = (source: LeadSource) => {
    setSourceFilter((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const toggleAllSelected = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkChangeStatus = (nextStatus: LeadStatus) => {
    if (selectedIds.size === 0) return;
    setLeads((prev) =>
      prev.map((l) => (selectedIds.has(l.id) ? { ...l, status: nextStatus } : l))
    );
  };

  const bulkAssignAgent = (agent: string) => {
    if (!agent || selectedIds.size === 0) return;
    setLeads((prev) =>
      prev.map((l) => (selectedIds.has(l.id) ? { ...l, assignedAgent: agent } : l))
    );
  };

  const openDrawer = (lead: LeadView) => {
    setDrawerLead(lead);
  };

  const closeDrawer = () => {
    setDrawerLead(null);
  };

  const scoreBadgeClass = (score: number): string => {
    const bucket = scoreBucket(score);
    return SCORE_COLORS[bucket];
  };

  const sources: LeadSource[] = ["Inbound Call", "Outbound Outreach", "Website", "Referral"];

  return (
    <>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-zinc-400" />
              Leads
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Every captured opportunity, from first call through decision.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-300">
              Total: <span className="ml-1 font-semibold text-white">{totalCount}</span>
            </span>
            <div className="hidden md:inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setView("table")}
                className={`px-3 py-1.5 rounded-lg ${
                  view === "table" ? "bg-white text-black font-medium" : "text-zinc-400"
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setView("board")}
                className={`px-3 py-1.5 rounded-lg ${
                  view === "board" ? "bg-white text-black font-medium" : "text-zinc-400"
                }`}
              >
                Board
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              placeholder="Search by name, phone, or email…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <Filter className="w-3 h-3" />
              Filters
            </span>
            <div className="flex flex-wrap gap-1">
              {STATUS_ORDER.map((status) => {
                const active = statusFilter.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] ${
                      active
                        ? "border-white bg-white text-black"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          {sources.map((source) => {
            const active = sourceFilter.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSourceFilter(source)}
                className={`px-2.5 py-1 rounded-full border ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {source}
              </button>
            );
          })}
          <div className="flex items-center gap-1 ml-auto">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as ScoreBucket)}
              className="text-xs rounded-xl bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="all">All scores</option>
              <option value="high">High (70+)</option>
              <option value="medium">Medium (40–69)</option>
              <option value="low">Low (0–39)</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-xs rounded-xl bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="newest">Newest</option>
              <option value="score">Highest score</option>
              <option value="recent-contact">Most recent contact</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            <span className="text-zinc-400">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
            <span className="h-4 w-px bg-zinc-800" />
            <span className="text-zinc-500">Change status:</span>
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => bulkChangeStatus(status)}
                className="px-2 py-1 rounded-full border border-zinc-800 text-[11px] text-zinc-300 hover:border-zinc-600"
              >
                {status}
              </button>
            ))}
            <span className="h-4 w-px bg-zinc-800" />
            <span className="text-zinc-500">Assign:</span>
            {["Sarah", "Alex", "Emma"].map((agent) => (
              <button
                key={agent}
                type="button"
                onClick={() => bulkAssignAgent(agent)}
                className="px-2 py-1 rounded-full border border-zinc-800 text-[11px] text-zinc-300 hover:border-zinc-600"
              >
                {agent}
              </button>
            ))}
          </div>
        )}

        {/* Table view */}
        <div className={view === "board" ? "hidden md:block" : ""}>
          {loading ? (
            <div className="mt-6 text-sm text-zinc-500">Loading leads…</div>
          ) : error ? (
            <div className="mt-6 text-sm text-red-400">{error}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
              <p className="text-sm font-medium text-white mb-1">Leads appear when your AI captures them</p>
              <p className="text-xs text-zinc-500 mb-4">Leads are created automatically from calls. Try a test call to see it in action.</p>
              <Link href="/demo" className="text-sm font-medium text-white underline underline-offset-2 hover:no-underline">Try demo →</Link>
            </div>
          ) : (
          <div className="hidden md:block rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950/80">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-white"
                      checked={
                        filteredLeads.length > 0 &&
                        selectedIds.size === filteredLeads.length
                      }
                      onChange={(e) => toggleAllSelected(e.target.checked)}
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Phone</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Score</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Source</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Service</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Agent</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Created</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">
                    Last contact
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const checked = selectedIds.has(lead.id);
                  const sb = scoreBucket(lead.score);
                  const scoreClass = SCORE_COLORS[sb];
                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-zinc-900/70 hover:bg-zinc-900/60 cursor-pointer"
                      onClick={() => openDrawer(lead)}
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-white"
                          checked={checked}
                          onChange={() => toggleSelected(lead.id)}
                        />
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-100">{lead.name}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{lead.phone}</td>
                      <td className="py-3 px-4 text-xs">
                        <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${scoreClass}`}>
                          <span>{lead.score}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-300">{lead.source}</td>
                      <td className="py-3 px-4 text-xs text-zinc-300">{lead.service}</td>
                      <td className="py-3 px-4 text-xs text-zinc-300">{lead.assignedAgent}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{formatDate(lead.createdAt)}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">
                        {timeSince(lead.lastContactAt)}
                      </td>
                    </tr>
                  );
                })}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 px-4 text-center text-sm text-zinc-500"
                    >
                      No leads match these filters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          {filteredLeads.length > 0 && (
          <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead) => {
              const sb = scoreBucket(lead.score);
              const scoreClass = SCORE_COLORS[sb];
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => openDrawer(lead)}
                  className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {lead.name}
                    </p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${scoreClass}`}>
                      <span>{lead.score}</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{lead.phone}</p>
                  <p className="text-xs text-zinc-500">{lead.service}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200">
                      {lead.status}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {timeSince(lead.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredLeads.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">
                No leads match these filters yet.
              </p>
            )}
          </div>

        {/* Board view (desktop only) */}
        {view === "board" && (
          <div className="hidden md:grid md:grid-cols-3 xl:grid-cols-6 gap-4 mt-6">
            {STATUS_ORDER.map((status) => {
              const columnLeads = groupedByStatus.get(status) ?? [];
              return (
                <div
                  key={status}
                  className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 min-h-[220px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-zinc-200">
                      {status}
                    </p>
                    <span className="text-[11px] text-zinc-500">
                      {columnLeads.length}
                    </span>
                  </div>
                  <div className="space-y-2 overflow-y-auto min-h-0">
                    {columnLeads.map((lead) => {
                      const sb = scoreBucket(lead.score);
                      const scoreClass = SCORE_COLORS[sb];
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => openDrawer(lead)}
                          className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs hover:border-zinc-600"
                        >
                          <p className="font-medium text-zinc-100 truncate">
                            {lead.name}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {lead.phone}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {lead.service}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${scoreClass}`}>
                              <span>{lead.score}</span>
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {timeSince(lead.createdAt)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {columnLeads.length === 0 && (
                      <p className="text-[11px] text-zinc-600">
                        No leads in this stage yet.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {drawerLead && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close lead details"
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-md bg-black border-l border-zinc-800 shadow-2xl flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-sm text-zinc-500 mb-1">Lead</p>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  {drawerLead.name}
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${scoreBadgeClass(drawerLead.score)}`}>
                    <span>{drawerLead.score}</span>
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {drawerLead.service} · {drawerLead.source}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-zinc-500 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-200">
                {drawerLead.status}
              </span>
              <span className="h-4 w-px bg-zinc-800" />
              <span className="text-zinc-500">
                Agent: <span className="text-zinc-200">{drawerLead.assignedAgent}</span>
              </span>
              <span className="h-4 w-px bg-zinc-800" />
              <span className="text-zinc-500">
                Created {formatDate(drawerLead.createdAt)}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                  Contact
                </h3>
                <div className="space-y-1 text-sm">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(drawerLead.phone)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-left text-zinc-100 hover:border-zinc-600"
                  >
                    <span>{drawerLead.phone}</span>
                    <span className="text-[11px] text-zinc-500">Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(drawerLead.email)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-left text-zinc-100 hover:border-zinc-600"
                  >
                    <span className="truncate">{drawerLead.email}</span>
                    <span className="text-[11px] text-zinc-500">Copy</span>
                  </button>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                  Notes
                </h3>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {drawerLead.notes}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                  Timeline
                </h3>
                <ol className="space-y-2 text-xs">
                  {drawerLead.timeline.map((item) => (
                    <li key={`${item.at}-${item.label}`} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      <div>
                        <p className="text-zinc-100">{item.label}</p>
                        <p className="text-[11px] text-zinc-500">
                          {formatDate(item.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {drawerLead.linkedCallId && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                    Linked call
                  </h3>
                  <button
                    type="button"
                    onClick={() => router.push(`/app/calls/${drawerLead.linkedCallId}`)}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-200 hover:text-white"
                  >
                    <span>View original call</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </section>
              )}
            </div>

            <div className="px-5 py-4 border-t border-zinc-800 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <span className="text-zinc-500">Change status</span>
                  <select
                    value={drawerLead.status}
                    onChange={(e) => {
                      const next = e.target.value as LeadStatus;
                      setLeads((prev) =>
                        prev.map((l) =>
                          l.id === drawerLead.id ? { ...l, status: next } : l
                        )
                      );
                      setDrawerLead({ ...drawerLead, status: next });
                    }}
                    className="text-xs rounded-xl bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-200 focus:outline-none focus:border-zinc-600"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-2 hover:border-zinc-500"
                >
                  Add note
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-2 hover:border-zinc-500"
                >
                  Schedule follow-up
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

