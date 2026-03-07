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
  Phone,
  MessageSquare,
  UserPlus,
  Archive,
  Plus,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";

const PAGE_TITLE = "Leads — Recall Touch";

interface ApiLead {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  state: string;
  last_activity_at: string;
  opt_out?: boolean | null;
  deal_id?: string | null;
  value_cents?: number | null;
  metadata?: { source?: string; service_requested?: string; notes?: string; score?: number } | null;
}

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

const SOURCE_TO_LABEL: Record<string, LeadSource> = {
  inbound_call: "Inbound Call",
  outbound: "Outbound Outreach",
  website: "Website",
  referral: "Referral",
  csv_import: "Website",
  api: "Outbound Outreach",
  other: "Inbound Call",
};

function mapApiLeadToView(l: ApiLead, index: number): LeadView {
  const name = l.name?.trim() || l.company?.trim() || "Lead";
  const status: LeadStatus =
    (l.state === "new" && "New") ||
    (l.state === "contacted" && "Contacted") ||
    (l.state === "qualified" && "Qualified") ||
    (l.state === "appointment_set" && "Appointment Set") ||
    (l.state === "won" && "Won") ||
    (l.state === "lost" && "Lost") ||
    "New";
  const meta = l.metadata;
  const source: LeadSource = meta?.source ? (SOURCE_TO_LABEL[meta.source] ?? "Inbound Call") : "Inbound Call";
  const score = typeof meta?.score === "number" ? meta.score : 60 + (index * 7) % 40;
  const service = meta?.service_requested?.trim() || l.company || "Service request";
  const createdAt = l.last_activity_at;
  const lastContactAt = l.last_activity_at;
  const notes =
    meta?.notes?.trim() ||
    (l.company && l.value_cents ? `${l.company} with potential value ~$${Math.round((l.value_cents ?? 0) / 100).toLocaleString()}.` : "Lead captured from a recent conversation and kept in your pipeline.");
  const timeline = [
    { at: createdAt, label: "Created from recent activity" },
    { at: createdAt, label: "Lead added to active pipeline" },
  ];
  return {
    id: l.id,
    name,
    phone: (l.phone ?? "").toString().trim(),
    email: l.email ?? "",
    source,
    status,
    score,
    service,
    createdAt,
    lastContactAt,
    assignedAgent: "Sarah",
    notes,
    linkedCallId: undefined,
    timeline,
  };
}

type SortKey = "newest" | "score" | "recent-contact";

const LEADS_SNAPSHOT_PREFIX = "rt_leads_snapshot:";

