"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Search,
  ExternalLink,
  Check,
  Bell,
  Plug,
  AlertCircle,
  Loader,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { CrmProviderId, CrmStatusResponse } from "@/app/api/integrations/crm/status/route";

interface IntegrationCategory {
  name: string;
  description: string;
  integrations: IntegrationItem[];
}

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "crm" | "calendar" | "communication" | "automation";
  crmProviderId?: CrmProviderId;
  actionLabel: string;
  href?: string;
  external?: boolean;
  comingSoon?: boolean;
}

const INTEGRATIONS: IntegrationItem[] = [
  // CRM Integrations
  { id: "hubspot", name: "HubSpot", description: "Sync leads and pipeline data", icon: "H", category: "crm", crmProviderId: "hubspot", actionLabel: "Connect", comingSoon: false },
  { id: "salesforce", name: "Salesforce", description: "Enterprise CRM sync", icon: "S", category: "crm", crmProviderId: "salesforce", actionLabel: "Connect", comingSoon: false },
  { id: "zoho", name: "Zoho CRM", description: "Sync contacts and deals", icon: "Z", category: "crm", crmProviderId: "zoho_crm", actionLabel: "Connect", comingSoon: false },
  { id: "pipedrive", name: "Pipedrive", description: "Pipeline and deal management", icon: "P", category: "crm", crmProviderId: "pipedrive", actionLabel: "Connect", comingSoon: false },
  { id: "gohighlevel", name: "GoHighLevel", description: "Agency management platform", icon: "G", category: "crm", crmProviderId: "gohighlevel", actionLabel: "Connect", comingSoon: false },
  { id: "google-contacts", name: "Google Contacts", description: "Sync contacts automatically", icon: "G", category: "crm", crmProviderId: "google_contacts", actionLabel: "Connect", comingSoon: false },
  { id: "airtable", name: "Airtable", description: "Database and automation", icon: "A", category: "crm", crmProviderId: "airtable", actionLabel: "Connect", comingSoon: false },
  { id: "microsoft-365", name: "Microsoft 365", description: "Contacts and calendar sync", icon: "M", category: "crm", crmProviderId: "microsoft_365", actionLabel: "Connect", comingSoon: false },

  // Calendar Integrations
  { id: "google-calendar", name: "Google Calendar", description: "Sync appointments and availability", icon: "G", category: "calendar", actionLabel: "Connect", href: "/app/settings/integrations" },

  // Communication Integrations
  { id: "slack", name: "Slack", description: "Real-time notifications and alerts", icon: "S", category: "communication", actionLabel: "Connect", comingSoon: false },

  // Automation Integrations
  { id: "zapier", name: "Zapier", description: "Connect 1000+ apps to automate", icon: "Z", category: "automation", actionLabel: "View", href: "https://zapier.com/apps/revenue-operator/integrations", external: true },
  { id: "webhooks", name: "Webhooks", description: "Send custom data to your systems", icon: "W", category: "automation", actionLabel: "Configure", href: "/app/developer/webhooks" },

  // Coming Soon
  { id: "whatsapp", name: "WhatsApp", description: "Send and receive WhatsApp messages", icon: "W", category: "communication", actionLabel: "Notify Me", comingSoon: true },
  { id: "outlook-calendar", name: "Outlook Calendar", description: "Sync Outlook calendar", icon: "O", category: "calendar", actionLabel: "Notify Me", comingSoon: true },
];

