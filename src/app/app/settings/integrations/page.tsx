"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";

type WebhookConfig = {
  endpoint_url: string;
  enabled: boolean;
  has_secret?: boolean;
  max_attempts: number;
  event_lead_qualified: boolean;
  event_call_booked: boolean;
  event_deal_at_risk: boolean;
  event_deal_won: boolean;
  event_lead_reactivated: boolean;
};

const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  endpoint_url: "",
  enabled: false,
  max_attempts: 3,
  event_lead_qualified: true,
  event_call_booked: true,
  event_deal_at_risk: false,
  event_deal_won: false,
  event_lead_reactivated: false,
};

export default function AppSettingsIntegrationsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [availabilityPreview, setAvailabilityPreview] = useState<string[]>([]);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(DEFAULT_WEBHOOK_CONFIG);
  const [webhookSecret, setWebhookSecret] = useState("");
  const searchParams = useSearchParams();
  const calendarParam = searchParams.get("calendar");

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: { id?: string | null } | null) => {
        const wid = data?.id ?? null;
        setWorkspaceId(wid);
        if (!wid) return;
        fetch(`/api/workspaces/${wid}/webhook-config`, { credentials: "include" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: Partial<WebhookConfig> | null) =>
            setWebhookConfig({ ...DEFAULT_WEBHOOK_CONFIG, ...(data ?? {}) }),
          )
          .catch(() => setWebhookConfig(DEFAULT_WEBHOOK_CONFIG));
      })
      .catch(() => setWorkspaceId(null));
  }, []);

  useEffect(() => {
    fetch("/api/integrations/google-calendar/status", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { connected?: boolean }) => setGoogleCalendarConnected(Boolean(data?.connected)))
      .catch(() => setGoogleCalendarConnected(false));
  }, [calendarParam]);

  useEffect(() => {
    if (!googleCalendarConnected || !workspaceId) return;
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/integrations/google-calendar/availability?workspace_id=${encodeURIComponent(workspaceId)}&date=${today}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { slots?: string[] } | null) => {
        setAvailabilityPreview((data?.slots ?? []).slice(0, 4));
      })
      .catch(() => setAvailabilityPreview([]));
  }, [googleCalendarConnected, workspaceId]);

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (!calendar) return;
    const msg = calendar === "connected" ? "Google Calendar connected." : calendar === "error" ? "Could not connect Google Calendar." : calendar === "config" ? "Google Calendar is not configured." : null;
    if (msg) {
      const connected = calendar === "connected";
      setToast(msg);
      setGoogleCalendarConnected(connected);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [searchParams]);

  const handleSaveWebhook = async () => {
    if (!workspaceId) return;
    setSavingWebhook(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/webhook-config`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...webhookConfig, secret: webhookSecret.trim() || undefined }),
      });
      if (!res.ok) throw new Error("save_failed");
      setToast("Webhook destination saved.");
      setWebhookSecret("");
    } catch {
      setToast("Could not save webhook settings.");
    } finally {
      setSavingWebhook(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleTestWebhook = async () => {
    if (!workspaceId) return;
    setTestingWebhook(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/webhook-config/test`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; status?: number; response?: string; error?: string } | null;
      if (!res.ok) {
        setToast(data?.error ?? "Could not send webhook test.");
        return;
      }
      setToast(data?.ok ? `Webhook test delivered (${data?.status ?? 200}).` : `Webhook responded with ${data?.status ?? "an error"}.`);
    } catch {
      setToast("Could not send webhook test.");
    } finally {
      setTestingWebhook(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Integrations</h1>
      <p className="text-sm text-zinc-500 mb-6">Connect scheduling and operator-safe outbound events.</p>

      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Google Calendar</p>
              <p className="text-xs text-zinc-500 mt-1">Let your AI check availability and book confirmed appointments.</p>
            </div>
            {googleCalendarConnected ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-green-500/30 text-green-400">
                Connected
              </span>
            ) : (
              <Link href="/api/integrations/google-calendar/auth" className="px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 shrink-0 transition-colors">
                Connect
              </Link>
            )}
          </div>
          {googleCalendarConnected && availabilityPreview.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-medium text-zinc-400 mb-2">Today&apos;s first open slots</p>
              <div className="flex flex-wrap gap-2">
                {availabilityPreview.map((slot) => (
                  <span key={slot} className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] text-zinc-300">
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-medium text-white">Slack / Zapier webhook destination</p>
          <p className="text-xs text-zinc-500 mt-1">
            Paste a Slack incoming webhook or Zapier catch hook URL. We&apos;ll send operator-safe events only.
          </p>
          <input
            type="url"
            value={webhookConfig.endpoint_url}
            onChange={(e) => setWebhookConfig((prev) => ({ ...prev, endpoint_url: e.target.value, enabled: true }))}
            placeholder="https://hooks.slack.com/... or https://hooks.zapier.com/..."
            className="mt-4 w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
          />
          <div className="mt-3">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Signing secret (optional)</label>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={webhookConfig.has_secret ? "Secret saved. Enter a new value to rotate it." : "Add a secret to sign deliveries"}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
            />
            {webhookConfig.has_secret ? (
              <p className="mt-1 text-[11px] text-zinc-500">A signing secret is already stored for this destination.</p>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_lead_qualified}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_lead_qualified: e.target.checked }))}
              />
              Lead captured
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_call_booked}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_call_booked: e.target.checked }))}
              />
              Appointment booked
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_deal_at_risk}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_deal_at_risk: e.target.checked }))}
              />
              Deal at risk
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_lead_reactivated}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_lead_reactivated: e.target.checked }))}
              />
              Reactivated lead
            </label>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 p-3">
            <p className="text-[11px] font-medium text-zinc-400">Events you can send</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Lead captured, appointment booked, deal at risk, deal won, and reactivated lead.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-zinc-400">Retry attempts</p>
              <input
                type="number"
                min={1}
                max={10}
                value={webhookConfig.max_attempts}
                onChange={(e) =>
                  setWebhookConfig((prev) => ({
                    ...prev,
                    max_attempts: Math.max(1, Math.min(10, Number(e.target.value || 3))),
                  }))
                }
                className="mt-1 w-24 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testingWebhook || !workspaceId || !webhookConfig.endpoint_url.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 disabled:opacity-60"
              >
                {testingWebhook ? "Testing…" : "Send test"}
              </button>
              <button
                type="button"
                onClick={handleSaveWebhook}
                disabled={savingWebhook || !workspaceId}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-60"
              >
                {savingWebhook ? "Saving…" : "Save webhook"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-medium text-white">Contact sync planning</p>
          <p className="text-xs text-zinc-500 mt-1">
            We&apos;re keeping CRM sync focused on safe contact import and outcome updates instead of workflow automation.
          </p>
          <Link href="/app/contacts" className="inline-block mt-3 text-xs font-medium text-white underline underline-offset-2">
            Manage contacts →
          </Link>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
