"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Plus, Copy, Trash2, Play, Pause, Pencil, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";

type TouchpointType = "call" | "sms" | "email" | "wait";

type TargetFilter = {
  audience?: string;
  message_template?: string;
  schedule?: string | null;
  schedule_type?: "manual" | "once" | "recurring" | "trigger";
  audience_statuses?: string[];
  audience_source?: string;
  audience_min_score?: number | null;
  audience_not_contacted_days?: number | null;
  sequence?: Array<{ type: TouchpointType; wait_days?: number }>;
};

type CampaignRow = {
  id: string;
  name: string;
  type: string;
  status: "draft" | "active" | "paused" | "completed";
  total_contacts: number;
  called: number;
  answered: number;
  appointments_booked: number;
  created_at: string;
  target_filter?: TargetFilter | null;
};

const TYPE_OPTIONS = [
  { id: "lead_followup", labelKey: "type.leadFollowup" },
  { id: "appointment_reminder", labelKey: "type.appointmentReminder" },
  { id: "reactivation", labelKey: "type.reactivation" },
  { id: "cold_outreach", labelKey: "type.coldOutreach" },
  { id: "review_request", labelKey: "type.reviewRequest" },
  { id: "custom", labelKey: "type.custom" },
];

const LEAD_STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
] as const;

const LEAD_STATUS_KEY: Record<(typeof LEAD_STATUS_OPTIONS)[number], string> = {
  "New": "new",
  "Contacted": "contacted",
  "Qualified": "qualified",
  "Appointment Set": "appointmentSet",
  "Won": "won",
  "Lost": "lost",
};

