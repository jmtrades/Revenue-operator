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
  X,
  Calendar,
  Phone,
  Trash2,
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

const DEMO_LEADS: LeadRow[] = [];

type StatusFilter = LeadStatus | "all";
type SourceFilter = LeadSource | "all";

function statusBadge(status: LeadStatus): { label: string; className: string } {
  switch (status) {
    case "NEW":
      return { label: "New", className: "bg-[var(--bg-card)]/60 text-blue-400 border-[var(--border-default)]" };
    case "CONTACTED":
      return { label: "Contacted", className: "bg-[var(--bg-card)]/60 text-purple-400 border-[var(--border-default)]" };
    case "QUALIFIED":
      return { label: "Qualified", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "BOOKED":
      return { label: "Booked", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "WON":
      return { label: "Won", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "LOST":
      return { label: "Lost", className: "bg-red-500/10 text-red-400 border-red-500/30" };
    default:
      return { label: status, className: "bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-default)]" };
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadCompany, setNewLeadCompany] = useState("");
  const [addingLead, setAddingLead] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const onAddLead = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleCreateLead = useCallback(async () => {
    if (!workspaceId || !newLeadName.trim()) return;
    setAddingLead(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: newLeadName.trim(),
          phone: newLeadPhone.trim() || null,
          email: newLeadEmail.trim() || null,
          company: newLeadCompany.trim() || null,
        }),
      });
      // Refresh leads
      setShowAddModal(false);
      setNewLeadName("");
      setNewLeadPhone("");
      setNewLeadEmail("");
      setNewLeadCompany("");
      // Re-fetch
      const res = await fetchWithFallback<{ id: string; name: string; email: string | null; phone: string | null; company: string | null; state: string; qualification_score: number | null; metadata: Record<string, unknown> | null; created_at: string }[]>(
        `/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" },
      );
      if (res.data?.length) {
        const stateToStatus: Record<string, LeadStatus> = {
          new: "NEW", contacted: "CONTACTED", qualified: "QUALIFIED",
          booked: "BOOKED", won: "WON", lost: "LOST",
        };
        setLiveLeads(res.data.map((l) => ({
          id: l.id,
          name: l.name,
          email: l.email,
          phone: l.phone,
          company: l.company,
          status: stateToStatus[l.state?.toLowerCase()] ?? "NEW",
          score: l.qualification_score ?? 0,
          source: ((l.metadata as Record<string, unknown>)?.source as LeadSource) ?? "phone",
          createdAt: l.created_at,
        })));
      }
    } finally {
      setAddingLead(false);
    }
  }, [workspaceId, newLeadName, newLeadPhone, newLeadEmail, newLeadCompany]);

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
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="search"
            placeholder="Search by name, email, phone, or company"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1">
            <Filter className="w-3 h-3 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-tertiary)]">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
            >
              {statusOptions.map((o) => (
                <option key={o.key} value={o.key} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1">
            <ArrowLeftRight className="w-3 h-3 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-tertiary)]">Source</span>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
              className="bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
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
            className="ml-auto inline-flex items-center gap-1 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-semibold px-3 py-1.5 hover:bg-[var(--bg-inset)] transition-colors"
          >
            + Add lead
          </button>
        </div>
      </div>

      {!liveLeads && (
        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-tertiary)]">
          <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
            Sample data
          </span>
          <span>Leads from your AI operator and forms will appear here automatically.</span>
        </div>
      )}

      {pageLeads.length === 0 ? (
        <EmptyState
          icon="pulse"
          title="No leads yet"
          subtitle="Your AI operator will capture leads from incoming calls and missed-call recovery."
        />
      ) : (
        <div
          className="rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-base)]/80"
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border-default)] bg-[var(--bg-base)]/70">
              <tr>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Name</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Email</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Phone</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Company</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Status</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Score</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Source</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Created</th>
                <th className="py-3 px-4 font-medium text-[var(--text-tertiary)] text-right">
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
                    className="border-t border-[var(--border-default)]/80 hover:bg-[var(--bg-card)]/80 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-emerald-300"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                      {lead.email ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                      {lead.phone ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
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
                    <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                      {sourceLabel(lead.source)}
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--text-tertiary)]">
                      {created.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <Link
                          href={`/dashboard/messages?lead=${lead.id}`}
                          className="px-3 py-1.5 rounded-full border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors"
                        >
                          Message
                        </Link>
                        <Link
                          href={`/dashboard/calendar?lead=${lead.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors"
                        >
                          <Calendar className="w-3 h-3" />
                          Schedule
                        </Link>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActionMenu(actionMenu === lead.id ? null : lead.id)}
                            className="px-3 py-1.5 rounded-full border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors"
                          >
                            More…
                          </button>
                          {actionMenu === lead.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-xl py-1">
                              <Link href={`/dashboard/leads/${lead.id}`} className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-inset)]">
                                View details
                              </Link>
                              {lead.phone && (
                                <Link href={`/dashboard/activity?call=${lead.id}`} className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-inset)]">
                                  <Phone className="w-3 h-3" /> Call
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => { setActionMenu(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-[var(--bg-inset)]"
                              >
                                <Trash2 className="w-3 h-3" /> Archive
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)] text-xs text-[var(--text-tertiary)]">
            <span>
              Showing {pageLeads.length} of {filtered.length} leads
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-card)]"
                disabled
              >
                Previous
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-card)]"
                disabled
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Add New Lead</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Name *</span>
                <input type="text" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="John Smith" />
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Phone</span>
                <input type="tel" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="+1 (480) 555-0100" />
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Email</span>
                <input type="email" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="john@example.com" />
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Company</span>
                <input type="text" value={newLeadCompany} onChange={(e) => setNewLeadCompany(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Acme Corp" />
              </label>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleCreateLead} disabled={addingLead || !newLeadName.trim()} className="flex-1 rounded-xl bg-emerald-500 text-black font-semibold py-2.5 text-sm hover:bg-emerald-400 transition-colors disabled:opacity-60">
                {addingLead ? "Creating…" : "Create Lead"}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
