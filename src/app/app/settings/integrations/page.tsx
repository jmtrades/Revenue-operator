"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useSearchParams } from "next/navigation";
import { Phone, MessageCircle, Cloud, Building2, Database, TrendingUp, Layers, Users, Building, RefreshCw, AlertCircle } from "lucide-react";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";
import type { CrmProviderId, CrmStatusResponse } from "@/app/api/integrations/crm/status/route";

const CRM_INTEGRATIONS: Array<{
  id: CrmProviderId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "salesforce", name: "Salesforce", description: "Sync contacts and deals with Salesforce", icon: Cloud },
  { id: "hubspot", name: "HubSpot", description: "Send leads and appointments to HubSpot", icon: Building2 },
  { id: "google_contacts", name: "Google Contacts", description: "Sync contacts so your AI knows who's calling", icon: Users },
  { id: "microsoft_365", name: "Microsoft 365", description: "Connect Outlook contacts and calendars", icon: Building },
];

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
  const [whatsappEmail, setWhatsappEmail] = useState("");
  const [_whatsappSubmitting, setWhatsappSubmitting] = useState(false);
  const [crmStatus, setCrmStatus] = useState<CrmStatusResponse | null>(null);
  const searchParams = useSearchParams();
  const calendarParam = searchParams.get("calendar");
  const crmParam = searchParams.get("crm");

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
    fetch("/api/integrations/crm/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CrmStatusResponse | null) => data && setCrmStatus(data))
      .catch(() => setCrmStatus(null));
  }, []);

  useEffect(() => {
    if (crmParam === "oauth_coming_soon") {
      setToast("OAuth for this CRM will be available soon. Use the webhook below to send events in the meantime.");
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (crmParam === "invalid") {
      setToast("Invalid integration.");
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [crmParam]);

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

  const _handleWhatsAppNotify = async () => {
    const email = whatsappEmail.trim();
    if (!email) {
      setToast("Enter your email to join the WhatsApp waitlist.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setWhatsappSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setToast("You're on the list. We'll notify you when WhatsApp is available.");
        setWhatsappEmail("");
      } else {
        setToast("Something went wrong. Try again.");
      }
    } catch {
      setToast("Something went wrong. Try again.");
    } finally {
      setWhatsappSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: "Settings", href: "/app/settings" }, { label: "Integrations" }]} />
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Integrations</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">Connect your tools: channels, CRM, calendar, and automation.</p>

      <div className="space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Channels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-zinc-400" aria-hidden />
                <p className="text-sm font-medium text-[var(--text-primary)]">Phone</p>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">AI phone number for calls</p>
              <Link href="/app/settings/phone" className="text-sm text-zinc-300 hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded">
                Manage →
              </Link>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 opacity-70">
              <div className="flex items-center gap-3 mb-2">
                <MessageCircle className="w-5 h-5 text-[var(--accent-green)]" aria-hidden />
                <p className="text-sm font-medium text-[var(--text-primary)]">WhatsApp</p>
              </div>
              <p className="text-sm text-[#8B8B8D]">
                WhatsApp integration coming soon. You&apos;ll be notified when it&apos;s available.
              </p>
            </div>
          </div>
        </section>

        {/* CRM Integration Hub */}
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">CRM & contacts</h2>
          <div className="mb-4 p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <RefreshCw className="w-4 h-4 text-zinc-500" aria-hidden />
              <span>
                Last sync: {crmStatus?.global.lastSyncAt
                  ? new Date(crmStatus.global.lastSyncAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>Records synced: {crmStatus?.global.recordsSynced ?? 0}</span>
            </div>
            {(crmStatus?.global.errors ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <AlertCircle className="w-4 h-4" aria-hidden />
                <span>{crmStatus?.global.errors ?? 0} sync error{(crmStatus?.global.errors ?? 0) !== 1 ? "s" : ""}</span>
              </div>
            )}
            <Link
              href="/app/settings/integrations/sync-log"
              className="text-xs font-medium text-[var(--accent-primary)] hover:underline ml-auto"
            >
              View sync log →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {CRM_INTEGRATIONS.map((crm) => {
              const status = crmStatus?.integrations[crm.id];
              const connected = status?.connected ?? false;
              const Icon = crm.icon;
              return (
                <div
                  key={crm.id}
                  className="bg-[#111113] border border-white/[0.06] rounded-2xl p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-zinc-400" aria-hidden />
                    </div>
                    {connected ? (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-green-500/30 text-green-400 shrink-0">
                        Connected
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/[0.08] text-zinc-500 shrink-0">
                        Not connected
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-[#EDEDEF]">{crm.name}</h4>
                  <p className="text-xs text-[#5A5A5C] mt-1 flex-1">{crm.description}</p>
                  {connected && status?.lastSyncAt && (
                    <p className="text-[11px] text-zinc-500 mt-2">
                      Last sync: {new Date(status.lastSyncAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                  <div className="mt-4">
                    {connected ? (
                      <Link
                        href={`/app/settings/integrations/mapping?provider=${crm.id}`}
                        className="inline-block px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-zinc-300 hover:border-zinc-500 transition-colors"
                      >
                        Configure
                      </Link>
                    ) : (
                      <a
                        href={`/api/integrations/crm/${crm.id}/connect`}
                        className="inline-block px-3 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-100 transition-colors"
                      >
                        Connect
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 mb-4">
            <p className="text-sm font-medium text-[var(--text-primary)]">Send leads to any CRM</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Use the webhook below to send lead and appointment events to HubSpot, Salesforce, Zapier, or any tool that accepts webhooks.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Calendar</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
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
              <Link href="/api/integrations/google-calendar/auth" className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-zinc-300 hover:border-zinc-500 shrink-0 transition-colors">
                Connect
              </Link>
            )}
          </div>
          {googleCalendarConnected && availabilityPreview.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-medium text-zinc-400 mb-2">Today&apos;s first open slots</p>
              <div className="flex flex-wrap gap-2">
                {availabilityPreview.map((slot) => (
                  <span key={slot} className="rounded-full border border-[var(--border-medium)] px-3 py-1 text-[11px] text-zinc-300">
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          )}
          </div>
        </section>

        <section id="webhook-config">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Automation & webhooks</h2>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)]/50 p-4">
          <p className="text-sm font-medium text-white">Slack / Zapier webhook destination</p>
          <p className="text-xs text-zinc-500 mt-1">
            Paste a Slack incoming webhook or Zapier catch hook URL. We&apos;ll send operator-safe events only.
          </p>
          <input
            type="url"
            value={webhookConfig.endpoint_url}
            onChange={(e) => setWebhookConfig((prev) => ({ ...prev, endpoint_url: e.target.value, enabled: true }))}
            placeholder="https://hooks.slack.com/... or https://hooks.zapier.com/..."
            className="mt-4 w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          />
          <div className="mt-3">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Signing secret (optional)</label>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={webhookConfig.has_secret ? "Secret saved. Enter a new value to rotate it." : "Add a secret to sign deliveries"}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
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
          <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-black/20 p-3">
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
                className="mt-1 w-24 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testingWebhook || !workspaceId || !webhookConfig.endpoint_url.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-zinc-300 hover:border-zinc-500 disabled:opacity-60"
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
        </section>

        {/* CRM webhook usage is already explained above the cards; duplicate CRM section removed */}
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
