"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useSearchParams } from "next/navigation";
import { fetchWorkspaceMeCached, getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { PlanChangeModal, type PlanId } from "@/components/PlanChangeModal";
import {
  BILLING_PLANS,
  PLAN_DISPLAY_NAMES,
  planIdFromBillingTier,
  planSlugFromUiPlanId,
} from "@/lib/billing-plans";

interface MinutePack {
  id: string;
  minutes: number;
  price_cents: number;
  price_display: string;
  per_minute_cents: number;
  savings_pct: number;
  popular: boolean;
  best_value: boolean;
}

interface UsageAlertData {
  level: string;
  pct_used: number;
  minutes_remaining: number;
  days_remaining: number;
  projected_overage_minutes: number;
  projected_overage_cost_cents: number;
  upsell: {
    current_tier: string;
    recommended_tier: string;
    current_price: number;
    recommended_price: number;
    savings: number;
    reason: string;
  } | null;
}

type CancelStep = 0 | 1 | 2 | 3 | 4;
type PauseStep = 0 | 1;

const defaultUsage = { minutes_used: 0, minutes_limit: 0, calls: 0, leads: 0, estRevenue: 0 };

function formatPlanSubscriptionLine(planId: PlanId): string {
  const slug = planSlugFromUiPlanId(planId);
  const label = PLAN_DISPLAY_NAMES[slug];
  const priceDollars = (BILLING_PLANS[slug]?.monthlyPrice ?? 14700) / 100;
  return `${label} Plan — $${priceDollars}/mo`;
}

export default function AppSettingsBillingPage() {
  const tNav = useTranslations("nav");
  const tBilling = useTranslations("billing");
  const [cancelStep, setCancelStep] = useState<CancelStep>(0);
  const [usage, setUsage] = useState(defaultUsage);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  /* Restore from sync snapshot AFTER hydration */
  useEffect(() => {
    try {
      const snapshot = getWorkspaceMeSnapshotSync() as { id?: string | null; stats?: typeof defaultUsage } | null;
      if (snapshot?.stats && typeof snapshot.stats === "object") {
        setUsage({ ...defaultUsage, ...snapshot.stats });
      }
      if (snapshot && typeof snapshot.id === "string") {
        setWorkspaceId(snapshot.id);
      }
    } catch { /* ignore */ }
  }, []);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [renewalAt, setRenewalAt] = useState<string | null>(null);
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [pendingEffectiveAt, setPendingEffectiveAt] = useState<string | null>(null);
  const [downgradeWarning, setDowngradeWarning] = useState<string | null>(null);
  const [dunning, setDunning] = useState<{
    amount_due_cents: number;
    currency: string;
    next_retry_at: string | null;
    failure_count: number;
  } | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>("starter");
  const [planChangeOpen, setPlanChangeOpen] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [pauseStep, setPauseStep] = useState<PauseStep>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingError, setBillingError] = useState(false);
  const [minutePacks, setMinutePacks] = useState<MinutePack[]>([]);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);
  const [usageAlert, setUsageAlert] = useState<UsageAlertData | null>(null);
  const [bonusMinutes, setBonusMinutes] = useState(0);
  const [planChanging, setPlanChanging] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    document.title = tBilling("pageTitle");
  }, [tBilling]);

  // Fetch available minute packs
  const [minutePackError, setMinutePackError] = useState<string | null>(null);
  useEffect(() => {
    setMinutePackError(null);
    fetch("/api/billing/buy-minutes")
      .then((res) => res.json())
      .then((data: { ok?: boolean; packs?: MinutePack[] }) => {
        if (data?.packs) setMinutePacks(data.packs);
      })
      .catch((err) => {
        setMinutePackError("Unable to load minute packs. Try refreshing.");
        console.error("[billing] minute packs fetch failed:", err?.message ?? err);
      });
  }, []);

  // Handle minute pack purchase
  const handleBuyMinutes = useCallback(async (packId: string) => {
    if (!workspaceId || buyingPack) return;
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/billing/buy-minutes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, pack_id: packId }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; checkout_url?: string; reason?: string } | null;
      if (data?.url || data?.checkout_url) {
        window.location.href = data.url ?? data.checkout_url ?? "";
      } else if (data?.reason === "subscription_required") {
        setToast("An active subscription is required to purchase minutes.");
      } else if (data?.reason === "missing_env" || res.status === 503) {
        setToast("Billing is being configured. Please try again shortly.");
      } else {
        setToast("Could not start purchase. Please try again.");
      }
    } catch {
      setToast(tBilling("errors.purchaseFailed", { defaultValue: "Could not start purchase. Please try again." }));
    } finally {
      setBuyingPack(null);
    }
  }, [workspaceId, buyingPack, tBilling]);

  const [redirectReason, setRedirectReason] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("plan_changed") === "1") setToast(tBilling("toast.planUpdated"));
    const minutesPurchased = searchParams.get("minutes_purchased");
    if (minutesPurchased) setToast(tBilling("toast.minutesAdded", { minutes: minutesPurchased }));
    const reason = searchParams.get("reason");
    if (reason) setRedirectReason(reason);
  }, [searchParams, tBilling]);

  // Combined billing loader: fetches workspace → billing status in one chain.
  // Used for both initial load and Retry button.
  const loadBillingData = useCallback(async () => {
    setBillingError(false);
    try {
      // Step 1: get workspace ID
      let wsId = workspaceId;
      if (!wsId) {
        const wsData = await fetchWorkspaceMeCached({ force: true });
        wsId = (wsData as { id?: string | null } | null)?.id ?? null;
        if (wsId) setWorkspaceId(wsId);
        if ((wsData as Record<string, unknown> | null)?.stats) {
          setUsage((wsData as Record<string, unknown>).stats as typeof defaultUsage);
        }
      }
      setLoading(false);
      if (!wsId) {
        // No workspace — show trial fallback, not skeleton
        return;
      }
      // Step 2: fetch billing status
      const res = await fetch(`/api/billing/status?workspace_id=${encodeURIComponent(wsId)}`, { credentials: "include" });
      if (!res.ok) { setBillingError(true); return; }
      const data = await res.json() as Record<string, unknown>;
      if (!data) { setBillingError(true); return; }
      setBillingStatus((data.billing_status as string) ?? "trial");
      setRenewalAt((data.renewal_at as string) ?? null);
      setPendingTier((data.pending_billing_tier as string) ?? null);
      setPendingEffectiveAt((data.pending_billing_effective_at as string) ?? null);
      setDowngradeWarning((data.downgrade_warning as string) ?? null);
      setDunning(
        data.dunning
          ? {
              amount_due_cents: (data.dunning as Record<string, unknown>).amount_due_cents as number ?? 0,
              currency: ((data.dunning as Record<string, unknown>).currency as string ?? "usd").toLowerCase(),
              next_retry_at: (data.dunning as Record<string, unknown>).next_retry_at as string ?? null,
              failure_count: (data.dunning as Record<string, unknown>).failure_count as number ?? 0,
            }
          : null,
      );
      if (typeof data.minutes_used === "number") {
        setUsage((prev) => ({ ...prev, minutes_used: data.minutes_used as number, minutes_limit: (data.minutes_limit as number) ?? prev.minutes_limit }));
      }
      if (data.bonus_minutes != null) setBonusMinutes(data.bonus_minutes as number);
      if (data.usage_alert) setUsageAlert(data.usage_alert as UsageAlertData);
      setCurrentPlanId(planIdFromBillingTier((data.billing_tier as string) ?? null));
    } catch {
      setLoading(false);
      setBillingError(true);
    }
  }, [workspaceId]);

  // Initial load on mount
  useEffect(() => { loadBillingData(); }, [loadBillingData]);

  // Safety timeout: if billing status hasn't loaded in 10s, force error state
  useEffect(() => {
    if (billingStatus !== null || billingError) return;
    const timeout = window.setTimeout(() => {
      if (billingStatus === null && !billingError) setBillingError(true);
    }, 10000);
    return () => window.clearTimeout(timeout);
  }, [billingStatus, billingError]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handlePauseCoverage = async () => {
    setPauseStep(0);
    if (!workspaceId) return;
    setPausing(true);
    try {
      const res = await fetch("/api/billing/pause-coverage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      // Check response status before attempting to parse JSON
      if (!res.ok) {
        let errorMessage = tBilling("toast.pauseFailed");
        try {
          const _data = await res.json() as { message?: string; error?: string } | null;
        } catch {
          // If JSON parsing fails, use a generic message including status code
          if (res.status === 502) {
            errorMessage = tBilling("toast.stripeFailed") ?? "Billing service temporarily unavailable. Please try again later.";
          }
        }
        setToast(errorMessage);
        return;
      }

      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setBillingStatus("paused");
      setToast(data?.message ?? tBilling("toast.paused"));
      setCancelStep(0);
    } catch {
      setToast(tBilling("toast.pauseFailed"));
    } finally {
      setPausing(false);
    }
  };

  function formatBillingStatus(status: string | null): string {
    switch (status) {
      case "trial": return "Inactive";
      case "active": return "Active";
      case "trial_ended": return "Inactive";
      case "cancelled": return "Cancelled";
      case "paused": return "Paused";
      case "payment_failed": return "Payment Failed";
      default: return status ?? "—";
    }
  }

  function statusBadgeColor(status: string | null): string {
    switch (status) {
      case "active": return "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] dark:text-[var(--accent-primary)]";
      case "trial": return "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] dark:text-[var(--accent-primary)]";
      case "trial_ended": return "bg-[var(--accent-warning,#f59e0b)]/10 text-[var(--accent-warning,#f59e0b)] dark:text-[var(--accent-warning,#f59e0b)]";
      case "cancelled": return "bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)] dark:text-[var(--accent-danger,#ef4444)]";
      case "paused": return "bg-[var(--bg-inset)] text-[var(--text-secondary)]";
      case "payment_failed": return "bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)] dark:text-[var(--accent-danger,#ef4444)]";
      default: return "bg-[var(--bg-inset)] text-[var(--text-tertiary)]";
    }
  }

  if (loading && !workspaceId) {
    return (
      <div className="max-w-[600px] mx-auto p-4 md:p-6">
        <Breadcrumbs items={[{ label: tNav("settings"), href: "/app/settings" }, { label: tNav("billing") }]} />
        <h1 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-4">{tNav("billing")}</h1>
        <div className="skeleton-shimmer space-y-3">
          <div className="h-20 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]" />
          <div className="h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] w-1/2" />
          <div className="h-32 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: tNav("settings"), href: "/app/settings" }, { label: tNav("billing") }]} />
      <h1 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)]">{tNav("billing")}</h1>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed mb-4">{tBilling("subtitle", { defaultValue: "Manage your plan, usage, and payment method." })}</p>
      {billingStatus === "trial" && (
        <div className="p-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm mb-4 flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] text-sm font-bold">!</div>
          <div>
            <p className="font-semibold text-[var(--accent-primary)]">{tBilling("trial.title", { defaultValue: "Choose a plan to get started" })}</p>
            <p className="mt-1 text-[var(--accent-primary)]/80">{tBilling("trial.description", { defaultValue: "Subscribe to a plan to keep your operators running after the trial ends. Your data and configuration will be preserved." })}</p>
          </div>
        </div>
      )}
      {billingError && (
        <div className="p-4 rounded-xl border border-[var(--accent-warning,#f59e0b)]/20 bg-[var(--accent-warning,#f59e0b)]/10 text-[var(--accent-warning,#f59e0b)] text-sm mb-4">
          <p className="font-medium">{tBilling("errors.loadingFailed")}</p>
          <p className="mt-1 text-[var(--accent-warning,#f59e0b)]/80">{tBilling("errors.loadingFailedDesc")}</p>
          <Link href="/app/settings" className="inline-block mt-2 text-sm font-medium underline underline-offset-2">{tBilling("backToSettingsLink")}</Link>
        </div>
      )}
      {redirectReason === "phone_purchase" && (
        <div className="p-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm mb-4">
          <p className="font-semibold text-[var(--accent-primary)]">{tBilling("phonePurchase.title")}</p>
          <p className="mt-1">{tBilling("phonePurchase.description")}</p>
        </div>
      )}
      {redirectReason === "subscription_required" && (
        <div className="p-4 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm mb-4">
          <p className="font-semibold">{tBilling("subscriptionRequired.title")}</p>
          <p className="mt-1">{tBilling("subscriptionRequired.description")}</p>
        </div>
      )}
      {billingStatus === "payment_failed" && dunning && (
        <div className="p-4 rounded-xl border border-[var(--accent-danger,#ef4444)]/30 bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)] text-sm mb-4">
          <p className="font-semibold">{tBilling("paymentFailedBanner")}</p>
          <p className="mt-1 text-[var(--accent-danger,#ef4444)]/80">{tBilling("paymentFailedDescription")}</p>
          <p className="mt-2 text-xs text-[var(--accent-danger,#ef4444)]/70">
            {tBilling("amountDue")} {(dunning.amount_due_cents / 100).toLocaleString(undefined, {
              style: "currency",
              currency: (dunning.currency || "usd").toUpperCase(),
            })}
          </p>
          <p className="mt-1 text-xs text-[var(--accent-danger,#ef4444)]/70">
            {tBilling("retryAttempts")}: {dunning.failure_count}
            {dunning.next_retry_at ? ` · ${tBilling("nextRetry")}: ${new Date(dunning.next_retry_at).toLocaleString()}` : ""}
          </p>
          <button
            type="button"
            onClick={async () => {
              if (!workspaceId) return;
              try {
                const res = await fetch("/api/billing/portal", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workspace_id: workspaceId, return_url: window.location.href }),
                });
                if (!res.ok) { setToast(tBilling("toast.paymentFailed")); return; }
                const data = (await res.json().catch(() => null)) as { url?: string } | null;
                if (data?.url) window.location.href = data.url;
                else setToast(tBilling("toast.paymentFailed"));
              } catch {
                setToast(tBilling("toast.paymentFailed"));
              }
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {tBilling("updatePaymentMethod")}
          </button>
        </div>
      )}
      {pendingTier && (
        <div className="p-4 rounded-xl border border-[var(--accent-warning,#f59e0b)]/20 bg-[var(--accent-warning,#f59e0b)]/10 text-[var(--accent-warning,#f59e0b)]/70 text-sm mb-4">
          <p className="font-medium">
            {tBilling("downgradeScheduled", { date: pendingEffectiveAt ? new Date(pendingEffectiveAt).toLocaleDateString() : "your next billing date" })}
          </p>
          {downgradeWarning && <p className="mt-1 text-[var(--accent-warning,#f59e0b)]/80/90">{downgradeWarning}</p>}
        </div>
      )}
      <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
        {billingStatus !== null ? (
          <>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {tBilling("planDisplay", {
                plan: PLAN_DISPLAY_NAMES[planSlugFromUiPlanId(currentPlanId)],
                price: String((BILLING_PLANS[planSlugFromUiPlanId(currentPlanId)]?.monthlyPrice ?? 14700) / 100),
              })}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {tBilling("minutesUsed", { used: usage.minutes_used, limit: usage.minutes_limit })}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
              Automates manual follow-up, scheduling, and lead management
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2">
              {tBilling("status")}
              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeColor(billingStatus)}`}>
                {formatBillingStatus(billingStatus)}
              </span>{renewalAt ? <span className="ml-1"> · {tBilling("renews")} {new Date(renewalAt).toLocaleDateString()}</span> : null}
            </p>
          </>
        ) : billingError ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{formatPlanSubscriptionLine(currentPlanId)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Could not load billing details right now.</p>
            </div>
            <button
              type="button"
              onClick={() => { loadBillingData(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : !loading && !workspaceId ? (
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{formatPlanSubscriptionLine(currentPlanId)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">{tBilling("trial.title", { defaultValue: "Choose a plan to get started" })}</span>
            </p>
          </div>
        ) : (
          <div className="skeleton-shimmer space-y-2">
            <div className="h-4 w-48 bg-[var(--bg-inset)] rounded" />
            <div className="h-3 w-32 bg-[var(--bg-inset)] rounded" />
            <div className="h-3 w-40 bg-[var(--bg-inset)] rounded" />
          </div>
        )}
      </div>
      {/* Minutes usage bar */}
      {(billingStatus !== null || billingError || (!loading && !workspaceId)) && (
        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">{tBilling("minutesUsage")}</p>
            <span className="text-xs text-[var(--text-tertiary)]">
              {usage.minutes_used} / {usage.minutes_limit} min
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--bg-inset)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] ${
                usage.minutes_limit > 0 && usage.minutes_used / usage.minutes_limit > 0.8
                  ? "bg-[var(--accent-warning,#f59e0b)]"
                  : "bg-[var(--accent-primary)]"
              }`}
              style={{ width: `${Math.min(100, usage.minutes_limit > 0 ? (usage.minutes_used / usage.minutes_limit) * 100 : 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
            {tBilling("usedThisPeriod", { pct: usage.minutes_limit > 0 ? Math.round((usage.minutes_used / usage.minutes_limit) * 100) : 0 })}
          </p>
          {usage.minutes_limit > 0 && usage.minutes_used / usage.minutes_limit > 0.8 && (
            <button
              type="button"
              onClick={() => setPlanChangeOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-warning,#f59e0b)] text-[var(--text-on-accent)] hover:bg-[var(--accent-warning,#f59e0b)]/80 transition-[background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
            >
              {tBilling("upgradeForMore")}
            </button>
          )}
        </div>
      )}
      {/* ROI Insights Section */}
      {(billingStatus !== null || billingError || (!loading && !workspaceId)) && usage.calls > 0 && (
        <div className="p-4 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 mb-4">
          <p className="text-sm font-semibold text-[var(--accent-primary)] mb-3 flex items-center gap-2">
            <span className="text-lg">💰</span> {tBilling("roiTitle", { defaultValue: "Platform Return on Investment" })}
          </p>
          <div className="space-y-3">
            {/* Platform ROI */}
            <div className="bg-[var(--accent-primary)]/5 rounded-lg p-3 border border-[var(--accent-primary)]/20">
              <p className="text-[11px] font-medium text-[var(--accent-primary)]/80 uppercase tracking-wide">Platform ROI</p>
              <p className="text-xs text-[var(--accent-primary)] mt-1.5">
                {usage.estRevenue > 0 ? (() => {
                  const planSlug = planSlugFromUiPlanId(currentPlanId);
                  const monthlyPrice = BILLING_PLANS[planSlug]?.monthlyPrice ?? 14700;
                  const roi = usage.estRevenue / (monthlyPrice / 100);
                  return (
                    <>
                      <span className="font-semibold text-[var(--accent-primary)]">
                        {roi.toFixed(1)}x
                      </span>
                      {" return on your platform investment"}
                    </>
                  );
                })() : (
                  "Start making calls to see your return on investment"
                )}
              </p>
            </div>

            {/* What This Plan Includes */}
            <div className="bg-[var(--accent-primary)]/5 rounded-lg p-3 border border-[var(--accent-primary)]/20">
              <p className="text-[11px] font-medium text-[var(--accent-primary)] uppercase tracking-wide">What's Included</p>
              <p className="text-xs text-[var(--accent-primary)] mt-1.5">
                Automated follow-up, call scheduling, and intelligent lead management
              </p>
            </div>

            {/* Efficiency Metric */}
            {usage.calls > 0 && (
              <div className="bg-[var(--accent-primary)]/5 rounded-lg p-3 border border-[var(--accent-primary)]/20">
                <p className="text-[11px] font-medium text-[var(--accent-primary)] uppercase tracking-wide">Cost Per Call</p>
                <p className="text-xs text-[var(--accent-primary)] mt-1.5">
                  <span className="font-semibold text-[var(--accent-primary)]">
                    ${(() => {
                      const planSlug = planSlugFromUiPlanId(currentPlanId);
                      const monthlyDollars = (BILLING_PLANS[planSlug]?.monthlyPrice ?? 14700) / 100;
                      return (monthlyDollars / Math.max(1, usage.calls)).toFixed(2);
                    })()}
                  </span>
                  {" per call handled (plan ÷ calls this period)"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Alert Banner */}
      {usageAlert && usageAlert.level !== "healthy" && (
        <div className={`p-4 rounded-xl border mb-4 ${
          usageAlert.level === "overage" || usageAlert.level === "critical"
            ? "border-[var(--accent-danger,#ef4444)]/20 bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)]"
            : usageAlert.level === "warning"
              ? "border-[var(--accent-warning,#f59e0b)]/20 bg-[var(--accent-warning,#f59e0b)]/10 text-[var(--accent-warning,#f59e0b)]"
              : "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
        }`}>
          <p className="text-sm font-medium">
            {usageAlert.level === "overage"
              ? tBilling("alertOverage", { minutes: usageAlert.projected_overage_minutes })
              : usageAlert.level === "critical"
                ? tBilling("alertCritical", { pct: usageAlert.pct_used.toFixed(0), remaining: usageAlert.minutes_remaining })
                : tBilling("alertWarning", { pct: usageAlert.pct_used.toFixed(0), days: usageAlert.days_remaining })}
          </p>
          {usageAlert.projected_overage_cost_cents > 0 && (
            <p className="text-xs mt-1 opacity-80">
              {tBilling("projectedOverage", { amount: (usageAlert.projected_overage_cost_cents / 100).toFixed(2) })}
            </p>
          )}
          {usageAlert.upsell && (
            <p className="text-xs mt-1 opacity-80">
              {usageAlert.upsell.reason}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            {minutePacks.length > 0 && (
              <button
                type="button"
                onClick={() => document.getElementById("minute-packs-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
              >
                {tBilling("buyMoreMinutes")}
              </button>
            )}
            {usageAlert.upsell && (
              <button
                type="button"
                onClick={() => setPlanChangeOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                {tBilling("upgradeTo", { tier: usageAlert.upsell.recommended_tier })}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Bonus Minutes Display */}
      {bonusMinutes > 0 && (
        <div className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
          <p className="text-xs text-[var(--text-secondary)]">
            {tBilling("bonusMinutes", { count: bonusMinutes.toLocaleString() })}
          </p>
        </div>
      )}
      {/* Buy More Minutes Section */}
      {minutePackError && (
        <div className="p-4 rounded-xl border border-[var(--accent-danger,#ef4444)]/20 bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)] text-sm mb-4">
          {minutePackError}
        </div>
      )}
      {minutePacks.length > 0 && (
        <div id="minute-packs-section" className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{tBilling("expandAgentCapacity", { defaultValue: "Expand Agent Capacity" })}</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            {tBilling("minutePacksDesc")}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {minutePacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => handleBuyMinutes(pack.id)}
                disabled={buyingPack !== null}
                className={`relative text-left p-3 rounded-xl border transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] ${
                  pack.popular
                    ? "border-[var(--border-medium)] bg-[var(--bg-inset)] ring-1 ring-[var(--border-default)]"
                    : pack.best_value
                      ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5"
                      : "border-[var(--border-default)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]"
                } ${buyingPack === pack.id ? "opacity-60" : "cursor-pointer"}`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 right-2 px-2 py-0.5 text-[9px] uppercase tracking-wide bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-full font-bold">{tBilling("popular")}</span>
                )}
                {pack.best_value && (
                  <span className="absolute -top-2 right-2 px-2 py-0.5 text-[9px] uppercase tracking-wide bg-[var(--accent-primary)] text-white rounded-full font-bold">{tBilling("bestValue")}</span>
                )}
                <p className="text-[var(--text-primary)] font-bold text-sm">{pack.minutes.toLocaleString()} min</p>
                <p className="text-[var(--text-primary)] text-lg font-bold mt-0.5">{pack.price_display}</p>
                <p className="text-[var(--text-tertiary)] text-[10px] mt-1">
                  ${(pack.per_minute_cents / 100).toFixed(3)}/min
                  {pack.savings_pct > 0 && ` · ${pack.savings_pct}${tBilling("percentOff")}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setPlanChangeOpen(true)}
        disabled={planChanging}
        className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-secondary)] mb-4 block hover:bg-[var(--bg-inset)]/50 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="billing-change-plan"
        aria-haspopup="dialog"
        aria-expanded={planChangeOpen}
      >
        {planChanging ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {tBilling("changingPlan")}
          </span>
        ) : (
          tBilling("changePlan")
        )}
      </button>
      <PlanChangeModal
        currentPlanId={currentPlanId}
        isOpen={planChangeOpen}
        onClose={() => setPlanChangeOpen(false)}
        onSuccess={(_, message) => {
          const successMessage = message ?? tBilling("toast.planUpdated");
          setToast(successMessage);
          setPlanChangeOpen(false);
          setPlanChanging(false);
        }}
        workspaceId={workspaceId}
      />
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)]/40 p-3 mb-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1.5">
            {tBilling("paymentMethod")}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>{tBilling("securityNote", { defaultValue: "Payments are processed securely by Stripe. We never store your card details." })}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!workspaceId) return;
              try {
                const res = await fetch("/api/billing/portal", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workspace_id: workspaceId, return_url: window.location.href }),
                });
                if (!res.ok) { setToast(tBilling("toast.paymentFailed")); return; }
                const data = (await res.json().catch(() => null)) as { url?: string } | null;
                if (data?.url) window.location.href = data.url;
                else setToast(tBilling("toast.paymentFailed"));
              } catch { setToast(tBilling("toast.paymentFailed")); }
            }}
            className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
          >
            {tBilling("update")}
          </button>
        </div>
      <p className="text-sm text-[var(--text-tertiary)] mb-2">{tBilling("invoiceHistory")}</p>
      <div className="rounded-xl border border-[var(--border-default)] p-3 mb-6">
        <p className="text-xs text-[var(--text-secondary)] mb-2">{tBilling("invoiceDesc")}</p>
        <button
          type="button"
          onClick={async () => {
            if (!workspaceId) return;
            try {
              const res = await fetch("/api/billing/portal", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace_id: workspaceId, return_url: window.location.href }),
              });
              if (!res.ok) { setToast(tBilling("toast.portalFailed")); return; }
              const data = (await res.json().catch(() => null)) as { url?: string } | null;
              if (data?.url) window.location.href = data.url;
              else setToast(tBilling("toast.portalFailed"));
            } catch { setToast(tBilling("toast.portalFailed")); }
          }}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
        >
          {tBilling("viewInvoices")}
        </button>
      </div>
      {/* Trust strip */}
      <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)] mb-4 py-2">
        <span className="flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>256-bit SSL</span>
        <span className="flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>PCI DSS</span>
        <span className="flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Encrypted</span>
        <span className="flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>GDPR</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setPauseStep(1)} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-tertiary)] disabled:opacity-60 hover:bg-[var(--bg-inset)]/50 transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]" title="Pause your subscription temporarily while keeping your data safe">{pausing ? tBilling("pausing") : tBilling("pauseAccount")}</button>
        <button
          type="button"
          onClick={() => setCancelStep(1)}
          className="px-4 py-2 rounded-xl text-sm border border-[var(--accent-danger,#ef4444)]/30 text-[var(--accent-danger,#ef4444)] hover:bg-[var(--accent-danger,#ef4444)]/10"
          title="Cancel your subscription permanently"
        >
          {tBilling("cancel")}
        </button>
      </div>

      {pauseStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setPauseStep(0)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tBilling("pauseTitle")}</h2>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              {tBilling("pauseDesc")}
            </p>
            <div className="bg-[var(--bg-inset)] rounded-lg p-3 mb-4 text-xs text-[var(--text-secondary)] space-y-1">
              <p>{tBilling("whenYouPause")}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{tBilling("pauseBullet1")}</li>
                <li>{tBilling("pauseBullet2")}</li>
                <li>{tBilling("pauseBullet3")}</li>
              </ul>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setPauseStep(0)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("cancel")}</button>
              <button type="button" onClick={() => { void handlePauseCoverage(); }} disabled={pausing} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium disabled:opacity-60 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{pausing ? tBilling("pausing") : tBilling("pause")}</button>
            </div>
          </div>
        </div>
      )}

      {cancelStep >= 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setCancelStep(0)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            {cancelStep === 1 && (
              <>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tBilling("beforeYouGo")}</h2>
                <p className="text-sm text-[var(--text-tertiary)] mb-4">
                  {tBilling("beforeYouGoDesc", { leads: usage.leads, revenue: usage.estRevenue.toLocaleString() })}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("stay")}</button>
                  <button type="button" onClick={() => setCancelStep(2)} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("continueCancel")}</button>
                </div>
              </>
            )}
            {cancelStep === 2 && (
              <>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tBilling("pauseInstead")}</h2>
                <p className="text-sm text-[var(--text-tertiary)] mb-4">
                  {tBilling("pauseInsteadDesc")}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(3)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("noContinue")}</button>
                  <button type="button" onClick={() => { void handlePauseCoverage(); }} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium disabled:opacity-60 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{pausing ? tBilling("pausing") : tBilling("pauseFor30Days")}</button>
                </div>
              </>
            )}
            {cancelStep === 3 && (
              <>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tBilling("downgradeTitle")}</h2>
                <p className="text-sm text-[var(--text-tertiary)] mb-4">
                  {tBilling("downgradeDesc")}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(4)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("noCancel")}</button>
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("keepStarter")}</button>
                </div>
              </>
            )}
            {cancelStep === 4 && (
              <>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tBilling("sorryToSeeYouGo")}</h2>
                <p className="text-sm text-[var(--text-tertiary)] mb-4">
                  {tBilling("sorryDesc")}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("back")}</button>
                  <button type="button" onClick={() => { void handlePauseCoverage(); setCancelStep(0); }} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-danger,#ef4444)] text-white font-medium disabled:opacity-60 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{pausing ? tBilling("pausing") : tBilling("confirmCancel")}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300 ${
          toast.includes("updated") || toast.includes("success") || toast.includes("paused") || toast.includes("added")
            ? "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)]"
            : "bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-primary)]"
        }`}>
          {(toast.includes("updated") || toast.includes("success") || toast.includes("paused") || toast.includes("added")) ? (
            <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)] flex-shrink-0">✓</span>
          ) : null}
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tBilling("backToSettingsLink")}</Link></p>
    </div>
  );
}
