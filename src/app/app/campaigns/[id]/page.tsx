"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import {
  ArrowLeft,
  Megaphone,
  Edit3,
  Copy,
  Trash2,
  Play,
  Pause,
  X,
  Check,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast as sonnerToast } from "sonner";

type TouchpointType = "call" | "sms" | "email" | "wait";

type TargetFilter = {
  audience?: string;
  message_template?: string;
  schedule?: string | null | { start_at?: string | null; business_hours_only?: boolean; daily_limit?: number; hourly_throttle?: number };
  schedule_type?: "manual" | "once" | "recurring" | "trigger";
  audience_statuses?: string[];
  audience_source?: string;
  audience_min_score?: number | null;
  audience_not_contacted_days?: number | null;
  sequence?: Array<{ type: TouchpointType; wait_days?: number }>;
};

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: "draft" | "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
  target_filter?: TargetFilter | null;
  leads_summary?: {
    total: number;
    called?: number;
    reached?: number;
    converted?: number;
    [key: string]: number | undefined;
  };
};

const STATUS_COLORS: Record<Campaign["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

function getStatusLabel(status: Campaign["status"]): string {
  const labels: Record<Campaign["status"], string> = {
    draft: "Draft",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
  };
  return labels[status];
}

function StatCard(p: { label: string; value: number; percentage?: number; color?: "blue" | "cyan" | "amber" | "emerald" }) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200",
    cyan: "bg-cyan-50 border-cyan-200",
    amber: "bg-amber-50 border-amber-200",
    emerald: "bg-emerald-50 border-emerald-200",
  };

  const textColorMap = {
    blue: "text-blue-700",
    cyan: "text-cyan-700",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
  };

  const badgeColorMap = {
    blue: "bg-blue-100 text-blue-700",
    cyan: "bg-cyan-100 text-cyan-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  const color = p.color || "blue";

  return (
    <div className={`rounded-2xl border ${colorMap[color]} bg-[var(--bg-card)] p-5`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{p.label}</p>
      <p className={`mt-2 text-2xl font-bold ${textColorMap[color]}`}>{p.value}</p>
      {typeof p.percentage === "number" && (
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${badgeColorMap[color]}`}>
            {p.percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const id = typeof params.id === "string" ? params.id : "";
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const _snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (!id || !workspaceId) return;
    let cancelled = false;

    fetch(`/api/campaigns/${id}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const c = data as Campaign;
        setCampaign(c);
        setEditingName(c.name);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Campaign not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, workspaceId]);

  const handleSaveName = async () => {
    if (!campaign || !editingName.trim()) return;
    if (editingName === campaign.name) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = (await res.json()) as Campaign;
      setCampaign(updated);
      setIsEditing(false);
      sonnerToast.success("Campaign name updated");
    } catch {
      sonnerToast.error("Failed to update campaign name");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;
    const newStatus = campaign.status === "active" ? "paused" : "active";

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = (await res.json()) as Campaign;
      setCampaign(updated);
      sonnerToast.success(newStatus === "active" ? "Campaign resumed" : "Campaign paused");
    } catch {
      sonnerToast.error("Failed to update campaign status");
    }
  };

  const handleDuplicate = async () => {
    if (!campaign) return;
    setDuplicating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${campaign.name} (Copy)`,
          type: campaign.type,
          target_filter: campaign.target_filter,
        }),
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      sonnerToast.success("Campaign duplicated");
      const created = (await res.json()) as Campaign;
      router.push(`/app/campaigns/${created.id}`);
    } catch {
      sonnerToast.error("Failed to duplicate campaign");
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to delete");
      }
      sonnerToast.success("Campaign deleted");
      router.push("/app/campaigns");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete campaign";
      sonnerToast.error(message);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-4 w-32 bg-[var(--bg-inset)] rounded skeleton-shimmer" />
        <div className="h-8 w-64 bg-[var(--bg-inset)] rounded skeleton-shimmer" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[var(--bg-inset)] rounded-xl skeleton-shimmer" />
          ))}
        </div>
        <div className="h-40 bg-[var(--bg-inset)] rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <p className="text-sm text-[var(--text-tertiary)]">{error || "Campaign not found"}</p>
          <button
            onClick={() => location.reload()}
            className="mt-4 text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 font-medium"
          >
            Try again →
          </button>
        </div>
      </div>
    );
  }

  const summary = (campaign.leads_summary || {}) as Record<string, number>;
  const total = summary.total ?? 0;
  const called = summary.called ?? 0;
  const reached = summary.reached ?? 0;
  const converted = summary.converted ?? 0;
  const calledPct = total > 0 ? Math.round((called / total) * 100) : 0;
  const reachedPct = called > 0 ? Math.round((reached / called) * 100) : 0;
  const convertedPct = reached > 0 ? Math.round((converted / reached) * 100) : 0;

  const createdDate = new Date(campaign.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const tf = campaign.target_filter;
  const hasSequence =
    Array.isArray(tf?.sequence) && tf.sequence.length > 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Breadcrumbs
        items={[
          { label: "Campaigns", href: "/app/campaigns" },
          { label: campaign.name },
        ]}
      />

      <header className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-5 h-5 text-[var(--text-secondary)]" />
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xl font-bold rounded-lg bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--accent-primary)]"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingName(campaign.name);
                    }}
                    className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] truncate">
                  {campaign.name}
                </h1>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${STATUS_COLORS[campaign.status]}`}
              >
                {campaign.status === "active" && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative inline-block">
                      <span className="absolute inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                  </span>
                )}
                {getStatusLabel(campaign.status)}
                {campaign.status === "active" && <span className="text-xs ml-1">Executing...</span>}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Created {createdDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsEditing(true)}
              disabled={isEditing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
              title="Edit campaign name"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>

            {campaign.status !== "active" && (
              <button
                onClick={handleToggleStatus}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Resume campaign"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}

            {campaign.status === "active" && (
              <button
                onClick={handleToggleStatus}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Pause campaign"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}

            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
              title="Duplicate campaign"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>

            <button
              onClick={() => setDeleteConfirm(true)}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete campaign"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Contacts" value={total} color="blue" />
          <StatCard label="Called" value={called} percentage={calledPct} color="cyan" />
          <StatCard label="Reached" value={reached} percentage={reachedPct} color="amber" />
          <StatCard label="Converted" value={converted} percentage={convertedPct} color="emerald" />
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-4">
            Execution Progress
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-primary)]">Called / Total</span>
              <span className="text-xs font-semibold text-cyan-600">{calledPct}%</span>
            </div>
            <div className="w-full bg-[var(--bg-inset)] rounded-full h-3 overflow-hidden border border-[var(--border-default)]">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-500"
                style={{ width: `${calledPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-5">
            Conversion Funnel
          </h3>
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <div className="bg-blue-500 rounded-lg p-3 text-white">
                  <p className="text-xs font-medium opacity-90">Total Contacts</p>
                  <p className="text-lg font-bold">{total}</p>
                </div>
              </div>
              <span className="text-[var(--text-tertiary)] font-semibold">→</span>
              <div className="flex-1" style={{ opacity: called > 0 ? 1 : 0.5 }}>
                <div className="bg-cyan-500 rounded-lg p-3 text-white">
                  <p className="text-xs font-medium opacity-90">Called</p>
                  <p className="text-lg font-bold">{called}</p>
                  <p className="text-xs opacity-75 mt-1">{calledPct}%</p>
                </div>
              </div>
              <span className="text-[var(--text-tertiary)] font-semibold">→</span>
              <div className="flex-1" style={{ opacity: reached > 0 ? 1 : 0.5 }}>
                <div className="bg-amber-500 rounded-lg p-3 text-white">
                  <p className="text-xs font-medium opacity-90">Reached</p>
                  <p className="text-lg font-bold">{reached}</p>
                  <p className="text-xs opacity-75 mt-1">{reachedPct}%</p>
                </div>
              </div>
              <span className="text-[var(--text-tertiary)] font-semibold">→</span>
              <div className="flex-1" style={{ opacity: converted > 0 ? 1 : 0.5 }}>
                <div className="bg-emerald-500 rounded-lg p-3 text-white">
                  <p className="text-xs font-medium opacity-90">Converted</p>
                  <p className="text-lg font-bold">{converted}</p>
                  <p className="text-xs opacity-75 mt-1">{convertedPct}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 space-y-5">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
              Campaign Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
                  Type
                </p>
                <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)] capitalize">
                  {(campaign.type ?? "custom").replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
                  Mode
                </p>
                <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)] capitalize">
                  {tf?.schedule_type ? tf.schedule_type.replace(/_/g, " ") : "—"}
                </p>
              </div>
              {tf?.schedule && typeof tf.schedule === "string" && (
                <div>
                  <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
                    Schedule
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)]">
                    {tf.schedule}
                  </p>
                </div>
              )}
              {tf?.audience && (
                <div>
                  <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
                    Audience
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)]">
                    {tf.audience}
                  </p>
                </div>
              )}
            </div>
          </section>

          {(Array.isArray(tf?.audience_statuses) || tf?.audience_min_score || tf?.audience_not_contacted_days) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
                Audience Filters
              </h2>
              <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                {Array.isArray(tf?.audience_statuses) && tf.audience_statuses.length > 0 && (
                  <li>
                    <span className="text-[var(--text-tertiary)]">Statuses:</span> {tf.audience_statuses.join(", ")}
                  </li>
                )}
                {typeof tf?.audience_min_score === "number" && (
                  <li>
                    <span className="text-[var(--text-tertiary)]">Min Score:</span> {tf.audience_min_score}
                  </li>
                )}
                {typeof tf?.audience_not_contacted_days === "number" && (
                  <li>
                    <span className="text-[var(--text-tertiary)]">Not Contacted for:</span> {tf.audience_not_contacted_days} days
                  </li>
                )}
              </ul>
            </section>
          )}

          {(tf?.schedule && typeof tf.schedule === "object" && (tf.schedule.business_hours_only !== undefined || tf.schedule.daily_limit !== undefined || tf.schedule.hourly_throttle !== undefined)) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
                Schedule & Limits
              </h2>
              <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                {typeof tf.schedule.business_hours_only === "boolean" && (
                  <li>
                    <span className="text-[var(--text-tertiary)]">Business Hours:</span> {tf.schedule.business_hours_only ? "Enabled" : "Disabled"}
                  </li>
                )}
                {typeof tf.schedule.daily_limit === "number" && (
                  <li>
                    <span className="text-[var(--text-tertiary)]">Daily Limit:</span> {tf.schedule.daily_limit} contacts
                  </li>
                )}
                {typeof tf.schedule.hourly_throttle === "number" && (
                  <li>
                    <span className="text-[var(--text-tertiary)]">Hourly Throttle:</span> {tf.schedule.hourly_throttle} per hour
                  </li>
                )}
              </ul>
            </section>
          )}

          {hasSequence && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
                Campaign Sequence
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {tf!.sequence!.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] capitalize">
                      {step.type === "wait" && step.wait_days ? `Wait ${step.wait_days}d` : step.type}
                    </div>
                    {idx < tf!.sequence!.length - 1 && (
                      <span className="text-[var(--text-tertiary)]">→</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {converted > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900 mb-2">
                  Estimated Revenue Impact
                </h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-emerald-700">
                    ${(converted * 150).toLocaleString()}
                  </p>
                  <p className="text-sm text-emerald-600 font-medium">
                    recoverable revenue
                  </p>
                </div>
                <p className="mt-2 text-xs text-emerald-700">
                  Based on {converted} conversion{converted !== 1 ? "s" : ""} at ~$150 per conversion
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          open={deleteConfirm}
          title="Delete Campaign?"
          message="This action cannot be undone. The campaign and its associated data will be permanently deleted."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
