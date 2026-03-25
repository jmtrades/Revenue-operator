"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";
import { TrialGraceEndedBanner } from "@/components/TrialGraceEndedBanner";
import { PageHeader } from "@/components/ui";

interface BillingState {
  plan_name: string;
  interval: string;
  status: string;
  renews_at: string | null;
  can_manage: boolean;
}

interface UsageState {
  calls: number;
  messages: number;
  calls_limit: number;
  messages_limit: number;
  calls_pct: number;
  messages_pct: number;
}

const STATUS_KEYS: Record<string, "statusTrial" | "statusActive" | "statusPastDue" | "statusPaused"> = {
  trial: "statusTrial",
  active: "statusActive",
  past_due: "statusPastDue",
  paused: "statusPaused",
};

export default function DashboardBillingPage() {
  const t = useTranslations("dashboard");
  const tb = useTranslations("dashboard.billingPage");
  const { workspaceId } = useWorkspace();
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setBilling(null);
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/dashboard/billing?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/usage?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([b, u]) => {
        setBilling(b);
        setUsage(u);
      })
      .catch(() => { setBilling(null); setUsage(null); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleManage = () => {
    if (!workspaceId || !billing?.can_manage || managing) return;
    setManaging(true);
    fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        workspace_id: workspaceId,
        return_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard/billing` : undefined,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error("portal_failed"); return r.json(); })
      .then((d) => {
        if (d?.ok && d?.url) window.location.href = d.url;
      })
      .catch(() => { /* portal unavailable — button re-enables on finally */ })
      .finally(() => setManaging(false));
  };

  if (loading || !workspaceId) {
    return (
      <div className="p-6 max-w-lg space-y-4">
        <PageHeader title={t("pages.billing.title")} subtitle={t("pages.billing.subtitleShort")} />
        <div className="rounded-xl border p-4 space-y-3 animate-pulse" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <div className="h-4 w-32 rounded" style={{ background: "var(--border-default)" }} />
          <div className="h-3 w-full rounded" style={{ background: "var(--border-default)" }} />
          <div className="h-3 w-3/4 rounded" style={{ background: "var(--border-default)" }} />
        </div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="p-6 max-w-lg">
        <PageHeader title={t("pages.billing.title")} subtitle={t("pages.billing.subtitleShort")} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{tb("billingUnavailable")}</p>
      </div>
    );
  }

  const renewalDate = billing.renews_at
    ? new Date(billing.renews_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const usageAlert = usage && (usage.calls_pct >= 100 || usage.messages_pct >= 100);
  const usageWarn = usage && !usageAlert && (usage.calls_pct >= 80 || usage.messages_pct >= 80);

  return (
    <div className="p-6 max-w-lg space-y-6">
      <TrialGraceEndedBanner />
      <DashboardExecutionStateBanner />
      <PageHeader title={t("pages.billing.title")} subtitle={t("pages.billing.subtitle")} />

      {usageAlert && (
        <div className="rounded-lg p-3 text-sm font-medium" style={{ background: "var(--accent-danger-subtle, rgba(239,68,68,0.1))", color: "var(--accent-danger, #ef4444)" }}>
          {tb("usageAlert")}
        </div>
      )}
      {usageWarn && !usageAlert && (
        <div className="rounded-lg p-3 text-sm" style={{ background: "var(--accent-warning-subtle, rgba(245,158,11,0.1))", color: "var(--text-secondary)" }}>
          {tb("usageWarn")}
        </div>
      )}

      {usage && (
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{tb("usageThisPeriod")}</p>
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{tb("callsLabel", { used: usage.calls, limit: usage.calls_limit })}</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-default)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, usage.calls_pct)}%`, background: "var(--accent-primary)" }} />
            </div>
          </div>
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{tb("messagesLabel", { used: usage.messages, limit: usage.messages_limit })}</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-default)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, usage.messages_pct)}%`, background: "var(--accent-primary)" }} />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <p className="text-sm"><span style={{ color: "var(--text-tertiary)" }}>{tb("plan")}:</span> <span style={{ color: "var(--text-primary)" }}>{billing.plan_name}</span></p>
        <p className="text-sm"><span style={{ color: "var(--text-tertiary)" }}>{tb("interval")}:</span> <span style={{ color: "var(--text-primary)" }}>{billing.interval === "year" ? tb("intervalAnnual") : tb("intervalMonthly")}</span></p>
        <p className="text-sm"><span style={{ color: "var(--text-tertiary)" }}>{tb("status")}:</span> <span style={{ color: "var(--text-primary)" }}>{STATUS_KEYS[billing.status] ? tb(STATUS_KEYS[billing.status]) : billing.status}</span></p>
        {renewalDate && (
          <p className="text-sm"><span style={{ color: "var(--text-tertiary)" }}>{tb("renewal")}:</span> <span style={{ color: "var(--text-primary)" }}>{renewalDate}</span></p>
        )}
      </div>

      {billing.can_manage && (
        <button
          type="button"
          onClick={handleManage}
          disabled={managing}
          className="py-2.5 px-4 text-sm font-medium rounded-lg disabled:opacity-60 transition-opacity"
          style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
        >
          {managing ? tb("opening") : tb("manageBilling")}
        </button>
      )}

      <div className="rounded-lg border p-4 text-sm" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
        <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>{tb("cancelTitle")}</p>
        <p className="mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {tb("cancelBody")}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {tb("cancelHint")} <a href="mailto:hello@recall-touch.com" className="underline" style={{ color: "var(--accent-primary)" }}>hello@recall-touch.com</a>
        </p>
      </div>
    </div>
  );
}
