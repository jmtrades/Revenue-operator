"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">{t("heading")}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {t("description")}
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-300 text-sm"
          >
            <option value="all">{t("statusFilter.all")}</option>
            <option value="draft">{t("statusFilter.draft")}</option>
            <option value="active">{t("statusFilter.active")}</option>
            <option value="paused">{t("statusFilter.paused")}</option>
            <option value="completed">{t("statusFilter.completed")}</option>
          </select>
        </div>

        <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label={t("statTotal")} value={campaigns.length} color="blue" />
          <StatCard label={t("statActive")} value={campaigns.filter((c) => c.status === "active").length} color="emerald" />
          <StatCard label={t("statContacted")} value={campaigns.reduce((sum, c) => sum + c.called, 0)} color="cyan" />
          <StatCard label={t("statConverted")} value={campaigns.reduce((sum, c) => sum + c.appointments_booked, 0)} color="amber" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{t("estRoi")}</p>
            <p className="mt-1 text-sm font-semibold text-white">
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
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-zinc-500">
                {t("loading")}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={t("empty.title")}
                description={t("empty.description")}
                primaryAction={{ label: t("create"), href: "#create-campaign" }}
              />
            ) : (
              filtered.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{campaign.name}</p>
                      <p className="mt-2 text-xs text-zinc-500">
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
                            parts.push(`Score ≥ ${tf.audience_min_score}`);
                          }
                          if (typeof tf?.audience_not_contacted_days === "number") {
                            parts.push(`Not contacted in ${tf.audience_not_contacted_days} days`);
                          }
                          return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
                        })()}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--border-medium)] px-2.5 py-1 text-[11px] text-zinc-300">
                          {campaign.type.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full border border-[var(--border-medium)] px-2.5 py-1 text-[11px] text-zinc-300">
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadCampaignIntoForm(campaign)}
                      className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-zinc-300 hover:border-[var(--border-medium)]"
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        campaign.status === "active"
                          ? setPauseConfirm(campaign)
                          : void toggleCampaign(campaign)
                      }
                      className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs font-semibold text-zinc-100 hover:border-[var(--border-medium)]"
                    >
                      {campaign.status === "active" ? t("pause") : t("launchCampaign")}
                    </button>
                  </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric label={t("metricContacts")} value={campaign.total_contacts} />
                    <Metric label={t("metricContacted")} value={campaign.called} />
                    <Metric label={t("metricReached")} value={campaign.answered} />
                    <Metric label={t("metricConverted")} value={campaign.appointments_booked} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                    <span>{t("remaining")}: {Math.max(0, campaign.total_contacts - campaign.called)}</span>
                    <span>·</span>
                    <span>{t("failed")}: {Math.max(0, campaign.called - campaign.answered)}</span>
                  </div>
                  {campaign.total_contacts > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                        <span>{t("progress")}</span>
                        <span>
                          {campaign.called}/{campaign.total_contacts} {t("contacted")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
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
                    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{t("campaignRoi")}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Est. cost ~${(campaign.called * 0.05 + campaign.answered * 0.02).toFixed(2)} · Est. revenue ~${(campaign.appointments_booked * 250).toFixed(0)}
                      </p>
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-zinc-500">
                    {t("createdDate", { date: new Date(campaign.created_at).toLocaleDateString() })}
                  </p>
                  {campaign.target_filter?.schedule_type && campaign.target_filter.schedule_type !== "manual" && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {campaign.target_filter.schedule_type === "once" || campaign.target_filter.schedule_type === "recurring"
                        ? campaign.target_filter.schedule
                          ? `Scheduled ${new Date(campaign.target_filter.schedule).toLocaleString()}`
                          : `Schedule: ${campaign.target_filter.schedule_type}`
                        : `Trigger: ${campaign.target_filter.schedule_type}`}
                    </p>
                  )}
                  {Array.isArray(campaign.target_filter?.sequence) && campaign.target_filter.sequence.length > 0 && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Sequence: {campaign.target_filter.sequence.map((s: { type: string; wait_days?: number }) => s.type === "wait" ? `Wait ${s.wait_days ?? 1}d` : s.type).join(" → ")}
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
                <p className="text-sm font-semibold text-white">
                  {editingId ? t("form.titleEdit") : t("form.titleCreate")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
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
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  {t("form.cancelEdit")}
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-4">
              <div className="mb-4">
                <label className="text-xs text-white/40 mb-2 block">{t("form.campaignTypeLabel")}</label>
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
                          selected ? "border-zinc-500/50 bg-zinc-800/50" : "border-white/[0.08] hover:bg-white/[0.04]"
                        }`}
                      >
                        <p className="font-medium text-white">{t(typeOption.labelKey)}</p>
                        <p className="text-white/40 mt-0.5">{t(typeOption.descKey)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t("form.campaignNameLabel")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t("form.typeLabel")}
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">{t("form.audienceLabel")}</label>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
                  placeholder={t("form.audiencePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">{t("form.leadStatusOptionalLabel")}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LEAD_STATUS_OPTIONS.map((status) => {
                    const checked = form.audienceStatuses.includes(status);
                    return (
                      <label key={status} className="flex items-center gap-1.5 text-xs text-zinc-300">
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
                          className="rounded border-[var(--border-default)] bg-[var(--bg-input)] text-white"
                        />
                        {t(`leadStatuses.${LEAD_STATUS_KEY[status as (typeof LEAD_STATUS_OPTIONS)[number]] ?? status}`)}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">{t("form.leaveEmptyForAllStatuses")}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t("form.sourceLabel")}
                </label>
                <select
                  value={form.audienceSource}
                  onChange={(e) => setForm((prev) => ({ ...prev, audienceSource: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
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
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{t("minScore")}</label>
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
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{t("notContactedInDays")}</label>
                  <input
                    type="number"
                    min={1}
                    value={form.audienceNotContactedDays === "" ? "" : form.audienceNotContactedDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, audienceNotContactedDays: v === "" ? "" : Number(v) }));
                    }}
                    placeholder={t("filterAny")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">{t("messageTemplate")}</label>
                <textarea
                  rows={4}
                  value={form.template}
                  onChange={(e) => setForm((prev) => ({ ...prev, template: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">{t("scheduleTypeLabel")}</label>
                <select
                  value={form.scheduleType}
                  onChange={(e) => setForm((prev) => ({ ...prev, scheduleType: e.target.value as typeof form.scheduleType }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                >
                  <option value="manual">{t("scheduleTypes.manual")}</option>
                  <option value="once">{t("scheduleTypes.once")}</option>
                  <option value="recurring">{t("scheduleTypes.recurring")}</option>
                  <option value="trigger">{t("scheduleTypes.trigger")}</option>
                </select>
              </div>
              {(form.scheduleType === "once" || form.scheduleType === "recurring") && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {form.scheduleType === "once" ? t("scheduleLabel.once") : t("scheduleLabel.recurring")}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.schedule}
                    onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">{t("sequenceLabel")}</label>
                <p className="text-[11px] text-zinc-500 mb-2">{t("sequenceHint")}</p>
                <div className="space-y-2">
                  {form.sequence.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500 w-6">{idx + 1}.</span>
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
                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
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
                          className="w-16 px-2 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                        />
                      )}
                      {step.type === "wait" && <span className="text-[11px] text-zinc-500">{t("daysLabel")}</span>}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            sequence: prev.sequence.filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-xs"
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
                    className="mt-1 px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-xs"
                  >
                    {t("addStep")}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { void createCampaign(); }}
                disabled={saving || !form.name.trim()}
                className="w-full px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60"
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
        {toast && (
          <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-4 py-2 text-sm text-zinc-100 shadow-xl">
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
    <div className={`rounded-xl border bg-zinc-900/50 p-4 ${border}`}>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-xl font-bold ${text}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
