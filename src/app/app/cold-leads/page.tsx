"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, MoreHorizontal, Zap, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { useDebounce } from "@/hooks/useDebounce";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type ColdLeadStatus = "pending" | "in_progress" | "completed" | "exhausted";
type ColdLeadReason = "no_activity_30d" | "no_reply_14d" | "lost_deal" | "manual";
type ColdLeadPriority = "high" | "medium" | "low";
type ReengageStrategy = "auto" | "value_first" | "clarification" | "social_proof" | "urgency" | "direct_close";
type ChannelPreference = "default" | "call_first" | "text_first" | "email_first";

interface ColdLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  reason: ColdLeadReason;
  priority: ColdLeadPriority;
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_attempt_at?: string;
  status: ColdLeadStatus;
  created_at: string;
}

interface ReengagePayload {
  lead_ids: string[];
  strategy: ReengageStrategy;
  channel_override: ChannelPreference;
}

const COLD_LEADS_SNAPSHOT_PREFIX = "rt_cold_leads_snapshot:";

function readColdLeadsSnapshot(workspaceId: string): ColdLead[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  const key = `${COLD_LEADS_SNAPSHOT_PREFIX}${workspaceId}`;
  try {
    const raw = safeGetItem(key);
    const parsed = raw ? (JSON.parse(raw) as ColdLead[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    safeRemoveItem(key);
    return [];
  }
}

function persistColdLeadsSnapshot(workspaceId: string, leads: ColdLead[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  safeSetItem(`${COLD_LEADS_SNAPSHOT_PREFIX}${workspaceId}`, JSON.stringify(leads));
}

function formatRelativeTime(dateStr?: string, t?: any): string {
  if (!dateStr) return t ? t("formatTime.never") : "Never";
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (!t) {
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  if (diffMins < 1) return t("formatTime.justNow");
  if (diffMins < 60) return t("formatTime.minutesAgo", { count: diffMins });
  if (diffHours < 24) return t("formatTime.hoursAgo", { count: diffHours });
  if (diffDays < 7) return t("formatTime.daysAgo", { count: diffDays });
  return past.toLocaleDateString();
}

function getReasonLabel(reason: ColdLeadReason, t: any): string {
  const map: Record<ColdLeadReason, string> = {
    no_activity_30d: t("reason.noActivity30d"),
    no_reply_14d: t("reason.noReply14d"),
    lost_deal: t("reason.lostDeal"),
    manual: t("reason.manual"),
  };
  return map[reason] ?? reason;
}

function getStatusBadgeVariant(status: ColdLeadStatus): "neutral" | "info" | "success" | "warning" | "error" {
  switch (status) {
    case "pending":
      return "neutral";
    case "in_progress":
      return "info";
    case "completed":
      return "success";
    case "exhausted":
      return "error";
    default:
      return "neutral";
  }
}

function getPriorityColor(priority: ColdLeadPriority): string {
  switch (priority) {
    case "high":
      return "text-[var(--accent-danger,#ef4444)] bg-[var(--accent-danger,#ef4444)]/15 border-[var(--accent-danger,#ef4444)]/30";
    case "medium":
      return "text-[var(--accent-warning,#f59e0b)] bg-[var(--accent-warning,#f59e0b)]/15 border-[var(--accent-warning,#f59e0b)]/30";
    case "low":
      return "text-[var(--accent-primary)] bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/30";
    default:
      return "text-[var(--text-tertiary)] bg-[var(--bg-inset)] border-[var(--border-default)]";
  }
}

interface StatsProps {
  total: number;
  pending: number;
  inProgress: number;
  reengaged: number;
  exhausted: number;
}

interface StatsBarProps extends StatsProps {
  t: any;
}

function StatsBar({ total, pending, inProgress, reengaged, exhausted, t }: StatsBarProps) {
  const recoverableRevenue = (pending + inProgress) * 150;
  const recoveryRate = reengaged + exhausted > 0
    ? Math.round((reengaged / (reengaged + exhausted)) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">{t("stats.totalColdLeads")}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{total}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">{t("stats.pending")}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{pending}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">{t("stats.inProgress")}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{inProgress}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">{t("stats.reengaged")}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{reengaged}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">Recoverable</p>
        <p className="text-lg font-semibold text-[#10b981] mt-1">~${recoverableRevenue.toLocaleString()}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">Recovery Rate</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{recoveryRate}%</p>
      </div>
    </div>
  );
}

interface AddLeadFormState {
  name: string;
  email: string;
  phone: string;
  reason: ColdLeadReason;
  priority: ColdLeadPriority;
}

interface ReengageDialogState {
  open: boolean;
  selectedLeadId?: string;
  isBulk: boolean;
  strategy: ReengageStrategy;
  channel: ChannelPreference;
}

export default function ColdLeadsPage() {
  const t = useTranslations("coldLeads");
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialLeads = readColdLeadsSnapshot(snapshotWorkspaceId);

  const [leads, setLeads] = useState<ColdLead[]>(initialLeads);
  const [loading, setLoading] = useState(initialLeads.length === 0);
  const [statusFilter, setStatusFilter] = useState<ColdLeadStatus | "all">("all");
  const [reasonFilter, setReasonFilter] = useState<ColdLeadReason | "all">("all");
  const [sortBy, setSortBy] = useState<"priority" | "next_attempt" | "recent" | "attempts">("priority");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadSaving, setAddLeadSaving] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormState>({
    name: "",
    email: "",
    phone: "",
    reason: "no_activity_30d",
    priority: "medium",
  });
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [reengageDialog, setReengageDialog] = useState<ReengageDialogState>({
    open: false,
    isBulk: false,
    strategy: "auto",
    channel: "default",
  });
  const [reengageSaving, setReengageSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch cold leads
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    fetch(`/api/cold-leads?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: ColdLead[] }) => {
        if (cancelled) return;
        const next = data.items ?? [];
        setLeads(next);
        persistColdLeadsSnapshot(workspaceId, next);
      })
      .catch(() => {
        if (cancelled) return;
        setLeads([]);
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

  // Filter and sort leads
  const filtered = useMemo(() => {
    let result = leads;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Reason filter
    if (reasonFilter !== "all") {
      result = result.filter((l) => l.reason === reasonFilter);
    }

    // Search filter
    if ((debouncedSearch ?? "").trim()) {
      const q = (debouncedSearch ?? "").toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "next_attempt":
          const aNext = a.next_attempt_at ? new Date(a.next_attempt_at).getTime() : Infinity;
          const bNext = b.next_attempt_at ? new Date(b.next_attempt_at).getTime() : Infinity;
          return aNext - bNext;
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "attempts":
          return b.attempts - a.attempts;
        default:
          return 0;
      }
    });

    return result;
  }, [leads, statusFilter, reasonFilter, debouncedSearch, sortBy]);

  // Compute stats
  const stats = useMemo(
    () => ({
      total: leads.length,
      pending: leads.filter((l) => l.status === "pending").length,
      inProgress: leads.filter((l) => l.status === "in_progress").length,
      reengaged: leads.filter((l) => l.status === "completed").length,
      exhausted: leads.filter((l) => l.status === "exhausted").length,
    }),
    [leads]
  );

  const handleAddLead = async () => {
    if (!(addLeadForm.name ?? "").trim()) {
      const errorMsg = t("toast.error.nameRequired", { defaultValue: "Name is required" });
      setAddLeadError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    if (!workspaceId) {
      toast.error(t("toast.error.fillRequired"));
      return;
    }

    setAddLeadSaving(true);
    try {
      const response = await fetch("/api/cold-leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: (addLeadForm.name ?? "").trim(),
          email: (addLeadForm.email ?? "").trim() || undefined,
          phone: (addLeadForm.phone ?? "").trim() || undefined,
          reason: addLeadForm.reason,
          priority: addLeadForm.priority,
        }),
      });

      if (!response.ok) {
        toast.error(t("toast.error.addFailed"));
        return;
      }

      const newLead = await response.json();
      setLeads([...leads, newLead]);
      persistColdLeadsSnapshot(workspaceId, [...leads, newLead]);
      setAddLeadForm({
        name: "",
        email: "",
        phone: "",
        reason: "no_activity_30d",
        priority: "medium",
      });
      setAddLeadOpen(false);
      toast.success(t("toast.success.addedLead"));
    } catch (err) {
      toast.error(t("toast.error.addFailed"));
    } finally {
      setAddLeadSaving(false);
    }
  };

  const handleReengage = async () => {
    if (reengageDialog.isBulk) {
      const pendingIds = leads
        .filter((l) => l.status === "pending")
        .map((l) => l.id);
      if (pendingIds.length === 0) {
        toast.error(t("toast.error.noPendingLeads"));
        return;
      }
    } else if (!reengageDialog.selectedLeadId) {
      return;
    }

    setReengageSaving(true);
    try {
      const leadIds = reengageDialog.isBulk
        ? leads.filter((l) => l.status === "pending").map((l) => l.id)
        : [reengageDialog.selectedLeadId!];

      const response = await fetch("/api/cold-leads/reengage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          lead_ids: leadIds,
          strategy: reengageDialog.strategy,
          channel_override: reengageDialog.channel,
        } as ReengagePayload & { workspace_id: string }),
      });

      if (!response.ok) {
        toast.error(t("toast.error.reengageFailed"));
        return;
      }

      // Update local state
      const updatedLeads = leads.map((l) =>
        leadIds.includes(l.id) ? { ...l, status: "in_progress" as ColdLeadStatus } : l
      );
      setLeads(updatedLeads);
      persistColdLeadsSnapshot(workspaceId, updatedLeads);
      setReengageDialog({ open: false, isBulk: false, strategy: "auto", channel: "default" });
      toast.success(t("toast.success.reengagedLeads", { count: leadIds.length }));
    } catch (err) {
      toast.error(t("toast.error.reengageFailed"));
    } finally {
      setReengageSaving(false);
    }
  };

  const handleSkip = async (leadId: string) => {
    if (!workspaceId) return;
    try {
      const response = await fetch(`/api/cold-leads/${leadId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, status: "exhausted" }),
      });

      if (!response.ok) {
        toast.error(t("toast.error.skipFailed"));
        return;
      }

      const updated = leads.map((l) =>
        l.id === leadId ? { ...l, status: "exhausted" as ColdLeadStatus } : l
      );
      setLeads(updated);
      persistColdLeadsSnapshot(workspaceId, updated);
      toast.success(t("toast.success.markedExhausted"));
    } catch (err) {
      toast.error(t("toast.error.skipFailed"));
    }
  };

  const handleRemove = async (leadId: string) => {
    if (!workspaceId) return;
    try {
      const response = await fetch(`/api/cold-leads/${leadId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      if (!response.ok) {
        toast.error(t("toast.error.removeFailed"));
        return;
      }

      const updated = leads.filter((l) => l.id !== leadId);
      setLeads(updated);
      persistColdLeadsSnapshot(workspaceId, updated);
      toast.success(t("toast.success.removed"));
    } catch (err) {
      toast.error(t("toast.error.removeFailed"));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <Breadcrumbs items={[{ label: "Home", href: "/app" }, { label: "Cold leads" }]} />
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
          {t("title")}
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          {t("description")}
        </p>
      </div>

      {/* Brain-managed reactivation banner */}
      <div className="mb-6 rounded-xl border border-violet-500/15 bg-violet-500/[0.04] px-4 py-3 flex items-center gap-3">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <p className="text-sm text-[var(--text-primary)]">
          <span className="font-semibold text-violet-400">Brain reactivation active</span>
          {' · '}
          <span>{stats.pending} leads queued</span>
          {' · '}
          <span className="text-[var(--text-secondary)]">Automatically reaching out based on churn risk and last contact timing</span>
        </p>
      </div>

      {/* Stats Bar */}
      <StatsBar
        total={stats.total}
        pending={stats.pending}
        inProgress={stats.inProgress}
        reengaged={stats.reengaged}
        exhausted={stats.exhausted}
        t={t}
      />

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setAddLeadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t("addButton")}
        </button>
        <button
          onClick={() =>
            setReengageDialog({
              open: true,
              isBulk: true,
              strategy: "auto",
              channel: "default",
            })
          }
          disabled={stats.pending === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] hover:bg-[var(--border-default)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4" />
          {t("reengageAll")}
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="mb-6 flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ColdLeadStatus | "all")}
          className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm hover:border-[var(--border-medium)]"
        >
          <option value="all">{t("status.all")}</option>
          <option value="pending">{t("status.pending")}</option>
          <option value="in_progress">{t("status.inProgress")}</option>
          <option value="completed">{t("status.completed")}</option>
          <option value="exhausted">{t("status.exhausted")}</option>
        </select>

        {/* Reason Filter */}
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as ColdLeadReason | "all")}
          className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm hover:border-[var(--border-medium)]"
        >
          <option value="all">{t("reason.all")}</option>
          <option value="no_activity_30d">{t("reason.noActivity30d")}</option>
          <option value="no_reply_14d">{t("reason.noReply14d")}</option>
          <option value="lost_deal">{t("reason.lostDeal")}</option>
          <option value="manual">{t("reason.manual")}</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "priority" | "next_attempt" | "recent" | "attempts")
          }
          className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm hover:border-[var(--border-medium)]"
        >
          <option value="priority">{t("sort.priority")}</option>
          <option value="next_attempt">{t("sort.nextAttempt")}</option>
          <option value="recent">{t("sort.recent")}</option>
          <option value="attempts">{t("sort.attempts")}</option>
        </select>
      </div>

      {/* Table or Empty State */}
      {loading ? (
        <div className="skeleton-shimmer space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("empty.title")}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {t("empty.description")}
          </p>
          <button
            onClick={() => setAddLeadOpen(true)}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:opacity-90"
          >
            {t("addButton")}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,0.5fr] gap-4 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-inset)] text-xs font-medium text-[var(--text-secondary)]">
            <div>{t("table.lead")}</div>
            <div>{t("table.reason")}</div>
            <div>{t("table.priority")}</div>
            <div>{t("table.stage")}</div>
            <div>{t("table.attempts")}</div>
            <div>{t("table.lastAttempt")}</div>
            <div>{t("table.nextAttempt")}</div>
            <div>{t("table.status")}</div>
            <div className="text-right">{t("table.actions")}</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[var(--border-default)]">
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="md:grid md:grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,0.5fr] gap-4 md:gap-4 px-4 py-4 hover:bg-[var(--bg-inset)]/30 transition-colors flex flex-col md:items-center"
              >
                {/* Lead Name / Contact */}
                <div className="md:col-span-1">
                  <p className="font-medium text-[var(--text-primary)]">{lead.name}</p>
                  <div className="flex gap-2 mt-1 text-xs text-[var(--text-secondary)] flex-wrap">
                    {lead.email && <span>{lead.email}</span>}
                    {lead.phone && <span>{lead.phone}</span>}
                  </div>
                </div>

                {/* Reason */}
                <div className="md:col-span-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-default)]">
                    {getReasonLabel(lead.reason, t)}
                  </span>
                </div>

                {/* Priority */}
                <div className="md:col-span-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                      lead.priority
                    )}`}
                  >
                    {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                  </span>
                </div>

                {/* Reactivation Stage */}
                <div className="md:col-span-1 flex gap-1 items-center" aria-label={t("table.stageLabel", { defaultValue: "Reactivation progress" })}>
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < lead.attempts
                          ? "bg-[#10b981]"
                          : "bg-[var(--border-default)]"
                      }`}
                      title={`Stage ${i} ${i < lead.attempts ? "(completed)" : "(pending)"}`}
                    />
                  ))}
                </div>

                {/* Attempts */}
                <div className="md:col-span-1">
                  <span className="text-sm text-[var(--text-primary)]">
                    {t("attempts", { current: lead.attempts, max: lead.max_attempts })}
                  </span>
                </div>

                {/* Last Attempt */}
                <div className="md:col-span-1">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatRelativeTime(lead.last_attempt_at, t)}
                  </span>
                </div>

                {/* Next Attempt */}
                <div className="md:col-span-1">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {lead.next_attempt_at ? formatRelativeTime(lead.next_attempt_at, t) : t("formatTime.never")}
                  </span>
                </div>

                {/* Status */}
                <div className="md:col-span-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    lead.status === "in_progress"
                      ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
                      : lead.status === "pending"
                        ? "bg-[var(--bg-inset)] text-[var(--text-tertiary)] border-[var(--border-default)]"
                        : lead.status === "completed"
                          ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
                          : "bg-[var(--accent-danger,#ef4444)]/15 text-[var(--accent-danger,#ef4444)] border-[var(--accent-danger,#ef4444)]/30"
                  }`}>
                    {lead.status === "in_progress"
                      ? t("status.inProgress")
                      : lead.status === "pending"
                        ? t("status.pending")
                        : lead.status === "completed"
                          ? t("status.completed")
                          : t("status.exhausted")}
                  </span>
                </div>

                {/* Actions */}
                <div className="md:col-span-1 flex gap-1 justify-end">
                  {lead.status === "pending" && (
                    <button
                      onClick={() =>
                        setReengageDialog({
                          open: true,
                          selectedLeadId: lead.id,
                          isBulk: false,
                          strategy: "auto",
                          channel: "default",
                        })
                      }
                      title={t("ttip.reengage")}
                      className="p-2 rounded hover:bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSkip(lead.id)}
                    title={t("ttip.skip")}
                    className="p-2 rounded hover:bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(lead.id)}
                    title={t("ttip.remove")}
                    className="p-2 rounded hover:bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Cold Lead Modal */}
      {addLeadOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 max-w-md w-full mx-4">
            <button
              onClick={() => setAddLeadOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t("modal.addLeadTitle")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.nameLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={addLeadForm.name}
                  onChange={(e) => {
                    setAddLeadForm({ ...addLeadForm, name: e.target.value });
                    setAddLeadError(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
                {addLeadError && (
                  <p className="text-xs text-red-500 mt-1">{addLeadError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.emailLabel")}
                </label>
                <input
                  type="email"
                  placeholder={t("email")}
                  value={addLeadForm.email}
                  onChange={(e) =>
                    setAddLeadForm({ ...addLeadForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.phoneLabel")}
                </label>
                <input
                  type="tel"
                  placeholder={t("phone")}
                  value={addLeadForm.phone}
                  onChange={(e) =>
                    setAddLeadForm({ ...addLeadForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.reasonLabel")}
                </label>
                <select
                  value={addLeadForm.reason}
                  onChange={(e) =>
                    setAddLeadForm({
                      ...addLeadForm,
                      reason: e.target.value as ColdLeadReason,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                >
                  <option value="no_activity_30d">{t("reason.noActivity30d")}</option>
                  <option value="no_reply_14d">{t("reason.noReply14d")}</option>
                  <option value="lost_deal">{t("reason.lostDeal")}</option>
                  <option value="manual">{t("reason.manual")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.priorityLabel")}
                </label>
                <select
                  value={addLeadForm.priority}
                  onChange={(e) =>
                    setAddLeadForm({
                      ...addLeadForm,
                      priority: e.target.value as ColdLeadPriority,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                >
                  <option value="high">{t("priority.high")}</option>
                  <option value="medium">{t("priority.medium")}</option>
                  <option value="low">{t("priority.low")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setAddLeadOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-inset)] text-sm font-medium"
                >
                  {t("modal.cancelButton")}
                </button>
                <button
                  onClick={handleAddLead}
                  disabled={addLeadSaving}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 text-sm font-medium"
                >
                  {addLeadSaving ? t("buttons.adding") : t("modal.addButton")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-engage Dialog */}
      {reengageDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 max-w-md w-full mx-4">
            <button
              onClick={() =>
                setReengageDialog({
                  open: false,
                  isBulk: false,
                  strategy: "auto",
                  channel: "default",
                })
              }
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t("modal.reengageTitle")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.strategyLabel")}
                </label>
                <select
                  value={reengageDialog.strategy}
                  onChange={(e) =>
                    setReengageDialog({
                      ...reengageDialog,
                      strategy: e.target.value as ReengageStrategy,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                >
                  <option value="auto">{t("strategy.auto")}</option>
                  <option value="value_first">{t("strategy.valueFirst")}</option>
                  <option value="clarification">{t("strategy.clarification")}</option>
                  <option value="social_proof">{t("strategy.socialProof")}</option>
                  <option value="urgency">{t("strategy.urgency")}</option>
                  <option value="direct_close">{t("strategy.directClose")}</option>
                </select>
                {/* Strategy Explanation */}
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {reengageDialog.strategy === "auto"
                    ? "AI selects the best angle based on history"
                    : reengageDialog.strategy === "value_first"
                      ? "Lead with value proposition and outcomes"
                      : reengageDialog.strategy === "clarification"
                        ? "Check in and offer to clarify"
                        : reengageDialog.strategy === "social_proof"
                          ? "Share case studies and results"
                          : reengageDialog.strategy === "urgency"
                            ? "Create time-sensitive incentive"
                            : "Final outreach before closing file"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.channelLabel")}
                </label>
                <select
                  value={reengageDialog.channel}
                  onChange={(e) =>
                    setReengageDialog({
                      ...reengageDialog,
                      channel: e.target.value as ChannelPreference,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                >
                  <option value="default">{t("channel.default")}</option>
                  <option value="call_first">{t("channel.callFirst")}</option>
                  <option value="text_first">{t("channel.textFirst")}</option>
                  <option value="email_first">{t("channel.emailFirst")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() =>
                    setReengageDialog({
                      open: false,
                      isBulk: false,
                      strategy: "auto",
                      channel: "default",
                    })
                  }
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-inset)] text-sm font-medium"
                >
                  {t("modal.cancelButton")}
                </button>
                <button
                  onClick={handleReengage}
                  disabled={reengageSaving}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 text-sm font-medium"
                >
                  {reengageSaving ? t("processing") : t("confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
