"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Star,
  Phone,
  Users,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

interface UsageMeter {
  label: string;
  used: number;
  limit: number;
  icon: React.ComponentType<{ className?: string }>;
}


const EMPTY_USAGE: UsageMeter[] = [
  { label: "Calls this month", used: 0, limit: 0, icon: Phone },
  { label: "Phone numbers", used: 0, limit: 0, icon: Phone },
  { label: "AI Agents", used: 0, limit: 0, icon: Users },
  { label: "Active sequences", used: 0, limit: 0, icon: MessageSquare },
];


export default function SettingsBillingPage() {
  const _t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <PageHeader title="Billing & Subscription" subtitle="Manage your plan, usage, and payment." />
        <EmptyState icon="pulse" title="Select a workspace" subtitle="Billing information will appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Billing & Subscription" subtitle="Manage your plan, usage, and payment." />

      {/* Current plan card */}
      <div
        className="rounded-2xl border p-6 mb-6"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Free Trial
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <Star className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Your plan and billing details will appear here once you subscribe.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
          >
            View Plans
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Usage meters */}
      <div
        className="rounded-2xl border p-6 mb-6"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <h3 className="text-sm font-medium mb-5" style={{ color: "var(--text-primary)" }}>
          Usage This Period
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {EMPTY_USAGE.map((meter) => {
            const Icon = meter.icon;
            return (
              <div key={meter.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{meter.label}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-[var(--text-tertiary)]">
                    —
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--bg-inset)]" style={{ width: "0%" }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
          Usage data populates once your subscription is active.
        </p>
      </div>

      {/* Payment method */}
      <div
        className="rounded-2xl border p-6 mb-6"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
          Payment Method
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 rounded border border-[var(--border-default)] bg-[var(--bg-inset)] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No payment method on file
            </p>
          </div>
          <Link
            href="/pricing"
            className="text-sm text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 hover:bg-[var(--bg-inset)] transition-colors"
          >
            Add payment method
          </Link>
        </div>
      </div>

      {/* Billing history */}
      <div
        className="rounded-2xl border overflow-hidden mb-6"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-default)" }}>
          <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Billing History
          </h3>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No invoices yet. Your billing history will appear here after your first payment.
          </p>
        </div>
      </div>

      {/* Manage subscription link */}
      <div
        className="rounded-2xl border p-6"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Manage Subscription</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Upgrade, downgrade, or cancel your subscription at any time from the main billing page.
        </p>
        <Link
          href="/app/settings/billing"
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          Go to billing settings →
        </Link>
      </div>
    </div>
  );
}
