"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Megaphone,
  Plus,
  Copy,
  Trash2,
  Play,
  Pause,
  ArrowRight,
  Download,
  Search,
  MoreHorizontal,
  TrendingUp,

  Phone,
  CalendarCheck,
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast as sonnerToast } from "sonner";

type CampaignRow = {
  id: string;
  name: string;
  type: string;
  status: "draft" | "active" | "paused" | "completed" | "launching";
  total_leads: number;
  leads_called: number;
  connects: number;
  appointments_booked: number;
  created_at: string;
  started_at?: string | null;
  target_filter?: Record<string, unknown> | null;
};

const CAMPAIGNS_SNAPSHOT_PREFIX = "rt_campaigns_snapshot:";

function readCampaignsSnapshot(workspaceId: string): CampaignRow[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  const key = `${CAMPAIGNS_SNAPSHOT_PREFIX}${workspaceId}`;
  try {
    const raw = safeGetItem(key);
    const parsed = raw ? (JSON.parse(raw) as CampaignRow[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    safeRemoveItem(key);
    return [];
  }
}

function persistCampaignsSnapshot(workspaceId: string, campaigns: CampaignRow[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  safeSetItem(`${CAMPAIGNS_SNAPSHOT_PREFIX}${workspaceId}`, JSON.stringify(campaigns));
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  launching: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const CAMPAIGN_PAGE_SIZE = 12;

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialCampaigns = readCampaignsSnapshot(snapshotWorkspaceId);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns);
  const [loading, setLoading] = useState(initialCampaigns.length === 0);
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignRow["status"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignPage, setCampaignPage] = useState(1);

  // Action states
  const [pauseConfirm, setPauseConfirm] = useState<CampaignRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CampaignRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    document.title = t("pageTitle");
    return () => { document.title = ""; };
  }, [t]);

  // Fetch campaigns from API
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    fetch(`/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          sonnerToast.error("Could not load campaigns");
          return { campaigns: [] };
        }
        return res.json();
      })
      .then((data: { campaigns?: CampaignRow[] }) => {
        if (cancelled) return;
        const next = data.campaigns ?? [];
        setCampaigns(next);
        persistCampaignsSnapshot(workspaceId, next);
      })
      .catch(() => {
        if (cancelled) return;
        sonnerToast.error("Could not load campaigns");
        setCampaigns([]);
      })
      .finally(() => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [workspaceId]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = campaigns;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [campaigns, statusFilter, searchQuery]);

  // Pagination
  useEffect(() => { setCampaignPage(1); }, [statusFilter, searchQuery]);
  const totalPages = Math.ceil(filtered.length / CAMPAIGN_PAGE_SIZE);
  const pageSafe = Math.max(1, Math.min(campaignPage, totalPages || 1));
  const pagedCampaigns = filtered.slice(
    (pageSafe - 1) * CAMPAIGN_PAGE_SIZE,
    pageSafe * CAMPAIGN_PAGE_SIZE,
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === "active").length;
    const totalContacted = campaigns.reduce((s, c) => s + (c.leads_called ?? 0), 0);
    const totalConverted = campaigns.reduce((s, c) => s + (c.appointments_booked ?? 0), 0);
    return { total, active, totalContacted, totalConverted };
  }, [campaigns]);

  // Actions
  const toggleCampaign = useCallback(async (campaign: CampaignRow) => {
    if (campaign.status === "active") {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      });
      if (!res.ok) {
        sonnerToast.error(t("toast.updateFailed"));
        return;
      }
      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaign.id ? { ...item, status: "paused" } : item)),
      );
      sonnerToast.success(t("toast.paused"));
      return;
    }

    // Launch
    const prevStatus = campaign.status;
    setCampaigns((prev) =>
      prev.map((item) =>
        item.id === campaign.id ? { ...item, status: "launching" as CampaignRow["status"] } : item,
      ),
    );
    const res = await fetch(`/api/campaigns/${campaign.id}/launch`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id ? { ...item, status: prevStatus } : item,
        ),
      );
      const errorData = await res.json().catch(() => null) as { error?: string } | null;
      sonnerToast.error(errorData?.error ?? t("toast.launchFailed"));
      return;
    }
    const data = (await res.json().catch(() => null)) as { enqueued?: number } | null;
    setCampaigns((prev) =>
      prev.map((item) =>
        item.id === campaign.id ? { ...item, status: "active" } : item,
      ),
    );
    sonnerToast.success(
      data?.enqueued != null
        ? t("toast.launchedWithCount", { count: String(data.enqueued) })
        : t("toast.launched"),
    );
  }, [t]);

  const deleteCampaign = useCallback(async (campaign: CampaignRow) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        sonnerToast.error((data as { error?: string } | null)?.error ?? t("toast.deleteFailed"));
        return;
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      sonnerToast.success(t("toast.deleted"));
    } catch {
      sonnerToast.error(t("toast.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }, [t]);

  const duplicateCampaign = useCallback(async (campaign: CampaignRow) => {
    setDuplicating(campaign.id);
    try {
      const payload = {
        workspace_id: workspaceId,
        name: `${campaign.name} (${t("copySuffix")})`,
        type: campaign.type,
        target_filter: campaign.target_filter,
      };
      const res = await fetch("/api/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as {
        campaign?: CampaignRow;
        error?: string;
      } | null;
      const created = json?.campaign;
      if (!res.ok || !created) {
        sonnerToast.error(json?.error ?? t("toast.createFailed"));
        return;
      }
      setCampaigns((prev) => [created, ...prev]);
      sonnerToast.success(t("toast.duplicated"));
    } catch {
      sonnerToast.error(t("toast.createFailed"));
    } finally {
      setDuplicating(null);
    }
  }, [t, workspaceId]);

  const exportCampaignsToCSV = useCallback(() => {
    try {
      const headers = ["Name", "Status", "Contacts", "Called", "Reached", "Booked", "Created"];
      const rows = campaigns.map((c) => [
        `"${(c.name ?? "").replace(/"/g, '""')}"`,
        c.status,
        c.total_leads ?? 0,
        c.leads_called ?? 0,
        c.connects ?? 0,
        c.appointments_booked ?? 0,
        new Date(c.created_at).toLocaleDateString(),
      ]);
      const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `campaigns-${dateStr}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sonnerToast.success("Campaigns exported");
    } catch {
      sonnerToast.error("Failed to export campaigns");
    }
  }, [campaigns]);

  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenuOpen) return;
    const handler = () => setActionMenuOpen(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [actionMenuOpen]);

  if (!workspaceId) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <EmptyState
          title={t("noWorkspace.title", { defaultValue: "No workspace" })}
          description={t("noWorkspace.description", { defaultValue: "Select or create a workspace to view campaigns." })}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Campaigns" }]} />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
              {t("heading")}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {t("description")}
            </p>
          </div>
          <Link
            href="/app/campaigns/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t("createCampaign")}
          </Link>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            icon={Megaphone}
            label={t("statTotal")}
            value={stats.total}
            color="blue"
          />
          <SummaryCard
            icon={TrendingUp}
            label={t("statActive")}
            value={stats.active}
            color="emerald"
          />
          <SummaryCard
            icon={Phone}
            label={t("statContacted")}
            value={stats.totalContacted}
            color="cyan"
          />
          <SummaryCard
            icon={CalendarCheck}
            label={t("statConverted")}
            value={stats.totalConverted}
            color="amber"
          />
        </div>

        {/* Filters bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "active", "draft", "paused", "completed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {s === "all" ? t("statusFilter.all") : t(`statusFilter.${s}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
            </div>
            <button
              onClick={exportCampaignsToCSV}
              disabled={campaigns.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse"
              >
                <div className="h-4 w-3/4 bg-[var(--bg-inset)] rounded mb-3" />
                <div className="h-3 w-1/2 bg-[var(--bg-inset)] rounded mb-4" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-[var(--bg-inset)] rounded-lg" />
                  <div className="h-12 bg-[var(--bg-inset)] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={
              searchQuery || statusFilter !== "all"
                ? "No campaigns match your filters"
                : t("empty.title", { defaultValue: "No campaigns yet" })
            }
            description={
              searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : t("empty.body", { defaultValue: "Create your first campaign to start reaching leads at scale." })
            }
            primaryAction={
              searchQuery || statusFilter !== "all"
                ? undefined
                : { label: t("createCampaign"), href: "/app/campaigns/create" }
            }
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pagedCampaigns.map((campaign) => {
                const totalLeads = campaign.total_leads ?? 0;
                const called = campaign.leads_called ?? 0;
                const reached = campaign.connects ?? 0;
                const booked = campaign.appointments_booked ?? 0;
                const progressPct = totalLeads > 0 ? Math.round((called / totalLeads) * 100) : 0;
                const conversionPct = reached > 0 ? Math.round((booked / reached) * 100) : 0;

                return (
                  <div
                    key={campaign.id}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 hover:border-[var(--border-hover,var(--border-default))] transition-colors group"
                  >
                    {/* Top row: name + actions */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/app/campaigns/${campaign.id}`}
                          className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors line-clamp-1"
                        >
                          {campaign.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[campaign.status] ?? STATUS_COLORS.draft}`}
                          >
                            {campaign.status === "active" && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {campaign.status === "launching" && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                            {campaign.status === "launching"
                              ? "Launching..."
                              : t.has(`statusFilter.${campaign.status}`)
                                ? t(`statusFilter.${campaign.status}` as never)
                                : campaign.status}
                          </span>
                          <span className="text-[11px] text-[var(--text-tertiary)] capitalize">
                            {(campaign.type ?? "custom").replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      {/* Action menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(
                              actionMenuOpen === campaign.id ? null : campaign.id,
                            );
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {actionMenuOpen === campaign.id && (
                          <div
                            className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-lg py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/app/campaigns/${campaign.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            >
                              <ArrowRight className="w-3.5 h-3.5" /> View details
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                void duplicateCampaign(campaign);
                                setActionMenuOpen(null);
                              }}
                              disabled={duplicating === campaign.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                            >
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            {campaign.status !== "active" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirm(campaign);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <MetricCell label="Contacts" value={totalLeads} />
                      <MetricCell label="Called" value={called} />
                      <MetricCell label="Reached" value={reached} />
                      <MetricCell label="Booked" value={booked} />
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                        <span>Progress</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--bg-inset)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                          style={{ width: `${Math.min(100, progressPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Conversion + action */}
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {conversionPct > 0 && (
                          <span className="font-medium text-emerald-600">{conversionPct}% conversion</span>
                        )}
                        {conversionPct === 0 && (
                          <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          campaign.status === "active"
                            ? setPauseConfirm(campaign)
                            : void toggleCampaign(campaign)
                        }
                        disabled={campaign.status === "launching" || campaign.status === "completed"}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          campaign.status === "active"
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        }`}
                      >
                        {campaign.status === "active" ? (
                          <><Pause className="w-3 h-3" /> {t("pause")}</>
                        ) : campaign.status === "launching" ? (
                          "Launching..."
                        ) : (
                          <><Play className="w-3 h-3" /> {t("launchCampaign")}</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <Pagination
                currentPage={pageSafe}
                totalPages={totalPages}
                onPageChange={setCampaignPage}
                label={t("pageOf")}
                prevLabel={t("prevPage")}
                nextLabel={t("nextPage")}
              />
            </div>
          </>
        )}

        {/* Confirm dialogs */}
        {pauseConfirm && (
          <ConfirmDialog
            open
            title={t("pauseConfirmTitle")}
            message={t("pauseConfirmMessage", { name: pauseConfirm.name })}
            confirmLabel={t("pause")}
            onConfirm={() => {
              void toggleCampaign(pauseConfirm);
              setPauseConfirm(null);
            }}
            onClose={() => setPauseConfirm(null)}
          />
        )}
        {deleteConfirm && (
          <ConfirmDialog
            open
            title={t("deleteConfirmTitle")}
            message={t("deleteConfirmMessage", { name: deleteConfirm.name })}
            confirmLabel={t("delete")}
            onConfirm={() => {
              void deleteCampaign(deleteConfirm);
              setDeleteConfirm(null);
            }}
            onClose={() => setDeleteConfirm(null)}
          />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "blue" | "emerald" | "cyan" | "amber";
}) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",
    emerald: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20",
    cyan: "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20",
    amber: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",
  };
  const textMap = {
    blue: "text-blue-700 dark:text-blue-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    cyan: "text-cyan-700 dark:text-cyan-300",
    amber: "text-amber-700 dark:text-amber-300",
  };

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <p className={`text-xl font-bold ${textMap[color]}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}
