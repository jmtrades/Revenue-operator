"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type TargetFilter = {
  audience?: string;
  message_template?: string;
  schedule?: string | null;
  audience_statuses?: string[];
  audience_source?: string;
  audience_min_score?: number | null;
  audience_not_contacted_days?: number | null;
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

const PAGE_TITLE = "Outbound runs — Recall Touch";

const TYPE_OPTIONS = [
  { id: "lead_followup", label: "Lead qualification / follow-up" },
  { id: "appointment_reminder", label: "Appointment setting / reminder" },
  { id: "reactivation", label: "Reactivation" },
  { id: "cold_outreach", label: "Announcement / cold outreach" },
  { id: "review_request", label: "Review request" },
  { id: "custom", label: "Custom" },
];

const LEAD_STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
];

const SOURCE_OPTIONS = [
  { id: "", label: "Any source" },
  { id: "inbound_call", label: "Inbound Call" },
  { id: "outbound", label: "Outbound Outreach" },
  { id: "website", label: "Website" },
  { id: "referral", label: "Referral" },
];

const CAMPAIGNS_SNAPSHOT_PREFIX = "rt_campaigns_snapshot:";

function readCampaignsSnapshot(workspaceId: string): CampaignRow[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = window.localStorage.getItem(`${CAMPAIGNS_SNAPSHOT_PREFIX}${workspaceId}`);
    const parsed = raw ? (JSON.parse(raw) as CampaignRow[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCampaignsSnapshot(workspaceId: string, campaigns: CampaignRow[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(
      `${CAMPAIGNS_SNAPSHOT_PREFIX}${workspaceId}`,
      JSON.stringify(campaigns),
    );
  } catch {
    // ignore persistence errors
  }
}

export default function CampaignsPage() {
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
  const [form, setForm] = useState({
    name: "",
    type: "lead_followup",
    audience: "Leads waiting on follow-up",
    template: "Just checking in after your last conversation. Reply here if you want to continue.",
    schedule: "",
    audienceStatuses: [] as string[],
    audienceSource: "",
    audienceMinScore: "" as number | "",
    audienceNotContactedDays: "" as number | "",
  });

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => {
      document.title = "";
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : { campaigns: [] }))
      .then((data: { campaigns?: CampaignRow[] }) => {
        const next = data.campaigns ?? [];
        setCampaigns(next);
        persistCampaignsSnapshot(workspaceId, next);
      })
      .finally(() => setLoading(false));
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
              ? "Could not update run"
              : "Could not create run";
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
        audience: "Leads waiting on follow-up",
        template: "Just checking in after your last conversation. Reply here if you want to continue.",
        schedule: "",
        audienceStatuses: [],
        audienceSource: "",
        audienceMinScore: "",
        audienceNotContactedDays: "",
      });
      setToast(editingId ? "Run updated." : "Run created.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : editingId ? "Could not update run." : "Could not create run.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (run: CampaignRow) => {
    const nextStatus = run.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/campaigns/${run.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      setToast("Could not update run.");
      return;
    }
    setCampaigns((prev) =>
      prev.map((item) => (item.id === run.id ? { ...item, status: nextStatus } : item)),
    );
    setToast(nextStatus === "active" ? "Run resumed." : "Run paused.");
  };

  const loadCampaignIntoForm = (run: CampaignRow) => {
    setEditingId(run.id);
    const tf = run.target_filter;
    setForm({
      name: run.name,
      type: run.type,
      audience: tf?.audience ?? "",
      template: tf?.message_template ?? "",
      schedule: tf?.schedule ?? "",
      audienceStatuses: Array.isArray(tf?.audience_statuses) ? tf.audience_statuses : [],
      audienceSource: tf?.audience_source ?? "",
      audienceMinScore: typeof tf?.audience_min_score === "number" ? tf.audience_min_score : "",
      audienceNotContactedDays: typeof tf?.audience_not_contacted_days === "number" ? tf.audience_not_contacted_days : "",
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">Outbound runs</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Outcome-tied outbound runs for follow-up, reminders, recovery, and reactivation.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-300 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total runs" value={campaigns.length} color="blue" />
          <StatCard label="Active" value={campaigns.filter((c) => c.status === "active").length} color="emerald" />
          <StatCard label="Calls made" value={campaigns.reduce((sum, c) => sum + c.called, 0)} color="cyan" />
          <StatCard label="Appointments" value={campaigns.reduce((sum, c) => sum + c.appointments_booked, 0)} color="amber" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-zinc-500">
                Loading runs…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center">
                <p className="text-sm font-medium text-white">No runs yet</p>
                <p className="text-xs text-zinc-500 mt-2">
                  Start with a lead follow-up, appointment reminder, or reactivation run.
                </p>
                <a
                  href="#create-run"
                  className="mt-4 inline-block min-h-[44px] rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-100 touch-manipulation"
                >
                  Create your first run
                </a>
              </div>
            ) : (
              filtered.map((run) => (
                <div key={run.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{run.name}</p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {run.target_filter?.audience ?? "Outcome-based audience"}
                        {(() => {
                          const tf = run.target_filter;
                          const parts: string[] = [];
                          if (Array.isArray(tf?.audience_statuses) && tf.audience_statuses.length > 0) {
                            parts.push(tf.audience_statuses.join(", "));
                          }
                          if (tf?.audience_source) {
                            const src = SOURCE_OPTIONS.find((o) => o.id === tf.audience_source);
                            if (src) parts.push(src.label);
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
                          {run.type.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full border border-[var(--border-medium)] px-2.5 py-1 text-[11px] text-zinc-300">
                          {run.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadCampaignIntoForm(run)}
                        className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-zinc-300 hover:border-[var(--border-medium)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          run.status === "active"
                            ? setPauseConfirm(run)
                            : void toggleCampaign(run)
                        }
                        className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-zinc-300 hover:border-[var(--border-medium)]"
                      >
                        {run.status === "active" ? "Pause" : "Resume"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric label="Contacts" value={run.total_contacts} />
                    <Metric label="Called" value={run.called} />
                    <Metric label="Answered" value={run.answered} />
                    <Metric label="Appointments" value={run.appointments_booked} />
                  </div>
                  {run.total_contacts > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                        <span>Progress</span>
                        <span>
                          {run.called}/{run.total_contacts} called
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((run.called / run.total_contacts) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-zinc-500">
                    Created {new Date(run.created_at).toLocaleDateString()}
                  </p>
                  {run.target_filter?.schedule ? (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Scheduled {new Date(run.target_filter.schedule).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div id="create-run" className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 h-fit scroll-mt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{editingId ? "Edit run" : "Create run"}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Keep it tied to real outcomes: follow-up, reminders, recovery, or reactivation.
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
                      audience: "Leads waiting on follow-up",
                      template: "Just checking in after your last conversation. Reply here if you want to continue.",
                      schedule: "",
                      audienceStatuses: [],
                      audienceSource: "",
                      audienceMinScore: "",
                      audienceNotContactedDays: "",
                    });
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-4">
              <div className="mb-4">
                <label className="text-xs text-white/40 mb-2 block">Run type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "followup", label: "Lead follow-up", desc: "Call leads who showed interest" },
                    { id: "reactivation", label: "Reactivation", desc: "Re-engage cold leads" },
                    { id: "reminder", label: "Appointment reminder", desc: "Confirm upcoming appointments" },
                    { id: "qualification", label: "Qualification", desc: "Qualify new leads by phone" },
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
                            name: prev.name.trim() ? prev.name : typeOption.label,
                            audience: typeOption.id === "followup" ? "Leads waiting on follow-up" : typeOption.id === "reactivation" ? "Cold or stale leads" : typeOption.id === "reminder" ? "Leads with upcoming appointments" : "New leads to qualify",
                            template: typeOption.id === "followup" ? "Just checking in after your last conversation. Reply here if you want to continue." : typeOption.id === "reactivation" ? "We haven't heard from you in a while. Got a quick moment to see if we can help?" : typeOption.id === "reminder" ? "Reminder: you have an appointment coming up. Reply to confirm or reschedule." : "Hi, we're following up on your interest. A few quick questions when you have a moment.",
                          }));
                        }}
                        className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                          selected ? "border-zinc-500/50 bg-zinc-800/50" : "border-white/[0.08] hover:bg-white/[0.04]"
                        }`}
                      >
                        <p className="font-medium text-white">{typeOption.label}</p>
                        <p className="text-white/40 mt-0.5">{typeOption.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Run name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Missed-call recovery"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Audience label</label>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
                  placeholder="e.g. Leads waiting on follow-up"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Lead status (optional)</label>
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
                        {status}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">Leave empty for all statuses</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Source</label>
                <select
                  value={form.audienceSource}
                  onChange={(e) => setForm((prev) => ({ ...prev, audienceSource: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.id || "any"} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Min score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.audienceMinScore === "" ? "" : form.audienceMinScore}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, audienceMinScore: v === "" ? "" : Number(v) }));
                    }}
                    placeholder="Any"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Not contacted in (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.audienceNotContactedDays === "" ? "" : form.audienceNotContactedDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, audienceNotContactedDays: v === "" ? "" : Number(v) }));
                    }}
                    placeholder="Any"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Message template</label>
                <textarea
                  rows={4}
                  value={form.template}
                  onChange={(e) => setForm((prev) => ({ ...prev, template: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={form.schedule}
                  onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => { void createCampaign(); }}
                disabled={saving || !form.name.trim()}
                className="w-full px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60"
              >
                {saving ? (editingId ? "Saving…" : "Creating…") : editingId ? "Save changes" : "Create run"}
              </button>
            </div>
          </div>
        </div>

        {pauseConfirm && (
          <ConfirmDialog
            open
            title="Pause this run?"
            message={`Pause "${pauseConfirm.name}"? You can resume it later from this page.`}
            confirmLabel="Pause"
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
