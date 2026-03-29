"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Search,
  ExternalLink,
  Check,
  Bell,
  Plug,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string; // First letter for colored div
  status: "available" | "coming-soon" | "connected";
  actionLabel: string;
  href?: string; // For connect/configure buttons
  external?: boolean; // For Zapier external links
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Sync payments and billing information in real-time",
    icon: "S",
    status: "available",
    actionLabel: "Connect",
    href: "/app/settings/billing",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Automatically sync appointments and availability",
    icon: "G",
    status: "available",
    actionLabel: "Connect",
    href: "/app/settings/integrations",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect 1000+ apps to automate your workflow",
    icon: "Z",
    status: "available",
    actionLabel: "Connect",
    href: "https://zapier.com/apps/revenue-operator/integrations",
    external: true,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Send custom data to your own systems",
    icon: "W",
    status: "available",
    actionLabel: "Configure",
    href: "/app/developer/webhooks",
  },
];

const COMING_SOON_INTEGRATIONS: Integration[] = [
  {
    id: "hubspot",
    name: "HubSpot CRM",
    description: "Sync leads and pipeline data with HubSpot",
    icon: "H",
    status: "coming-soon",
    actionLabel: "Notify Me",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM synchronization",
    icon: "S",
    status: "coming-soon",
    actionLabel: "Notify Me",
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel",
    description: "Agency management and client communication",
    icon: "G",
    status: "coming-soon",
    actionLabel: "Notify Me",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Export and report data directly to spreadsheets",
    icon: "G",
    status: "coming-soon",
    actionLabel: "Notify Me",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Real-time notifications and alerts in Slack",
    icon: "S",
    status: "coming-soon",
    actionLabel: "Notify Me",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Track revenue and financial information",
    icon: "Q",
    status: "coming-soon",
    actionLabel: "Notify Me",
  },
];

function IntegrationCard({ integration }: { integration: Integration }) {
  const t = useTranslations();

  const getIconColor = (letter: string) => {
    const colors: Record<string, string> = {
      S: "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]",
      G: "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]",
      Z: "bg-[var(--accent-warning,#f59e0b)]/20 text-[var(--accent-warning,#f59e0b)]",
      W: "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]",
      H: "bg-[var(--accent-warning,#f59e0b)]/20 text-[var(--accent-warning,#f59e0b)]",
      Q: "bg-[var(--accent-danger,#ef4444)]/20 text-[var(--accent-danger,#ef4444)]",
    };
    return colors[letter] || "bg-[var(--bg-inset)] text-[var(--text-tertiary)]";
  };

  const handleNotifyClick = () => {
    toast.success(`We'll notify you when ${integration.name} is available!`);
  };

  const isComingSoon = integration.status === "coming-soon";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl border p-6 transition-all duration-200",
        isComingSoon
          ? "border-[var(--border-light)] bg-[var(--bg-card)]/50 opacity-75"
          : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-medium)] hover:shadow-lg"
      )}
    >
      {/* Header with icon and status */}
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold",
            getIconColor(integration.icon)
          )}
        >
          {integration.icon}
        </div>

        {integration.status === "connected" && (
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/40">
            <Check size={12} />
            Connected
          </div>
        )}

        {isComingSoon && (
          <div className="rounded-full bg-[var(--accent-warning,#f59e0b)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-warning,#f59e0b)] border border-[var(--accent-warning,#f59e0b)]/40">
            Coming Soon
          </div>
        )}
      </div>

      {/* Name and description */}
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        {integration.name}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {integration.description}
      </p>

      {/* Action button */}
      <div className="mt-6 flex items-center gap-2">
        {integration.status === "available" && (
          <Link href={integration.href || "#"}>
            <button
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-200",
                integration.external
                  ? "bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  : "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
              )}
            >
              {integration.actionLabel}
              {integration.external && <ExternalLink size={14} />}
            </button>
          </Link>
        )}

        {integration.status === "coming-soon" && (
          <button
            onClick={handleNotifyClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-hover)] transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          >
            <Bell size={14} />
            {integration.actionLabel}
          </button>
        )}

        {integration.status === "connected" && (
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/40 text-[var(--accent-primary)] text-sm font-semibold cursor-default"
          >
            <Check size={14} />
            Connected
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function IntegrationsPage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAvailable = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return AVAILABLE_INTEGRATIONS.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredComingSoon = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return COMING_SOON_INTEGRATIONS.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {t("integrations.title", { defaultValue: "Integrations" })}
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            {t(
              "integrations.subtitle",
              {
                defaultValue:
                  "Connect your tools to automate more of your revenue operations",
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

        {/* Available Now Section */}
        {filteredAvailable.length > 0 && (
          <div className="mb-12">
            <div className="mb-6 flex items-center gap-2">
              <Plug size={20} className="text-[var(--accent-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Available Now
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAvailable.map((integration, idx) => (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <IntegrationCard integration={integration} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Coming Soon Section */}
        {filteredComingSoon.length > 0 && (
          <div className="mb-12">
            <div className="mb-6 flex items-center gap-2">
              <Bell size={20} className="text-[var(--accent-warning,#f59e0b)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Coming Soon
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredComingSoon.map((integration, idx) => (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <IntegrationCard integration={integration} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* No results state */}
        {filteredAvailable.length === 0 && filteredComingSoon.length === 0 && (
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