function readLeadsSnapshot(workspaceId: string): LeadView[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = window.localStorage.getItem(`${LEADS_SNAPSHOT_PREFIX}${workspaceId}`);
    const parsed = raw ? (JSON.parse(raw) as LeadView[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLeadsSnapshot(workspaceId: string, leads: LeadView[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(
      `${LEADS_SNAPSHOT_PREFIX}${workspaceId}`,
      JSON.stringify(leads),
    );
  } catch {
    // ignore persistence errors
  }
}

export default function LeadsPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId =
    workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialLeads = readLeadsSnapshot(snapshotWorkspaceId);
  const [loading, setLoading] = useState(initialLeads.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([]);
  const [sourceFilter, setSourceFilter] = useState<LeadSource[]>([]);
  const [scoreFilter, setScoreFilter] = useState<ScoreBucket>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerLead, setDrawerLead] = useState<LeadView | null>(null);
  const [drawerCalls, setDrawerCalls] = useState<Array<{ id: string; call_started_at?: string; outcome?: string }>>([]);
  const [drawerCallsLoading, setDrawerCallsLoading] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadView[]>(initialLeads);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    service_requested: "",
    source: "website",
    status: "New" as LeadStatus,
    notes: "",
  });
  const [addLeadSaving, setAddLeadSaving] = useState(false);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<{ name: string; phone: string; email?: string; service_requested?: string; notes?: string }>>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [outboundCalling, setOutboundCalling] = useState(false);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);

  useEffect(() => {
    if (!actionToast) return;
    const t = window.setTimeout(() => setActionToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [actionToast]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load leads");
        return r.json();
      })
      .then((data: { leads?: ApiLead[] }) => {
        const apiLeads = data.leads ?? [];
        const mapped = apiLeads.map((l, i) => mapApiLeadToView(l, i));
        setError(null);
        setLeads(mapped);
        persistLeadsSnapshot(workspaceId, mapped);
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
    if (drawerLead && selectedIds.has(drawerLead.id)) {
      setDrawerLead({ ...drawerLead, status: nextStatus });
    }
    selectedIds.forEach((leadId) => persistLeadStatus(leadId, nextStatus));
  };

  const bulkAssignAgent = (agent: string) => {
    if (!agent || selectedIds.size === 0) return;
    setLeads((prev) =>
      prev.map((l) => (selectedIds.has(l.id) ? { ...l, assignedAgent: agent } : l))
    );
  };

  const moveLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (drawerLead?.id === leadId) {
      setDrawerLead({ ...drawerLead, status: newStatus });
    }
    persistLeadStatus(leadId, newStatus);
  };

  const openDrawer = (lead: LeadView) => {
    setDrawerLead(lead);
    setDrawerCalls([]);
    setDrawerCallsLoading(true);
    fetch(`/api/leads/${lead.id}/calls`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { calls?: Array<{ id: string; call_started_at?: string; outcome?: string }> } | null) => {
        setDrawerCalls(Array.isArray(data?.calls) ? data.calls : []);
      })
      .catch(() => setDrawerCalls([]))
      .finally(() => setDrawerCallsLoading(false));
  };

  const closeDrawer = () => {
    setDrawerLead(null);
    setDrawerCalls([]);
  };

  const scoreBadgeClass = (score: number): string => {
    const bucket = scoreBucket(score);
    return SCORE_COLORS[bucket];
  };

  const refetchLeads = () => {
    if (!workspaceId) return;
    fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { leads?: ApiLead[] }) => {
        const apiLeads = data?.leads ?? [];
        const mapped = apiLeads.map((l, i) => mapApiLeadToView(l, i));
        setLeads(mapped);
        persistLeadsSnapshot(workspaceId, mapped);
      })
      .catch(() => {});
  };

  const persistLeadStatus = (leadId: string, status: LeadStatus) => {
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ state: status }),
    }).catch(() => {});
  };

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLeadForm.name.trim() || !addLeadForm.phone.trim() || addLeadSaving) {
      if (!addLeadForm.name.trim()) setAddLeadError("Name is required.");
      else if (!addLeadForm.phone.trim()) setAddLeadError("Phone is required.");
      return;
    }
    if (!workspaceId) {
      setAddLeadError("Workspace not loaded. Refresh the page and try again.");
      return;
    }
    setAddLeadError(null);
    setAddLeadSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addLeadForm.name.trim(),
          phone: addLeadForm.phone.trim(),
          email: addLeadForm.email.trim() || undefined,
          service_requested: addLeadForm.service_requested.trim() || addLeadForm.company.trim() || undefined,
          source: addLeadForm.source,
          status: addLeadForm.status.replace(/\s+/g, "_").toLowerCase(),
          notes: addLeadForm.notes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) {
        setAddLeadError(data?.error ?? "Could not add lead.");
        return;
      }
      refetchLeads();
      setAddLeadOpen(false);
      setAddLeadForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        service_requested: "",
        source: "website",
        status: "New",
        notes: "",
      });
      setActionToast("Lead added.");
    } catch {
      setAddLeadError("Could not add lead.");
    } finally {
      setAddLeadSaving(false);
    }
  };

  const handleHaveAICall = async () => {
    if (!drawerLead?.id || outboundCalling) return;
    setOutboundCalling(true);
    try {
      const res = await fetch("/api/outbound/call", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: drawerLead.id }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        setActionToast("Call started. Check Calls for status.");
        closeDrawer();
      } else {
        setActionToast(data?.error ?? "Could not start call.");
      }
    } catch {
      setActionToast("Could not start call.");
    } finally {
      setOutboundCalling(false);
    }
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
            <button
              type="button"
              onClick={() => { setAddLeadOpen(true); setAddLeadError(null); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black text-xs font-semibold px-4 py-2 hover:bg-zinc-100"
            >
              <Plus className="w-4 h-4" />
              Add lead
            </button>
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
              <p className="text-sm font-medium text-white mb-1">Leads appear when your AI captures them — or add your own</p>
              <p className="text-xs text-zinc-500 mb-4">Create leads from calls or add leads manually. Connect your CRM via Settings → Integrations to sync with HubSpot, Salesforce, and more.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => { setAddLeadOpen(true); setAddLeadError(null); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black text-sm font-semibold px-4 py-2.5 hover:bg-zinc-100"
                >
                  <Plus className="w-4 h-4" />
                  Add lead
                </button>
                <Link href="/demo" className="text-sm font-medium text-zinc-300 hover:text-white underline underline-offset-2">Try demo →</Link>
                <Link href="/app/settings/integrations" className="text-sm font-medium text-zinc-300 hover:text-white underline underline-offset-2">Connect CRM →</Link>
              </div>
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("ring-1", "ring-zinc-600");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("ring-1", "ring-zinc-600");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-1", "ring-zinc-600");
                    const leadId = e.dataTransfer.getData("application/x-lead-id");
                    if (leadId) moveLeadStatus(leadId, status);
                  }}
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
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/x-lead-id", lead.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          role="button"
                          tabIndex={0}
                          onClick={() => openDrawer(lead)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDrawer(lead);
                            }
                          }}
                          className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs hover:border-zinc-600 cursor-grab active:cursor-grabbing"
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
                        </div>
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

      {/* Add lead slide-out */}
      {addLeadOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => { setAddLeadOpen(false); setAddLeadError(null); setCsvPreviewRows([]); }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close"
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-md bg-black border-l border-zinc-800 shadow-2xl flex flex-col overflow-y-auto">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add a lead</h2>
              <button
                type="button"
                onClick={() => { setAddLeadOpen(false); setAddLeadError(null); setCsvPreviewRows([]); }}
                className="text-zinc-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLeadSubmit} className="space-y-4">
              {addLeadError && (
                <p className="text-sm text-red-400">{addLeadError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={addLeadForm.name}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={addLeadForm.phone}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={addLeadForm.email}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">What do they need?</label>
                <input
                  type="text"
                  value={addLeadForm.service_requested}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, service_requested: e.target.value }))}
                  placeholder="e.g. monthly cleaning, consultation"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Source</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {(["website", "referral", "inbound_call", "other"] as const).map((src) => (
                    <label key={src} className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="source"
                        checked={addLeadForm.source === src}
                        onChange={() => setAddLeadForm((prev) => ({ ...prev, source: src }))}
                        className="rounded-full border-zinc-600 bg-zinc-900 text-white"
                      />
                      {src === "inbound_call" ? "Inbound Call" : src === "website" ? "Website" : src === "referral" ? "Referral" : "Other"}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
                <select
                  value={addLeadForm.status}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, status: e.target.value as LeadStatus }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
                <textarea
                  value={addLeadForm.notes}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:border-zinc-600 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setAddLeadOpen(false); setAddLeadError(null); setCsvPreviewRows([]); }}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLeadSaving || !addLeadForm.name.trim() || !addLeadForm.phone.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50"
                >
                  {addLeadSaving ? "Adding…" : "Save lead"}
                </button>
              </div>
            </form>
            {csvPreviewRows.length > 0 ? (
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-sm font-medium text-white mb-1">We found {csvPreviewRows.length} leads</p>
                <p className="text-[11px] text-zinc-500 mb-2">Preview (first 5):</p>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 max-h-32 overflow-y-auto text-xs text-zinc-300">
                  {csvPreviewRows.slice(0, 5).map((r, i) => (
                    <div key={i} className="py-1 border-b border-zinc-800 last:border-0">
                      {r.name} · {r.phone}
                      {r.email ? ` · ${r.email}` : ""}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCsvPreviewRows([])}
                    className="px-3 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={csvImporting}
                    onClick={async () => {
                      setCsvImporting(true);
                      try {
                        const res = await fetch("/api/leads/import", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ leads: csvPreviewRows }),
                        });
                        const data = (await res.json().catch(() => null)) as { imported?: number; error?: string } | null;
                        if (res.ok && typeof data?.imported === "number") {
                          refetchLeads();
                          setCsvPreviewRows([]);
                          setAddLeadOpen(false);
                          setActionToast(`${data.imported} leads imported.`);
                        } else {
                          setActionToast(data?.error ?? "Import failed.");
                        }
                      } catch {
                        setActionToast("Import failed.");
                      } finally {
                        setCsvImporting(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50"
                  >
                    {csvImporting ? "Importing…" : `Import all ${csvPreviewRows.length} leads`}
                  </button>
                </div>
              </div>
            ) : (
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">— or —</p>
              <label className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white cursor-pointer">
                <span className="text-base">📎</span>
                Import from CSV
                <input
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const text = String(reader.result ?? "");
                      const lines = text.split(/\r?\n/).filter((l) => l.trim());
                      const header = (lines[0] ?? "").toLowerCase();
                      const parts = header.split(",").map((p) => p.trim());
                      const nameIdx = parts.findIndex((p) => p === "name" || p === "full name") >= 0 ? parts.findIndex((p) => p === "name" || p === "full name") : 0;
                      const phoneIdx = parts.findIndex((p) => p === "phone" || p === "phone number") >= 0 ? parts.findIndex((p) => p === "phone" || p === "phone number") : 1;
                      const emailIdx = parts.findIndex((p) => p === "email");
                      const notesIdx = parts.findIndex((p) => p === "notes" || p === "service" || p === "service_requested");
                      const toObj = (line: string) => {
                        const cells = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
                        return {
                          name: cells[nameIdx] ?? "",
                          phone: (cells[phoneIdx] ?? "").replace(/\D/g, "").length >= 10 ? cells[phoneIdx] ?? "" : "",
                          email: emailIdx >= 0 ? cells[emailIdx] ?? "" : "",
                          service_requested: notesIdx >= 0 ? cells[notesIdx] ?? "" : "",
                          notes: notesIdx >= 0 ? cells[notesIdx] ?? "" : "",
                        };
                      };
                      const parsed = lines.slice(1).map(toObj).filter((r) => r.name && r.phone);
                      if (parsed.length === 0) {
                        setActionToast("No valid rows (need name and phone).");
                        return;
                      }
                      setCsvPreviewRows(parsed);
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-[11px] text-zinc-500 mt-1">Upload CSV with name, phone, email columns</p>
            </div>
            )}
          </div>
          </aside>
        </div>
      )}

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

              {drawerLead.service && drawerLead.service !== "Service request" && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                    What they need
                  </h3>
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    {drawerLead.service}
                  </p>
                </section>
              )}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                  Notes
                </h3>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {drawerLead.notes || "—"}
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

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                  Call history
                </h3>
                {drawerCallsLoading ? (
                  <p className="text-xs text-zinc-500">Loading…</p>
                ) : drawerCalls.length === 0 ? (
                  <p className="text-xs text-zinc-500 mb-2">No calls yet for this lead.</p>
                ) : null}
                {drawerLead.phone ? (
                  <button
                    type="button"
                    onClick={() => void handleHaveAICall()}
                    disabled={outboundCalling}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black text-xs font-semibold px-3 py-2 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {outboundCalling ? "Starting…" : "Have AI call this lead"}
                  </button>
                ) : (
                  <p className="text-xs text-zinc-500">Add a phone number to enable outbound calls.</p>
                )}
                {drawerCalls.length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {drawerCalls.map((call) => (
                      <li key={call.id}>
                        <Link
                          href={`/app/calls/${call.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-zinc-100 hover:border-zinc-600"
                        >
                          <span>
                            {call.call_started_at ? formatDate(call.call_started_at) : "Call"}
                            {call.outcome ? ` · ${call.outcome}` : ""}
                          </span>
                          <ChevronRight className="w-3 h-3 text-zinc-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
                      persistLeadStatus(drawerLead.id, next);
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
                {drawerLead.phone ? (
                  <a
                    href={`tel:${drawerLead.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-2 hover:border-zinc-500"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call back
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 text-zinc-500 text-xs font-medium px-3 py-2">
                    <Phone className="w-3.5 h-3.5" />
                    Call back (no phone)
                  </span>
                )}
                <Link
                  href={drawerLead.id ? `/app/messages?lead_id=${encodeURIComponent(drawerLead.id)}` : drawerLead.phone ? `/app/messages?to=${encodeURIComponent(drawerLead.phone)}` : "/app/messages"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-2 hover:border-zinc-500"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Send message
                </Link>
                <Link
                  href="/app/campaigns"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-2 hover:border-zinc-500"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add to campaign
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const lost: LeadStatus = "Lost";
                    setLeads((prev) =>
                      prev.map((l) =>
                        l.id === drawerLead.id ? { ...l, status: lost } : l
                      )
                    );
                    setDrawerLead({ ...drawerLead, status: lost });
                    persistLeadStatus(drawerLead.id, lost);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-2 hover:border-zinc-500"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {actionToast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 shadow-lg">
          {actionToast}
        </div>
      )}
    </>
  );
}