const SOURCE_OPTIONS = [
  { id: "", labelKey: "source.any" },
  { id: "inbound_call", labelKey: "source.inboundCall" },
  { id: "outbound", labelKey: "source.outbound" },
  { id: "website", labelKey: "source.website" },
  { id: "referral", labelKey: "source.referral" },
];

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

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialCampaigns = readCampaignsSnapshot(snapshotWorkspaceId);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns);
  const [loading, setLoading] = useState(initialCampaigns.length === 0);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignRow["status"]>("all");
  const [pauseConfirm, setPauseConfirm] = useState<CampaignRow | null>(null);
  const [campaignType, setCampaignType] = useState<string>("followup");
  const [form, setForm] = useState<{
    name: string;
    type: string;
    audience: string;
    template: string;
    schedule: string;
    scheduleType: "manual" | "once" | "recurring" | "trigger";
    audienceStatuses: string[];
    audienceSource: string;
    audienceMinScore: number | "";
    audienceNotContactedDays: number | "";
    sequence: Array<{ type: TouchpointType; wait_days?: number }>;
  }>({
    name: "",
    type: "lead_followup",
    audience: "",
    template: "",
    schedule: "",
    scheduleType: "manual" as "manual" | "once" | "recurring" | "trigger",
    audienceStatuses: [] as string[],
    audienceSource: "",
    audienceMinScore: "" as number | "",
    audienceNotContactedDays: "" as number | "",
    sequence: [{ type: "call" as TouchpointType }, { type: "wait" as TouchpointType, wait_days: 1 }, { type: "sms" as TouchpointType }] as Array<{ type: TouchpointType; wait_days?: number }>,
  });

  useEffect(() => {
    document.title = t("pageTitle");
    return () => {
      document.title = "";
    };
  }, [t]);

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
      .then((res) => (res.ok ? res.json() : { campaigns: [] }))
      .then((data: { campaigns?: CampaignRow[] }) => {
        if (cancelled) return;
        const next = data.campaigns ?? [];
        setCampaigns(next);
        persistCampaignsSnapshot(workspaceId, next);
      })
      .catch(() => {
        if (cancelled) return;
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

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return campaigns;
    return campaigns.filter((campaign) => campaign.status === statusFilter);
  }, [campaigns, statusFilter]);

  // Campaign edits are persisted to backend via API calls (POST for create, PATCH for update)
  const createCampaign = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const target_filter: TargetFilter = {
        audience: form.audience,
        message_template: form.template,
        schedule: form.schedule || null,
        schedule_type: form.scheduleType,
        sequence: form.sequence.length > 0 ? form.sequence : undefined,
        ...(form.audienceStatuses.length > 0 && { audience_statuses: form.audienceStatuses }),
        ...(form.audienceSource && { audience_source: form.audienceSource }),
        ...(typeof form.audienceMinScore === "number" && form.audienceMinScore >= 0 && { audience_min_score: form.audienceMinScore }),
        ...(typeof form.audienceNotContactedDays === "number" && form.audienceNotContactedDays > 0 && { audience_not_contacted_days: form.audienceNotContactedDays }),
      };
      const payload = {
        name: form.name.trim(),
        type: form.type,
        target_filter,
      };
      // Persist changes to backend: POST /api/campaigns for new, PATCH /api/campaigns/{id} for updates
      const res = await fetch(editingId ? `/api/campaigns/${editingId}` : "/api/campaigns", {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = (await res.json().catch(() => null)) as CampaignRow | { error?: string } | null;
      if (!res.ok || !created || !("id" in created)) {
        const errorMessage =
          created && "error" in created && typeof created.error === "string"
            ? created.error
            : editingId
              ? t("errors.updateFailed")
              : t("errors.createFailed");
        throw new Error(errorMessage);
      }
      setCampaigns((prev) =>
        editingId
          ? prev.map((item) => (item.id === created.id ? { ...item, ...created } : item))
          : [created, ...prev],
      );
      setEditingId(null);
      setForm({
        name: "",
        type: "lead_followup",
        audience: t("defaults.audience"),
        template: t("defaults.template"),
        schedule: "",
        scheduleType: "manual",
        audienceStatuses: [],
        audienceSource: "",
        audienceMinScore: "",
        audienceNotContactedDays: "",
        sequence: [{ type: "call" }, { type: "wait", wait_days: 1 }, { type: "sms" }],
      });
      setToast(editingId ? t("toast.updated") : t("toast.created"));
    } catch (_error) {
      setToast(
        editingId
          ? t("toast.updateFailed")
          : t("toast.createFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign: CampaignRow) => {
    if (campaign.status === "active") {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      });
      if (!res.ok) {
        setToast(t("toast.updateFailed"));
        return;
      }
      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaign.id ? { ...item, status: "paused" } : item)),
      );
      setToast(t("toast.paused"));
      return;
    }

    const res = await fetch(`/api/campaigns/${campaign.id}/launch`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setToast(t("toast.launchFailed"));
      return;
    }
    const data = (await res.json().catch(() => null)) as { enqueued?: number } | null;
    setCampaigns((prev) =>
      prev.map((item) => (item.id === campaign.id ? { ...item, status: "active" } : item)),
    );
    setToast(
      data?.enqueued != null
        ? t("toast.launchedWithCount", { count: String(data.enqueued) })
        : t("toast.launched"),
    );
  };

  const loadCampaignIntoForm = (campaign: CampaignRow) => {
    setEditingId(campaign.id);
    const tf = campaign.target_filter;
    const rawSeq = Array.isArray(tf?.sequence) ? tf.sequence : [];
    const seq: Array<{ type: TouchpointType; wait_days?: number }> = rawSeq.map((s: { type?: string; wait_days?: number }) => ({
      type: (s?.type === "call" || s?.type === "sms" || s?.type === "email" || s?.type === "wait" ? s.type : "call") as TouchpointType,
      ...(s?.type === "wait" && typeof s.wait_days === "number" && { wait_days: s.wait_days }),
    }));
    if (seq.length === 0) seq.push({ type: "call" }, { type: "wait", wait_days: 1 }, { type: "sms" });
    setForm({
      name: campaign.name,
      type: campaign.type,
      audience: tf?.audience ?? "",
      template: tf?.message_template ?? "",
      schedule: tf?.schedule ?? "",
      scheduleType: (tf?.schedule_type as "manual" | "once" | "recurring" | "trigger") ?? "manual",
      audienceStatuses: Array.isArray(tf?.audience_statuses) ? tf.audience_statuses : [],
      audienceSource: tf?.audience_source ?? "",
      audienceMinScore: typeof tf?.audience_min_score === "number" ? tf.audience_min_score : "",
      audienceNotContactedDays: typeof tf?.audience_not_contacted_days === "number" ? tf.audience_not_contacted_days : "",
      sequence: seq,
    });
  };

  const [deleteConfirm, setDeleteConfirm] = useState<CampaignRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteCampaign = async (campaign: CampaignRow) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setToast((data as { error?: string } | null)?.error ?? t("toast.deleteFailed"));
        return;
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      setToast(t("toast.deleted"));
    } catch {
      setToast(t("toast.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const [duplicating, setDuplicating] = useState(false);

  const duplicateCampaign = async (campaign: CampaignRow) => {
    setDuplicating(true);
    try {
      const payload = {
        name: `${campaign.name} (Copy)`,
        type: campaign.type,
        target_filter: campaign.target_filter,
      };
      const res = await fetch("/api/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = (await res.json().catch(() => null)) as CampaignRow | { error?: string } | null;
      if (!res.ok || !created || !("id" in created)) {
        setToast(t("toast.createFailed"));
        return;
      }
      setCampaigns((prev) => [created, ...prev]);
      setToast(t("toast.duplicated"));
    } catch {
      setToast(t("toast.createFailed"));
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">{t("heading")}</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {t("description")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
            >
              <option value="all">{t("statusFilter.all")}</option>
              <option value="draft">{t("statusFilter.draft")}</option>
              <option value="active">{t("statusFilter.active")}</option>
              <option value="paused">{t("statusFilter.paused")}</option>
              <option value="completed">{t("statusFilter.completed")}</option>
            </select>
            <a
              href="/app/campaigns/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {t("createCampaign")}
            </a>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4 drop-shadow-sm">
          <StatCard label={t("statTotal")} value={campaigns.length} color="blue" />
          <StatCard label={t("statActive")} value={campaigns.filter((c) => c.status === "active").length} color="emerald" />
          <StatCard label={t("statContacted")} value={campaigns.reduce((sum, c) => sum + c.called, 0)} color="cyan" />
          <StatCard label={t("statConverted")} value={campaigns.reduce((sum, c) => sum + c.appointments_booked, 0)} color="amber" />
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">{t("estRoi")}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {t("roiSummary", {
                cost: (campaigns.reduce((s, c) => s + c.called * 0.05 + c.answered * 0.02, 0)).toFixed(0),
                revenue: (campaigns.reduce((s, c) => s + c.appointments_booked * 250, 0)).toFixed(0),
              })}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
                {t("loading")}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={t("empty.title")}
                description={t("empty.body")}
                primaryAction={{ label: t("createCampaign"), href: "/app/campaigns/create" }}
              />
            ) : (
              filtered.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{campaign.name}</p>
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        {campaign.target_filter?.audience ?? t("outcomeAudience")}
                        {(() => {
                          const tf = campaign.target_filter;
                          const parts: string[] = [];
                          if (Array.isArray(tf?.audience_statuses) && tf.audience_statuses.length > 0) {
                            parts.push(tf.audience_statuses.map((s) => t(`leadStatuses.${LEAD_STATUS_KEY[s as (typeof LEAD_STATUS_OPTIONS)[number]] ?? s}`)).join(", "));
                          }
                          if (tf?.audience_source) {
                            const src = SOURCE_OPTIONS.find((o) => o.id === tf.audience_source);
                            if (src) parts.push(t(src.labelKey));
                          }
                          if (typeof tf?.audience_min_score === "number") {
                            parts.push(t("scoreGte", { score: tf.audience_min_score }));
                          }
                          if (typeof tf?.audience_not_contacted_days === "number") {
                            parts.push(t("notContactedIn", { days: tf.audience_not_contacted_days }));
                          }
                          return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
                        })()}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--border-medium)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] capitalize">
                          {t.has(`campaignType.${campaign.type}`) ? t(`campaignType.${campaign.type}` as never) : campaign.type.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full border border-[var(--border-medium)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] capitalize">
                          {t.has(`statusFilter.${campaign.status}`) ? t(`statusFilter.${campaign.status}` as never) : campaign.status}
                        </span>
                      </div>
                    </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadCampaignIntoForm(campaign)}
                      className="p-2 rounded-lg border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                      title={t("edit")}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void duplicateCampaign(campaign)}
                      disabled={duplicating}
                      className="p-2 rounded-lg border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-50"
                      title={t("duplicate")}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {campaign.status !== "active" && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(campaign)}
                        disabled={deleting}
                        className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title={t("delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        campaign.status === "active"
                          ? setPauseConfirm(campaign)
                          : void toggleCampaign(campaign)
                      }
                      className="ml-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                    >
                      {campaign.status === "active" ? (
                        <><Pause className="w-3.5 h-3.5" /> {t("pause")}</>
                      ) : (
                        <><Play className="w-3.5 h-3.5" /> {t("launchCampaign")}</>
                      )}
                    </button>
                  </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric label={t("metricContacts")} value={campaign.total_contacts} />
                    <Metric label={t("metricContacted")} value={campaign.called} />
                    <Metric label={t("metricReached")} value={campaign.answered} />
                    <Metric label={t("metricConverted")} value={campaign.appointments_booked} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                    <span>{t("remaining")}: {Math.max(0, campaign.total_contacts - campaign.called)}</span>
                    <span>·</span>
                    <span>{t("failed")}: {Math.max(0, campaign.called - campaign.answered)}</span>
                  </div>
                  {campaign.total_contacts > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                        <span>{t("progress")}</span>
                        <span>
                          {campaign.called}/{campaign.total_contacts} {t("contacted")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--bg-surface)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (campaign.called / campaign.total_contacts) * 100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {campaign.called > 0 && (
                    <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
                      <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">{t("campaignRoi")}</p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {t("roiCampaign", {
                          cost: `$${(campaign.called * 0.05 + campaign.answered * 0.02).toFixed(2)}`,
                          revenue: `$${(campaign.appointments_booked * 250).toFixed(0)}`,
                        })}
                      </p>
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-[var(--text-secondary)]">
                    {t("createdDate", { date: new Date(campaign.created_at).toLocaleDateString() })}
                  </p>
                  {campaign.target_filter?.schedule_type && campaign.target_filter.schedule_type !== "manual" && (
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {campaign.target_filter.schedule_type === "once" || campaign.target_filter.schedule_type === "recurring"
                        ? campaign.target_filter.schedule
                          ? t("scheduledAt", { date: new Date(campaign.target_filter.schedule).toLocaleString() })
                          : t("scheduleDisplay", { type: t.has(`scheduleTypes.${campaign.target_filter.schedule_type}`) ? t(`scheduleTypes.${campaign.target_filter.schedule_type}` as never) : campaign.target_filter.schedule_type })
                        : t("triggerDisplay", { type: campaign.target_filter.schedule_type })}
                    </p>
                  )}
                  {Array.isArray(campaign.target_filter?.sequence) && campaign.target_filter.sequence.length > 0 && (
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {t("sequenceDisplay", { steps: campaign.target_filter.sequence.map((s: { type: string; wait_days?: number }) => s.type === "wait" ? t("waitStep", { days: s.wait_days ?? 1 }) : (t.has(`touchpointTypes.${s.type}`) ? t(`touchpointTypes.${s.type}` as never) : s.type)).join(" → ") })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <div
            id="create-campaign"
            className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 h-fit scroll-mt-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {editingId ? t("form.titleEdit") : t("form.titleCreate")}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t("form.subtitle")}
                </p>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setCampaignType("followup");
                    setForm({
                      name: "",
                      type: "lead_followup",
                      audience: t("defaults.audience"),
                      template: t("defaults.template"),
                      schedule: "",
                      scheduleType: "manual",
                      audienceStatuses: [],
                      audienceSource: "",
                      audienceMinScore: "",
                      audienceNotContactedDays: "",
                      sequence: [{ type: "call" }, { type: "wait", wait_days: 1 }, { type: "sms" }],
                    });
                  }}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  {t("form.cancelEdit")}
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-4">
              <div className="mb-4">
                <label className="text-xs text-[var(--text-tertiary)] mb-2 block">{t("form.campaignTypeLabel")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "followup", labelKey: "form.quickTypes.followup.label", descKey: "form.quickTypes.followup.desc" },
                    { id: "reactivation", labelKey: "form.quickTypes.reactivation.label", descKey: "form.quickTypes.reactivation.desc" },
                    { id: "reminder", labelKey: "form.quickTypes.reminder.label", descKey: "form.quickTypes.reminder.desc" },
                    { id: "qualification", labelKey: "form.quickTypes.qualification.label", descKey: "form.quickTypes.qualification.desc" },
                  ].map((typeOption) => {
                    const typeId = typeOption.id === "followup" ? "lead_followup" : typeOption.id === "reminder" ? "appointment_reminder" : typeOption.id === "qualification" ? "lead_followup" : typeOption.id;
                    const selected = campaignType === typeOption.id;
                    return (
                      <button
                        key={typeOption.id}
                        type="button"
                        onClick={() => {
                          setCampaignType(typeOption.id);
                          setForm((prev) => ({
                            ...prev,
                            type: typeId,
                            name: prev.name.trim() ? prev.name : t(typeOption.labelKey),
                            audience: typeOption.id === "followup" ? t("defaults.followupAudience") : typeOption.id === "reactivation" ? t("defaults.reactivationAudience") : typeOption.id === "reminder" ? t("defaults.reminderAudience") : t("defaults.qualifyAudience"),
                            template: typeOption.id === "followup" ? t("defaults.followupTemplate") : typeOption.id === "reactivation" ? t("defaults.reactivationTemplate") : typeOption.id === "reminder" ? t("defaults.reminderTemplate") : t("defaults.qualifyTemplate"),
                          }));
                        }}
                        className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                          selected ? "border-[var(--border-default)]/50 bg-[var(--bg-inset)]/50" : "border-[var(--border-default)] hover:bg-[var(--bg-inset)]"
                        }`}
                      >
                        <p className="font-medium text-[var(--text-primary)]">{t(typeOption.labelKey)}</p>
                        <p className="text-[var(--text-tertiary)] mt-0.5">{t(typeOption.descKey)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                  {t("form.campaignNameLabel")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                  {t("form.typeLabel")}
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("form.audienceLabel")}</label>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
                  placeholder={t("form.audiencePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("form.leadStatusOptionalLabel")}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LEAD_STATUS_OPTIONS.map((status) => {
                    const checked = form.audienceStatuses.includes(status);
                    return (
                      <label key={status} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setForm((prev) => ({
                              ...prev,
                              audienceStatuses: checked
                                ? prev.audienceStatuses.filter((s) => s !== status)
                                : [...prev.audienceStatuses, status],
                            }));
                          }}
                          className="rounded border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                        />
                        {t(`leadStatuses.${LEAD_STATUS_KEY[status as (typeof LEAD_STATUS_OPTIONS)[number]] ?? status}`)}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">{t("form.leaveEmptyForAllStatuses")}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                  {t("form.sourceLabel")}
                </label>
                <select
                  value={form.audienceSource}
                  onChange={(e) => setForm((prev) => ({ ...prev, audienceSource: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.id || "any"} value={opt.id}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("minScore")}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.audienceMinScore === "" ? "" : form.audienceMinScore}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, audienceMinScore: v === "" ? "" : Number(v) }));
                    }}
                    placeholder={t("filterAny")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("notContactedInDays")}</label>
                  <input
                    type="number"
                    min={1}
                    value={form.audienceNotContactedDays === "" ? "" : form.audienceNotContactedDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, audienceNotContactedDays: v === "" ? "" : Number(v) }));
                    }}
                    placeholder={t("filterAny")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("messageTemplate")}</label>
                <textarea
                  rows={4}
                  value={form.template}
                  onChange={(e) => setForm((prev) => ({ ...prev, template: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("scheduleTypeLabel")}</label>
                <select
                  value={form.scheduleType}
                  onChange={(e) => setForm((prev) => ({ ...prev, scheduleType: e.target.value as typeof form.scheduleType }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                >
                  <option value="manual">{t("scheduleTypes.manual")}</option>
                  <option value="once">{t("scheduleTypes.once")}</option>
                  <option value="recurring">{t("scheduleTypes.recurring")}</option>
                  <option value="trigger">{t("scheduleTypes.trigger")}</option>
                </select>
              </div>
              {(form.scheduleType === "once" || form.scheduleType === "recurring") && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                    {form.scheduleType === "once" ? t("scheduleLabel.once") : t("scheduleLabel.recurring")}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.schedule}
                    onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("sequenceLabel")}</label>
                <p className="text-[11px] text-[var(--text-secondary)] mb-2">{t("sequenceHint")}</p>
                <div className="space-y-2">
                  {form.sequence.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--text-secondary)] w-6">{idx + 1}.</span>
                      <select
                        value={step.type}
                        onChange={(e) => {
                          const type = e.target.value as TouchpointType;
                          setForm((prev) => ({
                            ...prev,
                            sequence: prev.sequence.map((s, i) =>
                              i === idx ? { ...s, type, wait_days: type === "wait" ? (s.wait_days ?? 1) : undefined } : s,
                            ),
                          }));
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                      >
                        <option value="call">{t("touchpointTypes.call")}</option>
                        <option value="sms">{t("touchpointTypes.sms")}</option>
                        <option value="email">{t("touchpointTypes.email")}</option>
                        <option value="wait">{t("touchpointTypes.wait")}</option>
                      </select>
                      {step.type === "wait" && (
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={step.wait_days ?? 1}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              sequence: prev.sequence.map((s, i) =>
                                i === idx ? { ...s, wait_days: Math.max(1, Number(e.target.value) || 1) } : s,
                              ),
                            }))
                          }
                          className="w-16 px-2 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                        />
                      )}
                      {step.type === "wait" && <span className="text-[11px] text-[var(--text-secondary)]">{t("daysLabel")}</span>}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            sequence: prev.sequence.filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs"
                        aria-label={t("removeStep")}
                      >
                        {t("removeStep")}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        sequence: [...prev.sequence, { type: "call" }],
                      }))
                    }
                    className="mt-1 px-3 py-2 rounded-xl border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs"
                  >
                    {t("addStep")}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { void createCampaign(); }}
                disabled={saving || !form.name.trim()}
                className="w-full px-4 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {saving
                  ? editingId
                    ? t("saving")
                    : t("creating")
                  : editingId
                    ? t("saveChanges")
                    : t("createCampaign")}
              </button>
            </div>
          </div>
        </div>

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
        {toast && (
          <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-primary)] shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "emerald" | "cyan" | "amber";
}) {
  const border =
    color === "blue"
      ? "border-blue-500/30"
      : color === "emerald"
        ? "border-emerald-500/30"
        : color === "cyan"
          ? "border-cyan-500/30"
          : "border-amber-500/30";
  const text =
    color === "blue"
      ? "text-blue-400"
      : color === "emerald"
        ? "text-emerald-400"
        : color === "cyan"
          ? "text-cyan-400"
          : "text-amber-400";
  return (
    <div className={`rounded-xl border bg-[var(--bg-surface)] p-4 ${border}`}>
      <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-xl font-bold ${text}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
      <p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
