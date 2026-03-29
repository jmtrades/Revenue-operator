"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useSearchParams } from "next/navigation";
import { Phone, MessageCircle, Cloud, Building2, Database, TrendingUp, Layers, Users, Building, RefreshCw, AlertCircle, Loader, Download, Unplug } from "lucide-react";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";
import { IntegrationsHealthWidget } from "@/components/settings/IntegrationsHealthWidget";
import type { CrmProviderId, CrmStatusResponse } from "@/app/api/integrations/crm/status/route";
import type { SyncProgressResponse } from "@/app/api/integrations/crm/[provider]/sync-status/route";

function getCrmIntegrations(t: ReturnType<typeof useTranslations>): Array<{
  id: CrmProviderId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}> {
  return [
    { id: "hubspot", name: "HubSpot", description: t("card.hubspot.body"), icon: Building2 },
    { id: "google_contacts", name: "Google Contacts", description: t("card.googleContacts.body"), icon: Users },
    { id: "airtable", name: "Airtable", description: t("card.airtable.body"), icon: Database },
    { id: "pipedrive", name: "Pipedrive", description: t("card.pipedrive.body"), icon: TrendingUp },
    { id: "gohighlevel", name: "GoHighLevel", description: t("card.gohighlevel.body"), icon: Layers },
    { id: "salesforce", name: "Salesforce", description: t("card.salesforce.body"), icon: Cloud },
    { id: "zoho_crm", name: "Zoho CRM", description: t("card.zoho.body"), icon: Database },
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
  const [syncingProvider, setSyncingProvider] = useState<CrmProviderId | null>(null);
  const [importingProvider, setImportingProvider] = useState<CrmProviderId | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<CrmProviderId | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<CrmProviderId | null>(null);
  const [syncProgress, setSyncProgress] = useState<Partial<Record<CrmProviderId, SyncProgressResponse | null>>>({});
  const syncPollingRef = useRef<Partial<Record<CrmProviderId, NodeJS.Timeout | null>>>({});
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

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(syncPollingRef.current).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  useEffect(() => {
    if (crmParam === "oauth_pending") {
      setToast(t("toast.oauthPending", { defaultValue: "OAuth setup is processing. Please try again in a moment." }));
      const id = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(id);
    }
    if (crmParam === "invalid") {
      setToast(t("toast.invalidIntegration"));
      const id = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(id);
    }
    if (crmParam === "connected") {
      const provider = searchParams.get("provider") ?? "";
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/_/g, " ");
      setToast(t("toast.crmConnected", { provider: providerName }) + " Syncing your contacts now...");
      setSyncingProvider(provider as CrmProviderId);

      // Refresh CRM status first
      fetch("/api/integrations/crm/status", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: CrmStatusResponse | null) => {
          if (data) {
            setCrmStatus(data);
            // Trigger auto-sync after status is refreshed
            if (provider) {
              fetch(`/api/integrations/crm/${provider}/batch-sync`, {
                method: "POST",
                credentials: "include",
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});

      // Refresh status again after 3 seconds to show initial sync results
      const statusRefreshId = setTimeout(() => {
        fetch("/api/integrations/crm/status", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: CrmStatusResponse | null) => {
            if (data) {
              setCrmStatus(data);
            }
            setSyncingProvider(null);
          })
          .catch(() => {
            setSyncingProvider(null);
          });
      }, 3000);

      const toastId = setTimeout(() => setToast(null), 4000);
      return () => {
        clearTimeout(statusRefreshId);
        clearTimeout(toastId);
      };
    }
    if (crmParam === "error") {
      const reason = searchParams.get("reason") ?? "";
      const provider = searchParams.get("provider") ?? "";
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/_/g, " ");
      const msg = reason === "token_exchange_failed"
        ? t("toast.tokenExchangeFailed", { provider: providerName })
        : reason === "invalid_state"
        ? t("toast.invalidState")
        : t("toast.connectFailed", { provider: providerName });
      setToast(msg);
      const id = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(id);
    }
    if (crmParam === "config") {
      const provider = searchParams.get("provider") ?? "";
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/_/g, " ");
      setToast(t("toast.directComingSoon", { provider: providerName }));
      const id = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(id);
    }
  }, [crmParam, searchParams, t]);

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

  const startSyncPolling = (provider: CrmProviderId) => {
    // Clear any existing polling for this provider
    if (syncPollingRef.current[provider]) {
      clearInterval(syncPollingRef.current[provider]!);
    }

    let pollCount = 0;
    const maxPolls = 40; // 40 polls * 3 seconds = 2 minutes max timeout

    const poll = async () => {
      try {
        const res = await fetch(`/api/integrations/crm/${provider}/sync-status`, {
          credentials: "include",
        });
        const progress = (await res.json().catch(() => null)) as SyncProgressResponse | null;
        if (progress) {
          setSyncProgress((prev) => ({ ...prev, [provider]: progress }));

          // If sync is complete, stop polling and refresh main status
          if (!progress.is_syncing) {
            if (syncPollingRef.current[provider]) {
              clearInterval(syncPollingRef.current[provider]!);
              syncPollingRef.current[provider] = null;
            }
            // Refresh main CRM status to show final results
            fetch("/api/integrations/crm/status", { credentials: "include" })
              .then((r) => (r.ok ? r.json() : null))
              .then((data: CrmStatusResponse | null) => data && setCrmStatus(data))
              .catch(() => {});
            setSyncingProvider(null);
            return;
          }

          // Stop after 2 minutes max (timeout safety)
          pollCount += 1;
          if (pollCount >= maxPolls) {
            if (syncPollingRef.current[provider]) {
              clearInterval(syncPollingRef.current[provider]!);
              syncPollingRef.current[provider] = null;
            }
            setSyncingProvider(null);
          }
        }
      } catch {
        // Silently handle polling errors, continue polling
      }
    };

    // Start polling every 3 seconds
    syncPollingRef.current[provider] = setInterval(poll, 3000) as any as NodeJS.Timeout;
  };

  const handleSyncNow = async (provider: CrmProviderId) => {
    setSyncingProvider(provider);
    setSyncProgress((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch(`/api/integrations/crm/${provider}/batch-sync`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { enqueued?: number; error?: string } | null;
      if (!res.ok) {
        setToast(data?.error ?? t("toast.syncFailed"));
        setSyncingProvider(null);
        return;
      }
      const enqueued = data?.enqueued ?? 0;
      setToast(
        enqueued > 0
          ? t("toast.syncStarted", { count: enqueued })
          : t("toast.syncStartedNoCount")
      );
      // Start polling for sync progress
      startSyncPolling(provider);
    } catch {
      setToast(t("toast.syncFailed"));
      setSyncingProvider(null);
    } finally {
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleImportContacts = async (provider: CrmProviderId) => {
    setImportingProvider(provider);
    try {
      const res = await fetch(`/api/integrations/crm/${provider}/import`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { imported?: number; total_found?: number; message?: string; error?: string } | null;
      if (!res.ok) {
        setToast(data?.error ?? t("toast.importFailed"));
        return;
      }
      setToast(data?.message ?? t("toast.contactsImported", { count: data?.imported ?? 0 }));
      // Refresh CRM status
      setTimeout(() => {
        fetch("/api/integrations/crm/status", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: CrmStatusResponse | null) => d && setCrmStatus(d))
          .catch(() => {});
      }, 1000);
    } catch {
      setToast(t("toast.importFailed"));
    } finally {
      setImportingProvider(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleDisconnect = async (provider: CrmProviderId) => {
    setDisconnectingProvider(provider);
    setConfirmDisconnect(null);
    try {
      const res = await fetch(`/api/integrations/crm/${provider}/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast(data?.error ?? t("toast.disconnectFailed"));
        return;
      }
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1).replace(/_/g, " ");
      setToast(t("toast.crmDisconnected", { provider: providerName }));

      // Reset card visually immediately by removing from status
      setCrmStatus((prev) => {
        if (!prev) return null;
        const updated = { ...prev };
        delete updated.integrations[provider];
        return updated;
      });

      // Refresh CRM status to ensure consistency
      fetch("/api/integrations/crm/status", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: CrmStatusResponse | null) => d && setCrmStatus(d))
        .catch(() => {});
    } catch {
      setToast(t("toast.disconnectFailed"));
    } finally {
      setDisconnectingProvider(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: t("hub.breadcrumbSettings"), href: "/app/settings" }, { label: t("hub.title") }]} />
      <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-1">{t("hub.title")}</h1>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed mb-6">{t("hub.subtitle")}</p>

      <IntegrationsHealthWidget />

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
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                {t("whatsappComingSoon", { defaultValue: "Send and receive WhatsApp messages through your autonomous operator. Connect your WhatsApp Business account to get started." })}
              </p>
              <a href="https://business.whatsapp.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent-primary)] hover:underline">
                Learn about WhatsApp Business API →
              </a>
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
                  : "Never"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>{t("hub.recordsSyncedLabel")} {crmStatus?.global.recordsSynced ?? 0}</span>
            </div>
            {(crmStatus?.global.errors ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--accent-warning,#f59e0b)]">
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
                    <div className="flex flex-col gap-1 items-end">
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shrink-0">
                        {t("status.beta")}
                      </span>
                      {crm.comingSoon ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--accent-warning,#f59e0b)]/40 text-[var(--accent-warning,#f59e0b)] shrink-0">
                          {t("comingSoon")}
                        </span>
                      ) : status?.tokenStatus === 'expired' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--accent-danger,#ef4444)]/30 text-[var(--accent-danger,#ef4444)] shrink-0 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {t("status.reauthRequired", { defaultValue: "Re-auth required" })}
                        </span>
                      ) : status?.tokenStatus === 'expiring_soon' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--accent-warning,#f59e0b)]/40 text-[var(--accent-warning,#f59e0b)] shrink-0">
                          {t("status.expiringToken", { defaultValue: "Token expiring" })}
                        </span>
                      ) : status?.tokenStatus === 'error' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--accent-danger,#ef4444)]/30 text-[var(--accent-danger,#ef4444)] shrink-0 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {t("status.tokenError", { defaultValue: "Token error" })}
                        </span>
                      ) : syncingProvider === crm.id ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shrink-0 flex items-center gap-1">
                          <Loader className="w-3 h-3 animate-spin" />
                          {syncProgress[crm.id]
                            ? `Syncing... ${syncProgress[crm.id]!.completed}/${syncProgress[crm.id]!.total}`
                            : t("status.syncing", { defaultValue: "Syncing..." })}
                        </span>
                      ) : connected ? (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shrink-0">
                          {t("status.connected")}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] shrink-0">
                          {t("status.disconnected")}
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">{t(`card.${crm.id === "zoho_crm" ? "zoho" : crm.id === "google_contacts" ? "googleContacts" : crm.id === "microsoft_365" ? "microsoft365" : crm.id}.title`)}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 flex-1">{t(`card.${crm.id === "zoho_crm" ? "zoho" : crm.id === "google_contacts" ? "googleContacts" : crm.id === "microsoft_365" ? "microsoft365" : crm.id}.body`)}</p>
                  {connected && (
                    <div className="mt-3 space-y-1.5">
                      {status?.lastSyncAt && (
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          <span className="font-medium">{t("label.lastSynced")}:</span> {new Date(status.lastSyncAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[var(--text-secondary)]"><span className="font-medium">{t("label.synced")}:</span> {status?.recordsSynced ?? 0} {t("label.records")}</span>
                        {(status?.errorCount ?? 0) > 0 && (
                          <span className="text-[10px] font-medium text-[var(--accent-warning,#f59e0b)] bg-[var(--accent-warning,#f59e0b)]/10 px-1.5 py-0.5 rounded">
                            {t("label.errors", { count: status?.errorCount ?? 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!connected && !crm.comingSoon && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-2 italic">
                      Connects in 30 seconds · Data stays encrypted · Disconnect anytime
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {crm.comingSoon ? (
                      <button
                        type="button"
                        disabled
                        className="inline-block px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] cursor-not-allowed"
                      >
                        {t("comingSoon")}
                      </button>
                    ) : (status?.tokenStatus === 'expired' || status?.tokenStatus === 'error') && status?.connected === false ? (
                      <>
                        <a
                          href={`/api/integrations/crm/${crm.id}/connect`}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-danger,#ef4444)] text-white hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {t("button.reauthenticate", { defaultValue: "Re-authenticate" })}
                        </a>
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnect(crm.id)}
                          disabled={disconnectingProvider === crm.id}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--accent-danger,#ef4444)]/30 text-[var(--accent-danger,#ef4444)] hover:bg-[var(--accent-danger,#ef4444)]/10 transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {disconnectingProvider === crm.id ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unplug className="w-3 h-3" />
                          )}
                          {t("button.disconnect")}
                        </button>
                      </>
                    ) : connected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSyncNow(crm.id)}
                          disabled={syncingProvider === crm.id}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-[border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {syncingProvider === crm.id ? (
                            <>
                              <Loader className="w-3 h-3 animate-spin" />
                              {t("button.syncing")}
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              {t("button.syncNow")}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImportContacts(crm.id)}
                          disabled={importingProvider === crm.id}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-[border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {importingProvider === crm.id ? (
                            <>
                              <Loader className="w-3 h-3 animate-spin" />
                              {t("button.importing")}
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              {t("button.import")}
                            </>
                          )}
                        </button>
                        <Link
                          href={`/app/settings/integrations/mapping?provider=${crm.id}`}
                          className="inline-block px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-[border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                        >
                          {t("button.configure")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnect(crm.id)}
                          disabled={disconnectingProvider === crm.id}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--accent-danger,#ef4444)]/30 text-[var(--accent-danger,#ef4444)] hover:bg-[var(--accent-danger,#ef4444)]/10 transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {disconnectingProvider === crm.id ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unplug className="w-3 h-3" />
                          )}
                          {t("button.disconnect")}
                        </button>
                      </>
                    ) : (
                      <a
                        href={`/api/integrations/crm/${crm.id}/connect`}
                        className="inline-block px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
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
                  <span className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--accent-primary)]/30 text-[var(--accent-primary)]">
                    {t("status.connected")}
                  </span>
                ) : (
                  <Link href="/api/integrations/google-calendar/auth" className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] shrink-0 transition-[border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">
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
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t("hub.outlookCalendarLabel")}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{t("hub.calendarDesc")}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] shrink-0">
                  {t("status.disconnected")}
                </span>
              </div>
              <a
                href="/api/integrations/outlook-calendar/auth"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
              >
                {t("connectOutlook", { defaultValue: "Connect Outlook" })}
              </a>
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
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {testingWebhook ? t("hub.testing") : t("hub.sendTest")}
              </button>
              <button
                type="button"
                onClick={handleSaveWebhook}
                disabled={savingWebhook || !workspaceId}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
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

      {confirmDisconnect && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDisconnect(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t("dialog.disconnectTitle", { provider: confirmDisconnect.charAt(0).toUpperCase() + confirmDisconnect.slice(1).replace(/_/g, " ") })}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              {t("dialog.disconnectDesc")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDisconnect(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                {t("dialog.cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleDisconnect(confirmDisconnect)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-danger,#ef4444)] text-white hover:opacity-90"
              >
                {t("button.disconnect")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-[var(--text-primary)]">{toast}</div>
      )}

      <p className="text-xs text-[var(--text-secondary)] mt-6">
        {t("hub.needHelp")} <a href="mailto:support@recall-touch.com" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline underline-offset-2">support@recall-touch.com</a>
      </p>
      <p className="mt-4"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{t("hub.backToSettings")}</Link></p>
    </div>
  );
}
