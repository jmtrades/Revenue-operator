"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Star,
  Calendar,
  Phone,
  Users,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

interface UsageMeter {
  label: string;
  used: number;
  limit: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface InvoiceRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "failed";
}

const DEMO_PLAN = {
  name: "Business",
  tier: "business" as const,
  isAnnual: true,
  pricePerMonth: 247,
  renewalDate: "2026-04-17",
};

const DEMO_USAGE: UsageMeter[] = [
  { label: "Calls this month", used: 312, limit: 500, icon: Phone },
  { label: "Phone numbers", used: 3, limit: 5, icon: Phone },
  { label: "AI Agents", used: 2, limit: 3, icon: Users },
  { label: "Active sequences", used: 2, limit: 3, icon: MessageSquare },
];

const DEMO_INVOICES: InvoiceRow[] = [
  { id: "inv_1", date: "2026-03-01", description: "Business plan — March 2026", amount: 247, status: "paid" },
  { id: "inv_2", date: "2026-02-01", description: "Business plan — February 2026", amount: 247, status: "paid" },
  { id: "inv_3", date: "2026-01-01", description: "Business plan — January 2026", amount: 247, status: "paid" },
  { id: "inv_4", date: "2025-12-01", description: "Business plan — December 2025", amount: 247, status: "paid" },
  { id: "inv_5", date: "2025-11-01", description: "Business plan — November 2025", amount: 297, status: "paid" },
];

function usagePct(used: number, limit: number): number {
  return limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
}

function usageColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function usageTextColor(pct: number): string {
  if (pct >= 90) return "text-red-400";
  if (pct >= 70) return "text-amber-400";
  return "text-emerald-400";
}

function statusBadge(status: InvoiceRow["status"]): { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> } {
  switch (status) {
    case "paid":
      return { label: "Paid", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 };
    case "pending":
      return { label: "Pending", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", Icon: AlertCircle };
    case "failed":
      return { label: "Failed", cls: "bg-red-500/10 text-red-400 border-red-500/30", Icon: XCircle };
  }
}

export default function SettingsBillingPage() {
  const _t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [_plan] = useState(DEMO_PLAN);

  const tierColor = useMemo(() => {
    switch (_plan.tier) {
      case "business": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  }, [_plan.tier]);

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

      <div className="flex items-center gap-2 mb-6 text-xs text-zinc-400">
        <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
          Preview
        </span>
        <span>Billing will activate once your account is live.</span>
      </div>

      {/* Current plan card */}
      <div
        className="rounded-2xl border p-6 mb-6"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {_plan.name} Plan
              </h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${tierColor}`}>
                <Star className="w-3 h-3" />
                {_plan.name}
              </span>
              {_plan.isAnnual && (
                <span className="rounded-full bg-zinc-900/60 text-blue-400 border border-zinc-800 px-2 py-0.5 text-xs">
                  Annual
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              ${_plan.pricePerMonth}/month{_plan.isAnnual ? " (billed annually)" : ""}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
              <Calendar className="w-3 h-3" />
              <span>Renews {new Date(_plan.renewalDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black text-sm font-semibold px-4 py-2 hover:bg-zinc-100 transition-colors"
          >
            Change Plan
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
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
          {DEMO_USAGE.map((meter) => {
            const pct = usagePct(meter.used, meter.limit);
            const barColor = usageColor(pct);
            const textColor = usageTextColor(pct);
            const Icon = meter.icon;
            return (
              <div key={meter.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{meter.label}</span>
                  </div>
                  <span className={`text-sm font-medium tabular-nums ${textColor}`}>
                    {meter.used} / {meter.limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {pct >= 80 && (
                  <p className="text-xs mt-1.5 text-amber-400">
                    {pct >= 100 ? "Limit reached — overages may apply." : "Approaching limit."}
                    {" "}
                    <Link href="/pricing" className="underline hover:text-amber-300">Upgrade</Link>
                  </p>
                )}
              </div>
            );
          })}
        </div>
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
            <div className="w-10 h-7 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Visa ending in 4242
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Expires 12/2028
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-300 border border-zinc-700 rounded-lg px-3 py-1.5 hover:bg-zinc-800 transition-colors"
          >
            Update
          </button>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80">
              <th className="py-3 px-6 font-medium text-left text-zinc-400">Date</th>
              <th className="py-3 px-6 font-medium text-left text-zinc-400">Description</th>
              <th className="py-3 px-6 font-medium text-right text-zinc-400">Amount</th>
              <th className="py-3 px-6 font-medium text-right text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_INVOICES.map((inv) => {
              const badge = statusBadge(inv.status);
              const BadgeIcon = badge.Icon;
              return (
                <tr key={inv.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/60 transition-colors">
                  <td className="py-3 px-6 text-zinc-300">
                    {new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-3 px-6" style={{ color: "var(--text-primary)" }}>
                    {inv.description}
                  </td>
                  <td className="py-3 px-6 text-right tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                    ${inv.amount}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${badge.cls}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-2xl border p-6"
        style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}
      >
        <h3 className="text-sm font-medium text-red-400 mb-2">Cancel Subscription</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          If you cancel, you&apos;ll lose access to all features at the end of your billing period.
        </p>
        <Link
          href="/dashboard/billing/cancel"
          className="text-sm text-red-400 hover:text-red-300 underline"
        >
          Cancel subscription
        </Link>
      </div>
    </div>
  );
}
