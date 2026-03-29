"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Activity, AlertCircle, CheckCircle, Clock, ArrowRight } from "lucide-react";
import type { CrmStatusResponse, CrmProviderId } from "@/app/api/integrations/crm/status/route";

interface CalendarStatus {
  connected: boolean;
}

const CRM_PROVIDER_NAMES: Record<CrmProviderId, string> = {
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  zoho_crm: "Zoho CRM",
  pipedrive: "Pipedrive",
  gohighlevel: "GoHighLevel",
  google_contacts: "Google Contacts",
  microsoft_365: "Microsoft 365",
  airtable: "Airtable",
};

export function IntegrationsHealthWidget() {
  const t = useTranslations("integrationsHealth");
  const [crmStatus, setCrmStatus] = useState<CrmStatusResponse | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/integrations/crm/status", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/integrations/google-calendar/status", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([crm, calendar]) => {
      setCrmStatus(crm);
      setCalendarStatus(calendar);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="skeleton-shimmer h-32 rounded-2xl bg-[var(--bg-surface)]" />;
  }

  const connectedCrms = Object.entries(crmStatus?.integrations ?? {})
    .filter(([_, status]) => status.connected)
    .map(([provider, status]) => ({
      provider: provider as CrmProviderId,
      status,
    }));

  const hasConnectedIntegrations = connectedCrms.length > 0 || calendarStatus?.connected;

  if (!hasConnectedIntegrations) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-5 h-5 text-[var(--text-tertiary)]" aria-hidden />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("title")}</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          {t("empty")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-[var(--bg-inset)] border border-[var(--border-medium)] px-3 py-2">
            <p className="text-[11px] font-medium text-[var(--text-primary)]">CRM</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Auto-sync leads &amp; deals after every call</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-inset)] border border-[var(--border-medium)] px-3 py-2">
            <p className="text-[11px] font-medium text-[var(--text-primary)]">Calendar</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">AI checks availability &amp; books confirmed slots</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-inset)] border border-[var(--border-medium)] px-3 py-2">
            <p className="text-[11px] font-medium text-[var(--text-primary)]">Webhooks</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Push events to Slack, Zapier, or any app</p>
          </div>
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] mb-3">Takes about 30 seconds per integration. Your data stays secure and encrypted.</p>
        <Link
          href="/app/settings/integrations"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent-primary)] hover:underline"
        >
          {t("browse")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-[var(--text-tertiary)]" aria-hidden />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("title")}</h3>
      </div>

      <div className="space-y-2">
        {connectedCrms.map(({ provider, status }) => {
          const hasErrors = (status.errorCount ?? 0) > 0;
          const statusIcon = hasErrors ? (
            <AlertCircle className="w-4 h-4 text-amber-400" aria-hidden />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-400" aria-hidden />
          );

          return (
            <div key={provider} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-medium)]">
              <div className="flex items-center gap-3 flex-1">
                {statusIcon}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {CRM_PROVIDER_NAMES[provider]}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5">
                    <Clock className="w-3 h-3 flex-shrink-0" aria-hidden />
                    <span className="truncate">
                      {status.lastSyncAt
                        ? new Date(status.lastSyncAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : t("neverSynced")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-hover)] px-2 py-1 rounded">
                  {t("synced", { count: status.recordsSynced ?? 0 })}
                </span>
              </div>
            </div>
          );
        })}

        {calendarStatus?.connected && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-medium)]">
            <div className="flex items-center gap-3 flex-1">
              <CheckCircle className="w-4 h-4 text-green-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{t("googleCalendar")}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("connected")}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {(crmStatus?.global.errors ?? 0) > 0 && (
        <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-[11px] text-amber-400 font-medium">
            {t((crmStatus?.global.errors ?? 0) !== 1 ? "syncErrorsPlural" : "syncErrors", { count: crmStatus?.global.errors ?? 0 })}
          </p>
        </div>
      )}

      <Link
        href="/app/settings/integrations/sync-log"
        className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--accent-primary)] hover:underline"
      >
        {t("viewSyncLog")} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
