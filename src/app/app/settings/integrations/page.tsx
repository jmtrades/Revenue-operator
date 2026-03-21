"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useSearchParams } from "next/navigation";
import { Phone, MessageCircle, Cloud, Building2, Database, TrendingUp, Layers, Users, Building, RefreshCw, AlertCircle } from "lucide-react";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";
import type { CrmProviderId, CrmStatusResponse } from "@/app/api/integrations/crm/status/route";

function getCrmIntegrations(t: ReturnType<typeof useTranslations>): Array<{
  id: CrmProviderId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}> {
  return [
    { id: "salesforce", name: "Salesforce", description: t("card.salesforce.body"), icon: Cloud },
    { id: "hubspot", name: "HubSpot", description: t("card.hubspot.body"), icon: Building2 },
    { id: "zoho_crm", name: "Zoho CRM", description: t("card.zoho.body"), icon: Database },
    { id: "pipedrive", name: "Pipedrive", description: t("card.pipedrive.body"), icon: TrendingUp },
    { id: "gohighlevel", name: "GoHighLevel", description: t("card.gohighlevel.body"), icon: Layers },
    { id: "google_contacts", name: "Google Contacts", description: t("card.googleContacts.body"), icon: Users },
    { id: "microsoft_365", name: "Microsoft 365", description: t("card.microsoft365.body"), icon: Building },
  ];
}

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
  const t = useTranslations("integrations");
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
    document.title = t("pageTitle");
  }, [t]);

  useEffect(() => {
    if (crmParam === "oauth_coming_soon") {
      setToast(t("toast.oauthComingSoon"));
      const id = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(id);
    }
    if (crmParam === "invalid") {
      setToast(t("toast.invalidIntegration"));
      const id = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(id);
    }
  }, [crmParam, t]);

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
    const msg = calendar === "connected" ? t("toast.calendarConnected") : calendar === "error" ? t("toast.calendarError") : calendar === "config" ? t("toast.calendarNotConfigured") : null;
    if (msg) {
      const connected = calendar === "connected";
      setToast(msg);
      setGoogleCalendarConnected(connected);
      const timeoutId = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timeoutId);
    }
    const timeoutId = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeoutId);
  }, [searchParams, t]);

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
      setToast(t("toast.webhookSaved"));
      setWebhookSecret("");
    } catch {
      setToast(t("toast.webhookSaveFailed"));
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
        setToast(data?.error ?? t("toast.webhookTestFailed"));
        return;
      }
      setToast(data?.ok ? t("toast.webhookTestDelivered", { status: String(data?.status ?? 200) }) : t("toast.webhookTestError", { status: data?.status ? String(data.status) : "an error" }));
    } catch {
      setToast(t("toast.webhookTestFailed"));
    } finally {
      setTestingWebhook(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const _handleWhatsAppNotify = async () => {
    const email = whatsappEmail.trim();
    if (!email) {
      setToast(t("toast.whatsappEmailRequired"));
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
        setToast(t("toast.whatsappWaitlisted"));
        setWhatsappEmail("");
      } else {
        setToast(t("toast.error"));
      }
    } catch {
      setToast(t("toast.error"));
    } finally {
      setWhatsappSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: t("hub.breadcrumbSettings"), href: "/app/settings" }, { label: t("hub.title") }]} />
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">{t("hub.title")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{t("hub.subtitle")}</p>

      <div className="space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">{t("hub.channelsHeading")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-[var(--text-tertiary)]" aria-hidden />
                <p className="text-sm font-medium text-[var(--text-primary)]">{t("hub.phoneLabel")}</p>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">{t("hub.phoneDesc")}</p>
              <Link href="/app/settings/phone" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded">
                {t("hub.manageLink")}
              </Link>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-[var(--accent-green)]" aria-hidden />
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t("hub.whatsappLabel")}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-amber-500/40 text-amber-400 shrink-0">
                  {t("comingSoon")}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                WhatsApp integration support is coming soon. Stay tuned!
              </p>
            </div>
          </div>
        </section>

        {/* CRM Integration Hub */}
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">{t("hub.crmHeading")}</h2>
          <div className="mb-3 px-4 py-3 rounded-xl border text-xs" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--bg-card)" }}>
            {t("hub.crmDescription")}
          </div>
          <div className="mb-4 p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden />
              <span>
                {t("hub.lastSyncLabel")} {crmStatus?.global.lastSyncAt
                  ? new Date(crmStatus.global.lastSyncAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>{t("hub.recordsSyncedLabel")} {crmStatus?.global.recordsSynced ?? 0}</span>
            </div>
            {(crmStatus?.global.errors ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <AlertCircle className="w-4 h-4" aria-hidden />
                <span>{crmStatus?.global.errors ?? 0} {(crmStatus?.global.errors ?? 0) !== 1 ? t("hub.syncErrors") : t("hub.syncError")}</span>
              </div>
            )}
            <Link
              href="/app/settings/integrations/sync-log"
              className="text-xs font-medium text-[var(--accent-primary)] hover:underline ml-auto"
            >
              {t("hub.viewSyncLog")}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {getCrmIntegrations(t).map((crm) => {
              const status = crmStatus?.integrations[crm.id];
              const connected = status?.connected ?? false;
              const Icon = crm.icon;
              return (
                <div
                  key={crm.id}
                  className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 flex flex-col ${
                    crm.comingSoon ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[var(--text-tertiary)]" aria-hidden />
                    </div>
                    {crm.comingSoon ? (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-amber-500/40 text-amber-400 shrink-0">
                        {t("comingSoon")}
                      </span>
                    ) : connected ? (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-green-500/30 text-green-400 shrink-0">
                        {t("status.connected")}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] shrink-0">
                        {t("status.disconnected")}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">{t(`card.${crm.id === "zoho_crm" ? "zoho" : crm.id === "google_contacts" ? "googleContacts" : crm.id === "microsoft_365" ? "microsoft365" : crm.id}.title`)}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 flex-1">{t(`card.${crm.id === "zoho_crm" ? "zoho" : crm.id === "google_contacts" ? "googleContacts" : crm.id === "microsoft_365" ? "microsoft365" : crm.id}.body`)}</p>
                  {connected && status?.lastSyncAt && (
                    <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                      {t("hub.lastSyncLabel")} {new Date(status.lastSyncAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                  <div className="mt-4">
                    {crm.comingSoon ? (
                      <button
                        type="button"
                        disabled
                        className="inline-block px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] cursor-not-allowed"
                      >
                        {t("comingSoon")}
                      </button>
                    ) : connected ? (
                      <Link
                        href={`/app/settings/integrations/mapping?provider=${crm.id}`}
                        className="inline-block px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
                      >
                        {t("button.configure")}
                      </Link>
                    ) : (
                      <a
                        href={`/api/integrations/crm/${crm.id}/connect`}
                        className="inline-block px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition-colors"
                      >
                        {t("button.connect")}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 mb-4">
            <p className="text-sm font-medium text-[var(--text-primary)]">{t("hub.webhookHeading")}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t("hub.webhookDesc")}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">{t("hub.calendarHeading")}</h2>
          <div className="space-y-3">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t("hub.googleCalendarLabel")}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{t("hub.calendarDesc")}</p>
                </div>
                {googleCalendarConnected ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-green-500/30 text-green-400">
                    {t("status.connected")}
                  </span>
                ) : (
                  <Link href="/api/integrations/google-calendar/auth" className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] shrink-0 transition-colors">
                    {t("button.connect")}
                  </Link>
                )}
              </div>
              {googleCalendarConnected && availabilityPreview.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-medium text-[var(--text-tertiary)] mb-2">{t("hub.todaysSlots")}</p>
                  <div className="flex flex-wrap gap-2">
                    {availabilityPreview.map((slot) => (
                      <span key={slot} className="rounded-full border border-[var(--border-medium)] px-3 py-1 text-[11px] text-[var(--text-secondary)]">
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Outlook Calendar</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{t("hub.calendarDesc")}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-amber-500/40 text-amber-400 shrink-0">
                  {t("comingSoon")}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="webhook-config">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t("hub.automationHeading")}</h2>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)]/50 p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">{t("hub.webhookDestinationTitle")}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t("hub.webhookDestinationDesc")}
          </p>
          <input
            type="url"
            value={webhookConfig.endpoint_url}
            onChange={(e) => setWebhookConfig((prev) => ({ ...prev, endpoint_url: e.target.value, enabled: true }))}
            placeholder={t("hub.webhookUrlPlaceholder")}
            className="mt-4 w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
          />
          <div className="mt-3">
            <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1">{t("hub.signingSecretLabel")}</label>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={webhookConfig.has_secret ? t("hub.signingSecretPlaceholderSaved") : t("hub.signingSecretPlaceholderNew")}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
            />
            {webhookConfig.has_secret ? (
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{t("hub.signingSecretStored")}</p>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_lead_qualified}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_lead_qualified: e.target.checked }))}
              />
              {t("hub.eventLeadCaptured")}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_call_booked}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_call_booked: e.target.checked }))}
              />
              {t("hub.eventAppointmentBooked")}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_deal_at_risk}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_deal_at_risk: e.target.checked }))}
              />
              {t("hub.eventDealAtRisk")}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfig.event_lead_reactivated}
                onChange={(e) => setWebhookConfig((prev) => ({ ...prev, event_lead_reactivated: e.target.checked }))}
              />
              {t("hub.eventReactivatedLead")}
            </label>
          </div>
          <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-3">
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">{t("hub.eventsYouCanSend")}</p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {t("hub.eventsList")}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-[var(--text-tertiary)]">{t("hub.retryAttempts")}</p>
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
                className="mt-1 w-24 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testingWebhook || !workspaceId || !webhookConfig.endpoint_url.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] disabled:opacity-60"
              >
                {testingWebhook ? t("hub.testing") : t("hub.sendTest")}
              </button>
              <button
                type="button"
                onClick={handleSaveWebhook}
                disabled={savingWebhook || !workspaceId}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-60"
              >
                {savingWebhook ? t("hub.saving") : t("hub.saveWebhook")}
              </button>
            </div>
          </div>
          </div>
        </section>

        {/* Other CRMs — webhook-based integration guidance */}
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">{t("hub.otherCrmsHeading")}</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 space-y-3">
            <p className="text-sm text-[var(--text-primary)] font-medium">{t("hub.otherCrmsTitle")}</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t("hub.otherCrmsDesc")}
            </p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t("hub.otherCrmsZapier")}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {t("hub.needHelp")} <a href="mailto:support@recall-touch.com" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline underline-offset-2">{t("hub.contactSupport")}</a>
            </p>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-[var(--text-primary)]">{toast}</div>
      )}

      <p className="text-xs text-[var(--text-secondary)] mt-6">
        Need help with integrations? <a href="mailto:support@recall-touch.com" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline underline-offset-2">support@recall-touch.com</a>
      </p>
      <p className="mt-4"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{t("hub.backToSettings")}</Link></p>
    </div>
  );
}