function IntegrationCard({
  integration,
  status,
  isLoading,
}: {
  integration: IntegrationItem;
  status?: { connected: boolean; lastSyncAt?: string | null; recordsSynced?: number } | undefined;
  isLoading?: boolean | string;
}) {
  const t = useTranslations();

  const getIconColor = (letter: string) => {
    const colors: Record<string, string> = {
      H: "bg-orange-500/20 text-orange-500",
      S: "bg-blue-500/20 text-blue-500",
      Z: "bg-purple-500/20 text-purple-500",
      P: "bg-green-500/20 text-green-500",
      G: "bg-blue-500/20 text-blue-500",
      A: "bg-red-500/20 text-red-500",
      M: "bg-blue-600/20 text-blue-600",
      W: "bg-cyan-500/20 text-cyan-500",
      O: "bg-blue-700/20 text-blue-700",
    };
    return colors[letter] || "bg-[var(--bg-inset)] text-[var(--text-tertiary)]";
  };

  const isConnected = status?.connected ?? false;
  const isComingSoon = integration.comingSoon ?? false;
  const href = integration.href || "/app/settings/integrations";

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const then = new Date(dateString);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl border p-6 transition-all duration-200 flex flex-col h-full",
        isComingSoon
          ? "border-[var(--border-light)] bg-[var(--bg-card)]/50 opacity-75"
          : isConnected
            ? "border-[var(--border-default)] bg-[var(--bg-card)] border-l-4 border-l-[var(--accent-primary)] hover:shadow-lg"
            : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-medium)] hover:shadow-lg"
      )}
    >
      {/* Header with icon and status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold shrink-0",
            getIconColor(integration.icon)
          )}
        >
          {integration.icon}
        </div>

        {isLoading && (
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/40">
            <Loader size={12} className="animate-spin" />
            Loading
          </div>
        )}

        {!isLoading && isConnected && (
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/40">
            <Check size={12} />
            Connected
          </div>
        )}

        {!isLoading && !isConnected && isComingSoon && (
          <div className="rounded-full bg-[var(--accent-warning,#f59e0b)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-warning,#f59e0b)] border border-[var(--accent-warning,#f59e0b)]/40">
            Coming Soon
          </div>
        )}

        {!isLoading && !isConnected && !isComingSoon && (
          <div className="rounded-full bg-[var(--bg-input)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
            Not Connected
          </div>
        )}
      </div>

      {/* Name and description */}
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
        {integration.name}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)] flex-1">
        {integration.description}
      </p>

      {/* Sync stats for connected integrations */}
      {isConnected && status && !isComingSoon && (
        <div className="mt-3 py-3 border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)] space-y-1">
          {status.recordsSynced !== undefined && (
            <div className="flex justify-between">
              <span>Records synced:</span>
              <span className="font-semibold text-[var(--text-primary)]">{status.recordsSynced}</span>
            </div>
          )}
          {status.lastSyncAt && (
            <div className="flex justify-between">
              <span>Last sync:</span>
              <span className="font-semibold text-[var(--text-primary)]">{formatTimeAgo(status.lastSyncAt)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      <div className="mt-6 flex items-center gap-2 pt-3 border-t border-[var(--border-light)]">
        {!isComingSoon && (
          <Link href={href} className="flex-1">
            <button
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-200",
                integration.external
                  ? "bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  : isConnected
                    ? "bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)] cursor-default"
                    : "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
              )}
              disabled={isConnected && !integration.external}
            >
              {isConnected && !integration.external ? (
                <>
                  <Check size={14} />
                  Connected
                </>
              ) : (
                <>
                  {integration.actionLabel}
                  {integration.external && <ExternalLink size={14} />}
                </>
              )}
            </button>
          </Link>
        )}

        {isComingSoon && (
          <button
            onClick={() => {
              const event = new CustomEvent("notify-integration", { detail: { id: integration.id, name: integration.name } });
              window.dispatchEvent(event);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-hover)] transition-all duration-200 active:scale-[0.97]"
          >
            <Bell size={14} />
            {integration.actionLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function IntegrationsPage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [crmStatus, setCrmStatus] = useState<CrmStatusResponse | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean | null>(null);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  // Load CRM and Calendar status on mount
  useEffect(() => {
    setLoadingStatuses(true);
    Promise.all([
      fetch("/api/integrations/crm/status", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: CrmStatusResponse | null) => data && setCrmStatus(data))
        .catch((e) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); }),
      fetch("/api/integrations/google-calendar/status", { credentials: "include" })
        .then((r) => r.json())
        .then((data: { connected?: boolean }) => setGoogleCalendarConnected(Boolean(data?.connected)))
        .catch(() => setGoogleCalendarConnected(false)),
    ]).finally(() => setLoadingStatuses(false));
  }, []);

  const getIntegrationStatus = (integration: IntegrationItem) => {
    if (integration.id === "google-calendar") {
      return {
        connected: googleCalendarConnected || false,
      };
    }
    if (integration.crmProviderId) {
      return crmStatus?.integrations[integration.crmProviderId];
    }
    return undefined;
  };

  const filteredIntegrations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return INTEGRATIONS.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, IntegrationItem[]> = {
      crm: [],
      calendar: [],
      communication: [],
      automation: [],
    };

    filteredIntegrations.forEach((i) => {
      grouped[i.category].push(i);
    });

    return grouped;
  }, [filteredIntegrations]);

  const categoryLabels = {
    crm: { title: "CRM Integrations", description: "Connect your customer relationship management platforms" },
    calendar: { title: "Calendar Integrations", description: "Sync your calendar and availability" },
    communication: { title: "Communication", description: "Connect messaging and notification channels" },
    automation: { title: "Automation & Webhooks", description: "Automate workflows and integrate custom systems" },
  };

  const hasAnyIntegrations = Object.values(groupedByCategory).some((group) => group.length > 0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Home", href: "/app" }, { label: "Integrations" }]} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {t("integrations.title", { defaultValue: "Integrations Hub" })}
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            {t(
              "integrations.subtitle",
              {
                defaultValue:
                  "Connect your tools to automate your revenue operations. Manage all connections from one place.",
              }
            )}
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-8">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
            />
          </div>
        </div>

        {/* Integration categories */}
        {hasAnyIntegrations ? (
          <div className="space-y-12">
            {Object.entries(groupedByCategory).map(([category, integrations]) =>
              integrations.length > 0 ? (
                <div key={category}>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {categoryLabels[category as keyof typeof categoryLabels].title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {categoryLabels[category as keyof typeof categoryLabels].description}
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {integrations.map((integration, idx) => {
                      const status = getIntegrationStatus(integration);
                      const isLoadingStatus = loadingStatuses && (integration.crmProviderId || integration.id === "google-calendar");

                      return (
                        <motion.div
                          key={integration.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                        >
                          <IntegrationCard
                            integration={integration}
                            status={status}
                            isLoading={isLoadingStatus}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
            <Plug size={40} className="mx-auto mb-4 text-[var(--text-secondary)] opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              No integrations found
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Try adjusting your search query
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
