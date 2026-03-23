"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, MoreHorizontal, Zap, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { useDebounce } from "@/hooks/useDebounce";

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

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Never";
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

function getReasonLabel(reason: ColdLeadReason): string {
  const map: Record<ColdLeadReason, string> = {
    no_activity_30d: "No Activity 30d",
    no_reply_14d: "No Reply 14d",
    lost_deal: "Lost Deal",
    manual: "Manual",
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
      return "text-red-400 bg-red-500/15 border-red-500/30";
    case "medium":
      return "text-yellow-400 bg-yellow-500/15 border-yellow-500/30";
    case "low":
      return "text-green-400 bg-green-500/15 border-green-500/30";
    default:
      return "text-gray-400 bg-gray-500/15 border-gray-500/30";
  }
}

interface StatsProps {
  total: number;
  pending: number;
  inProgress: number;
  reengaged: number;
  exhausted: number;
}

function StatsBar({ total, pending, inProgress, reengaged, exhausted }: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">Total Cold Leads</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{total}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">Pending</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{pending}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">In Progress</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{inProgress}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">Re-engaged</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{reengaged}</p>
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">Exhausted</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{exhausted}</p>
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
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
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
    if (!addLeadForm.name.trim() || !workspaceId) {
      toast.error("Please fill in required fields");
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
          name: addLeadForm.name.trim(),
          email: addLeadForm.email.trim() || undefined,
          phone: addLeadForm.phone.trim() || undefined,
          reason: addLeadForm.reason,
          priority: addLeadForm.priority,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to add cold lead");
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
      toast.success("Cold lead added");
    } catch (err) {
      toast.error("Failed to add cold lead");
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
        toast.error("No pending leads to re-engage");
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
        toast.error("Failed to re-engage leads");
        return;
      }

      // Update local state
      const updatedLeads = leads.map((l) =>
        leadIds.includes(l.id) ? { ...l, status: "in_progress" as ColdLeadStatus } : l
      );
      setLeads(updatedLeads);
      persistColdLeadsSnapshot(workspaceId, updatedLeads);
      setReengageDialog({ open: false, isBulk: false, strategy: "auto", channel: "default" });
      toast.success(`Started re-engagement for ${leadIds.length} lead(s)`);
    } catch (err) {
      toast.error("Failed to re-engage leads");
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
        toast.error("Failed to skip lead");
        return;
      }

      const updated = leads.map((l) =>
        l.id === leadId ? { ...l, status: "exhausted" as ColdLeadStatus } : l
      );
      setLeads(updated);
      persistColdLeadsSnapshot(workspaceId, updated);
      toast.success("Lead marked as exhausted");
    } catch (err) {
      toast.error("Failed to skip lead");
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
        toast.error("Failed to remove lead");
        return;
      }

      const updated = leads.filter((l) => l.id !== leadId);
      setLeads(updated);
      persistColdLeadsSnapshot(workspaceId, updated);
      toast.success("Lead removed");
    } catch (err) {
      toast.error("Failed to remove lead");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Cold Leads
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Re-engage dormant leads and recover lost opportunities
        </p>
      </div>

      {/* Stats Bar */}
      <StatsBar
        total={stats.total}
        pending={stats.pending}
        inProgress={stats.inProgress}
        reengaged={stats.reengaged}
        exhausted={stats.exhausted}
      />

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setAddLeadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Cold Leads
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
          Re-engage All Pending
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="mb-6 flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
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
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="exhausted">Exhausted</option>
        </select>

        {/* Reason Filter */}
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as ColdLeadReason | "all")}
          className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm hover:border-[var(--border-medium)]"
        >
          <option value="all">All Reasons</option>
          <option value="no_activity_30d">No Activity 30d</option>
          <option value="no_reply_14d">No Reply 14d</option>
          <option value="lost_deal">Lost Deal</option>
          <option value="manual">Manual</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "priority" | "next_attempt" | "recent" | "attempts")
          }
          className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm hover:border-[var(--border-medium)]"
        >
          <option value="priority">Priority</option>
          <option value="next_attempt">Next Attempt</option>
          <option value="recent">Most Recent</option>
          <option value="attempts">Attempt Count</option>
        </select>
      </div>

      {/* Table or Empty State */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No cold leads in the queue</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Leads are automatically added when they go dormant for 30+ days, or you can manually add leads that need re-engagement.
          </p>
          <button
            onClick={() => setAddLeadOpen(true)}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:opacity-90"
          >
            Add Cold Leads
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr,0.5fr] gap-4 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-inset)] text-xs font-medium text-[var(--text-secondary)]">
            <div>Lead</div>
            <div>Reason</div>
            <div>Priority</div>
            <div>Attempts</div>
            <div>Last Attempt</div>
            <div>Next Attempt</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[var(--border-default)]">
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="md:grid md:grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr,0.5fr] gap-4 md:gap-4 px-4 py-4 hover:bg-[var(--bg-inset)]/30 transition-colors flex flex-col md:items-center"
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
                    {getReasonLabel(lead.reason)}
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

                {/* Attempts */}
                <div className="md:col-span-1">
                  <span className="text-sm text-[var(--text-primary)]">
                    {lead.attempts} of {lead.max_attempts}
                  </span>
                </div>

                {/* Last Attempt */}
                <div className="md:col-span-1">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatRelativeTime(lead.last_attempt_at)}
                  </span>
                </div>

                {/* Next Attempt */}
                <div className="md:col-span-1">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {lead.next_attempt_at ? formatRelativeTime(lead.next_attempt_at) : "Not scheduled"}
                  </span>
                </div>

                {/* Status */}
                <div className="md:col-span-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    lead.status === "in_progress"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : lead.status === "pending"
                        ? "bg-gray-500/15 text-gray-400 border-gray-500/30"
                        : lead.status === "completed"
                          ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                  }`}>
                    {lead.status === "in_progress"
                      ? "In Progress"
                      : lead.status === "pending"
                        ? "Pending"
                        : lead.status === "completed"
                          ? "Completed"
                          : "Exhausted"}
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
                      title="Re-engage"
                      className="p-2 rounded hover:bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSkip(lead.id)}
                    title="Skip"
                    className="p-2 rounded hover:bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(lead.id)}
                    title="Remove"
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
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add Cold Lead</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="Lead name"
                  value={addLeadForm.name}
                  onChange={(e) =>
                    setAddLeadForm({ ...addLeadForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={addLeadForm.email}
                  onChange={(e) =>
                    setAddLeadForm({ ...addLeadForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={addLeadForm.phone}
                  onChange={(e) =>
                    setAddLeadForm({ ...addLeadForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Reason *
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
                  <option value="no_activity_30d">No Activity 30d</option>
                  <option value="no_reply_14d">No Reply 14d</option>
                  <option value="lost_deal">Lost Deal</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Priority *
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
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setAddLeadOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-inset)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  disabled={addLeadSaving}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 text-sm font-medium"
                >
                  {addLeadSaving ? "Adding..." : "Add Lead"}
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
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Re-engage Lead</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Strategy
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
                  <option value="auto">Auto (Recommended)</option>
                  <option value="value_first">Value-First</option>
                  <option value="clarification">Clarification</option>
                  <option value="social_proof">Social Proof</option>
                  <option value="urgency">Urgency</option>
                  <option value="direct_close">Direct Close</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Channel
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
                  <option value="default">Use Workspace Default</option>
                  <option value="call_first">Call First</option>
                  <option value="text_first">Text First</option>
                  <option value="email_first">Email First</option>
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
                  Cancel
                </button>
                <button
                  onClick={handleReengage}
                  disabled={reengageSaving}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 text-sm font-medium"
                >
                  {reengageSaving ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
