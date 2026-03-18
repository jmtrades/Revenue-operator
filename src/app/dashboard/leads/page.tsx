"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Filter,
  Search,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "BOOKED" | "WON" | "LOST";
type LeadSource = "phone" | "web" | "referral" | "campaign";

interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: LeadStatus;
  score: number;
  source: LeadSource;
  createdAt: string;
}

const DEMO_LEADS: LeadRow[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+1 (480) 555-0198",
    company: "Johnson HVAC",
    status: "NEW",
    score: 72,
    source: "phone",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "James Lee",
    email: "james.lee@example.com",
    phone: "+1 (602) 555-0142",
    company: "Lee Plumbing",
    status: "QUALIFIED",
    score: 88,
    source: "web",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    name: "Dr. Maria Gomez",
    email: "maria@smilesdental.com",
    phone: "+1 (512) 555-0110",
    company: "Smiles Dental Studio",
    status: "BOOKED",
    score: 92,
    source: "referral",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    name: "Carlos Rivera",
    email: "carlos@roofguard.com",
    phone: "+1 (214) 555-0177",
    company: "RoofGuard",
    status: "CONTACTED",
    score: 55,
    source: "campaign",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

type StatusFilter = LeadStatus | "all";
type SourceFilter = LeadSource | "all";

function statusBadge(status: LeadStatus): { label: string; className: string } {
  switch (status) {
    case "NEW":
      return { label: "New", className: "bg-zinc-900/60 text-blue-400 border-zinc-800" };
    case "CONTACTED":
      return { label: "Contacted", className: "bg-zinc-900/60 text-purple-400 border-zinc-800" };
    case "QUALIFIED":
      return { label: "Qualified", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "BOOKED":
      return { label: "Booked", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "WON":
      return { label: "Won", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "LOST":
      return { label: "Lost", className: "bg-red-500/10 text-red-400 border-red-500/30" };
    default:
      return { label: status, className: "bg-zinc-800 text-zinc-300 border-zinc-700" };
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function sourceLabel(source: LeadSource): string {
  switch (source) {
    case "phone":
      return "Phone";
    case "web":
      return "Web";
    case "referral":
      return "Referral";
    case "campaign":
      return "Campaign";
    default:
      return source;
  }
}

export default function LeadsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [liveLeads, setLiveLeads] = useState<LeadRow[] | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    fetchWithFallback<{ id: string; name: string; email: string | null; phone: string | null; company: string | null; state: string; qualification_score: number | null; metadata: Record<string, unknown> | null; created_at: string }[]>(
      `/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" },
    ).then((res) => {
      const data = res.data;
      if (!data?.length) return;
      const stateToStatus: Record<string, LeadStatus> = {
        new: "NEW", contacted: "CONTACTED", qualified: "QUALIFIED",
        booked: "BOOKED", won: "WON", lost: "LOST",
      };
      const mapped: LeadRow[] = data.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        status: stateToStatus[l.state?.toLowerCase()] ?? "NEW",
        score: l.qualification_score ?? 0,
        source: ((l.metadata as Record<string, unknown>)?.source as LeadSource) ?? "phone",
        createdAt: l.created_at,
      }));
      setLiveLeads(mapped);
    });
  }, [workspaceId]);

  const leads = useMemo<LeadRow[]>(() => {
    return liveLeads ?? DEMO_LEADS;
  }, [liveLeads]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (!term) return true;
      return (
        lead.name.toLowerCase().includes(term) ||
        (lead.email ?? "").toLowerCase().includes(term) ||
        (lead.company ?? "").toLowerCase().includes(term) ||
        (lead.phone ?? "").includes(term)
      );
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const pageLeads = filtered.slice(0, 25);

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "NEW", label: "New" },
    { key: "CONTACTED", label: "Contacted" },
    { key: "QUALIFIED", label: "Qualified" },
    { key: "BOOKED", label: "Booked" },
    { key: "WON", label: "Won" },
    { key: "LOST", label: "Lost" },
  ];

  const sourceOptions: { key: SourceFilter; label: string }[] = [
    { key: "all", label: "All sources" },
    { key: "phone", label: "Phone" },
    { key: "web", label: "Web" },
    { key: "referral", label: "Referral" },
    { key: "campaign", label: "Campaign" },
  ];

  const onAddLead = useCallback(() => {
    // Placeholder for modal; for now navigate to conversations or detail.
    // In a full implementation this would open a create-lead dialog.
  }, []);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <PageHeader
          title={t("pages.leads.title")}
          subtitle={t("pages.leads.subtitle")}
        />
        <EmptyState
          icon="watch"
          title={t("empty.selectContext")}
          subtitle={t("empty.leadsAppearHere")}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title={t("pages.leads.title")}
        subtitle={t("pages.leads.subtitle")}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="search"
            placeholder="Search by name, email, phone, or company"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
            <Filter className="w-3 h-3 text-zinc-500" />
            <span className="text-zinc-400">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="bg-transparent border-none text-xs text-zinc-100 focus:outline-none"
            >
              {statusOptions.map((o) => (
                <option key={o.key} value={o.key} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
            <ArrowLeftRight className="w-3 h-3 text-zinc-500" />
            <span className="text-zinc-400">Source</span>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
              className="bg-transparent border-none text-xs text-zinc-100 focus:outline-none"
            >
              {sourceOptions.map((o) => (
                <option key={o.key} value={o.key} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onAddLead}
            className="ml-auto inline-flex items-center gap-1 rounded-xl bg-white text-black text-xs font-semibold px-3 py-1.5 hover:bg-zinc-100 transition-colors"
          >
            + Add lead
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-zinc-400">
        <span className="px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
          Demo data
        </span>
        <span>Leads from your AI agent and forms will appear here automatically.</span>
      </div>

      {pageLeads.length === 0 ? (
        <EmptyState
          icon="pulse"
          title="No leads yet"
          subtitle="Your AI agent will capture leads from incoming calls and missed-call recovery."
        />
      ) : (
        <div
          className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/80"
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950/70">
              <tr>
                <th className="py-3 px-4 font-medium text-zinc-400">Name</th>
                <th className="py-3 px-4 font-medium text-zinc-400">Email</th>
                <th className="py-3 px-4 font-medium text-zinc-400">Phone</th>
                <th className="py-3 px-4 font-medium text-zinc-400">Company</th>
                <th className="py-3 px-4 font-medium text-zinc-400">Status</th>
                <th className="py-3 px-4 font-medium text-zinc-400">Score</th>
                <th className="py-3 px-4 font-medium text-zinc-400">Source</th>
                <th className="py-3 px-4 font-medium text-zinc-400">Created</th>
                <th className="py-3 px-4 font-medium text-zinc-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pageLeads.map((lead) => {
                const status = statusBadge(lead.status);
                const created = new Date(lead.createdAt);
                const scoreCls = scoreColor(lead.score);
                const DirectionIcon = lead.score >= 70 ? ArrowUpRight : ArrowDownRight;
                const scoreAccent =
                  lead.score >= 70
                    ? "bg-emerald-500/10"
                    : lead.score >= 40
                      ? "bg-amber-500/10"
                      : "bg-red-500/10";
                return (
                  <tr
                    key={lead.id}
                    className="border-t border-zinc-800/80 hover:bg-zinc-900/80 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="text-sm font-medium text-zinc-100 hover:text-emerald-300"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-300">
                      {lead.email ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-300">
                      {lead.phone ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-300">
                      {lead.company ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${scoreAccent} ${scoreCls}`}
                      >
                        <DirectionIcon className="w-3 h-3" />
                        {lead.score}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-300">
                      {sourceLabel(lead.source)}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-400">
                      {created.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <Link
                          href={`/dashboard/messages?lead=${lead.id}`}
                          className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          Message
                        </Link>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          Schedule
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          More…
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
            <span>
              Showing {pageLeads.length} of {filtered.length} leads
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded border border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                disabled
              >
                Previous
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded border border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                disabled
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
