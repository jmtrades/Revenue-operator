"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

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
};

const PAGE_TITLE = "Campaigns — Recall Touch";

const TYPE_OPTIONS = [
  { id: "lead_followup", label: "Lead follow-up" },
  { id: "appointment_reminder", label: "Appointment reminder" },
  { id: "reactivation", label: "Reactivation" },
  { id: "custom", label: "Custom recovery" },
];

export default function CampaignsPage() {
  const { workspaceId } = useWorkspace();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignRow["status"]>("all");
  const [form, setForm] = useState({
    name: "",
    type: "lead_followup",
    audience: "Leads waiting on follow-up",
    template: "Just checking in after your last conversation. Reply here if you want to continue.",
    schedule: "",
  });

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => {
      document.title = "";
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : { campaigns: [] }))
      .then((data: { campaigns?: CampaignRow[] }) => setCampaigns(data.campaigns ?? []))
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
      const res = await fetch("/api/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          target_filter: {
            audience: form.audience,
            message_template: form.template,
            schedule: form.schedule || null,
          },
        }),
      });
      const created = (await res.json().catch(() => null)) as CampaignRow | { error?: string } | null;
      if (!res.ok || !created || !("id" in created)) {
        const errorMessage =
          created && "error" in created && typeof created.error === "string"
            ? created.error
            : "Could not create run";
        throw new Error(errorMessage);
      }
      setCampaigns((prev) => [created, ...prev]);
      setForm({
        name: "",
        type: "lead_followup",
        audience: "Leads waiting on follow-up",
        template: "Just checking in after your last conversation. Reply here if you want to continue.",
        schedule: "",
      });
      setToast("Run created.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not create run.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign: CampaignRow) => {
    const nextStatus = campaign.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
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
      prev.map((item) => (item.id === campaign.id ? { ...item, status: nextStatus } : item)),
    );
    setToast(nextStatus === "active" ? "Run resumed." : "Run paused.");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">Outbound runs</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Reminders, follow-ups, reactivation, and recovery only.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-500">
                Loading runs…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                <p className="text-sm font-medium text-white">No runs yet</p>
                <p className="text-xs text-zinc-500 mt-2">
                  Start with a lead follow-up, appointment reminder, or reactivation run.
                </p>
              </div>
            ) : (
              filtered.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{campaign.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300">
                          {campaign.type.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300">
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { void toggleCampaign(campaign); }}
                      className="px-3 py-2 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-300 hover:border-zinc-500"
                    >
                      {campaign.status === "active" ? "Pause" : "Resume"}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric label="Contacts" value={campaign.total_contacts} />
                    <Metric label="Called" value={campaign.called} />
                    <Metric label="Answered" value={campaign.answered} />
                    <Metric label="Appointments" value={campaign.appointments_booked} />
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-500">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 h-fit">
            <p className="text-sm font-semibold text-white">Create run</p>
            <p className="text-xs text-zinc-500 mt-1">
              Keep it tied to real outcomes: follow-up, reminders, recovery, or reactivation.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Run name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Missed-call recovery"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Audience</label>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
                  placeholder="Leads who asked for pricing"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Message template</label>
                <textarea
                  rows={4}
                  value={form.template}
                  onChange={(e) => setForm((prev) => ({ ...prev, template: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={form.schedule}
                  onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => { void createCampaign(); }}
                disabled={saving || !form.name.trim()}
                className="w-full px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create run"}
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm text-zinc-100 shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
