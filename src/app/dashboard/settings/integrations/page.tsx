"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Phone,
  MessageSquare,
  Zap,
  ArrowUpRight,
  Mail,
  Copy,
  CheckCircle2,
  Circle,
  ExternalLink,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

type ConnectionStatus = "connected" | "not_connected" | "configured";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  status: ConnectionStatus;
  detail?: string;
  actionLabel: string;
  actionUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync appointments automatically. Your AI books directly into your calendar.",
    icon: Calendar,
    color: "text-blue-400",
    bg: "bg-[var(--bg-card)]/60",
    status: "connected",
    detail: "Connected as jmtrades1990@gmail.com",
    actionLabel: "Disconnect",
  },
  {
    id: "phone",
    name: "Phone & SMS",
    description: "AI phone numbers, inbound/outbound calls, and SMS messaging.",
    icon: Phone,
    color: "text-red-400",
    bg: "bg-red-500/10",
    status: "configured",
    detail: "3 active phone numbers",
    actionLabel: "Manage Numbers",
    actionUrl: "/dashboard/settings/phone",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get real-time notifications for calls, bookings, and missed-call recovery.",
    icon: MessageSquare,
    color: "text-purple-400",
    bg: "bg-[var(--bg-card)]/60",
    status: "not_connected",
    actionLabel: "Connect Slack",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect Revenue Operator to 5,000+ apps. Automate your entire workflow.",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    status: "not_connected",
    actionLabel: "Set Up Zapier",
  },
  {
    id: "crm-webhook",
    name: "CRM Webhook",
    description: "Send leads, calls, and appointments to your CRM in real-time.",
    icon: ArrowUpRight,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    status: "not_connected",
    actionLabel: "Configure",
  },
  {
    id: "email",
    name: "Email",
    description: "Transactional emails, weekly digests, and follow-up sequences.",
    icon: Mail,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    status: "configured",
    detail: "Sending from hello@revenueoperator.ai",
    actionLabel: "Test Email",
  },
];

function StatusDot({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </span>
    );
  }
  if (status === "configured") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-400">
        <CheckCircle2 className="w-3 h-3" />
        Configured
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
      <Circle className="w-3 h-3" />
      Not connected
    </span>
  );
}

export default function IntegrationsPage() {
  const _t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [webhookUrl] = useState("https://hooks.revenueoperator.ai/wh/ws_abc123");
  const [copied, setCopied] = useState(false);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <PageHeader title="Integrations" subtitle="Connect your tools and automate workflows." />
        <EmptyState icon="pulse" title="Select a workspace" subtitle="Integrations will appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Integrations" subtitle="Connect your tools and automate workflows." />

      <div className="flex items-center gap-2 mb-6 text-xs text-[var(--text-tertiary)]">
        <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
          Preview
        </span>
        <span>Connect your integrations to start automating workflows.</span>
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.id}
              className="rounded-xl border p-5 transition-colors hover:border-[var(--border-default)]"
              style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${integration.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${integration.color}`} />
                </div>
                <StatusDot status={integration.status} />
              </div>

              <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                {integration.name}
              </h3>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {integration.description}
              </p>

              {integration.detail && (
                <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
                  {integration.detail}
                </p>
              )}

              {integration.actionUrl ? (
                <a
                  href={integration.actionUrl}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    integration.status === "not_connected"
                      ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
                  }`}
                >
                  {integration.actionLabel}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    integration.status === "not_connected"
                      ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
                  }`}
                >
                  {integration.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhook URL section */}
      <div
        className="rounded-2xl border p-6"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
          Inbound Webhook URL
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          Use this URL to send external events (form submissions, CRM updates) into Revenue Operator.
        </p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm font-mono text-[var(--text-secondary)] truncate"
          >
            {webhookUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
