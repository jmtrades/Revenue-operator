"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useSearchParams } from "next/navigation";
import { fetchWorkspaceMeCached, getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { PlanChangeModal, type PlanId } from "@/components/PlanChangeModal";

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

const defaultUsage = { minutes_used: 0, minutes_limit: 500, calls: 0, leads: 0, estRevenue: 0 };

export default function AppSettingsBillingPage() {
  const tNav = useTranslations("nav");
  const tBilling = useTranslations("billing");
  const [cancelStep, setCancelStep] = useState<CancelStep>(0);
  const [usage, setUsage] = useState(() => {
    if (typeof window === "undefined") return defaultUsage;
    const snapshot = getWorkspaceMeSnapshotSync() as { stats?: typeof defaultUsage } | null;
    return snapshot?.stats && typeof snapshot.stats === "object"
      ? { ...defaultUsage, ...snapshot.stats }
      : defaultUsage;
  });
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const snapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
    return snapshot && typeof snapshot.id === "string" ? snapshot.id : null;
  });
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
  const searchParams = useSearchParams();

  useEffect(() => {
    document.title = tBilling("pageTitle");
  }, [tBilling]);

  // Fetch available minute packs
  useEffect(() => {
    fetch("/api/billing/buy-minutes")
      .then((res) => res.json())
      .then((data: { ok?: boolean; packs?: MinutePack[] }) => {
        if (data?.packs) setMinutePacks(data.packs);
      })
      .catch((err) => console.error("[billing] Failed to load minute packs:", err));
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
      } else {
        setToast(data?.reason === "subscription_required" ? "An active subscription is required to purchase minutes." : "Could not start purchase. Please try again.");
      }
    } catch {
      setToast("Could not start purchase. Please try again.");
    } finally {
      setBuyingPack(null);
    }
  }, [workspaceId, buyingPack]);

  useEffect(() => {
    if (searchParams.get("plan_changed") === "1") setToast(tBilling("toast.planUpdated"));
    const minutesPurchased = searchParams.get("minutes_purchased");
    if (minutesPurchased) setToast(`${minutesPurchased} minutes added to your account!`);
  }, [searchParams, tBilling]);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: { id?: string | null; stats?: typeof defaultUsage } | null) => {
        setWorkspaceId(data?.id ?? null);
        if (data?.stats) setUsage(data.stats as typeof defaultUsage);
      })
      .catch((err) => console.error("[billing] Failed to load workspace data:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    const controller = new AbortController();
    setBillingError(false);
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          setBillingError(true);
          return null;
        }
        return res.json();
      })
      .then((data: {
        billing_status?: string;
        renewal_at?: string | null;
        billing_tier?: string;
        minutes_used?: number;
        minutes_limit?: number;
        pending_billing_tier?: string | null;
        pending_billing_effective_at?: string | null;
        downgrade_warning?: string | null;
        dunning?: {
          amount_due_cents?: number;
          currency?: string;
          next_retry_at?: string | null;
          failure_count?: number;
        } | null;
      } | null) => {
        if (!data || controller.signal.aborted) return;
        setBillingStatus(data?.billing_status ?? "trial");
        setRenewalAt(data?.renewal_at ?? null);
        setPendingTier(data?.pending_billing_tier ?? null);
        setPendingEffectiveAt(data?.pending_billing_effective_at ?? null);
        setDowngradeWarning(data?.downgrade_warning ?? null);
        setDunning(
          data?.dunning
            ? {
                amount_due_cents: data.dunning.amount_due_cents ?? 0,
                currency: (data.dunning.currency ?? "usd").toLowerCase(),
                next_retry_at: data.dunning.next_retry_at ?? null,
                failure_count: data.dunning.failure_count ?? 0,
              }
            : null,
        );
        if (typeof data.minutes_used === "number") {
          setUsage((prev) => ({ ...prev, minutes_used: data.minutes_used ?? prev.minutes_used, minutes_limit: data.minutes_limit ?? prev.minutes_limit }));
        }
        if ((data as Record<string, unknown>).bonus_minutes != null) {
          setBonusMinutes((data as Record<string, unknown>).bonus_minutes as number);
        }
        if ((data as Record<string, unknown>).usage_alert) {
          setUsageAlert((data as Record<string, unknown>).usage_alert as UsageAlertData);
        }
        const tier = (data as { billing_tier?: string })?.billing_tier?.toLowerCase();
        if (tier === "solo" || tier === "starter") setCurrentPlanId("starter");
        else if (tier === "growth") setCurrentPlanId("growth");
        else if (tier === "team" || tier === "scale") setCurrentPlanId("scale");
      })
      .catch((err) => {
        if ((err as Error)?.name !== "AbortError") setBillingError(true);
      });
    return () => controller.abort();
  }, [workspaceId]);

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
          const data = await res.json() as { message?: string; error?: string } | null;
          if (data?.error) {
            errorMessage = data.error;
          }
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

  if (loading && !workspaceId) {
    return (
      <div className="max-w-[600px] mx-auto p-4 md:p-6">
        <Breadcrumbs items={[{ label: tNav("settings"), href: "/app/settings" }, { label: tNav("billing") }]} />
        <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{tNav("billing")}</h1>
        <div className="animate-pulse space-y-3">
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
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{tNav("billing")}</h1>
      {billingError && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm mb-4">
          <p className="font-medium">{tBilling("errors.loadingFailed")}</p>
          <p className="mt-1 text-amber-200/80">{tBilling("errors.loadingFailedDesc")}</p>
          <Link href="/app/settings" className="inline-block mt-2 text-sm font-medium underline underline-offset-2">{tBilling("backToSettingsLink")}</Link>
        </div>
      )}
      {billingStatus === "payment_failed" && dunning && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 text-sm mb-4">
          <p className="font-semibold">Payment failed. Billing needs attention.</p>
          <p className="mt-1">
            Amount due: {(dunning.amount_due_cents / 100).toLocaleString(undefined, {
              style: "currency",
              currency: (dunning.currency || "usd").toUpperCase(),
            })}.
          </p>
          <p className="mt-1">
            Retry attempts: {dunning.failure_count}
            {dunning.next_retry_at ? ` · Next retry: ${new Date(dunning.next_retry_at).toLocaleString()}` : ""}
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
            className="mt-3 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90"
          >
            Update Payment Method
          </button>
        </div>
      )}
      {pendingTier && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100 text-sm mb-4">
          <p className="font-medium">
            Plan downgrade scheduled for {pendingEffectiveAt ? new Date(pendingEffectiveAt).toLocaleDateString() : "your next billing date"}.
          </p>
          {downgradeWarning && <p className="mt-1 text-amber-200/90">{downgradeWarning}</p>}
        </div>
      )}
      <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
        {billingStatus === null ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-48 bg-[var(--bg-inset)] rounded" />
            <div className="h-3 w-32 bg-[var(--bg-inset)] rounded" />
            <div className="h-3 w-40 bg-[var(--bg-inset)] rounded" />
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-[var(--text-primary)]">{tBilling("planDisplay", { plan: String(currentPlanId) === "starter" || String(currentPlanId) === "solo" ? "Starter" : String(currentPlanId) === "growth" || String(currentPlanId) === "business" ? "Growth" : String(currentPlanId) === "scale" ? "Business" : String(currentPlanId) === "enterprise" ? "Agency" : "Starter", price: String(currentPlanId) === "starter" || String(currentPlanId) === "solo" ? "97" : String(currentPlanId) === "growth" || String(currentPlanId) === "business" ? "297" : String(currentPlanId) === "scale" ? "597" : String(currentPlanId) === "enterprise" ? "997" : "97" })}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {tBilling("minutesUsed", { used: usage.minutes_used, limit: usage.minutes_limit })}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {tBilling("status")} {billingStatus}{renewalAt ? ` · ${tBilling("renews")} ${new Date(renewalAt).toLocaleDateString()}` : ""}
            </p>
          </>
        )}
      </div>
      {/* Minutes usage bar */}
      {billingStatus !== null && (
        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">Minutes Usage</p>
            <span className="text-xs text-[var(--text-tertiary)]">
              {usage.minutes_used} / {usage.minutes_limit} min
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--bg-inset)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usage.minutes_limit > 0 && usage.minutes_used / usage.minutes_limit > 0.8
                  ? "bg-amber-500"
                  : "bg-[var(--accent-primary)]"
              }`}
              style={{ width: `${Math.min(100, usage.minutes_limit > 0 ? (usage.minutes_used / usage.minutes_limit) * 100 : 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
            {usage.minutes_limit > 0 ? Math.round((usage.minutes_used / usage.minutes_limit) * 100) : 0}% used this billing period
          </p>
          {usage.minutes_limit > 0 && usage.minutes_used / usage.minutes_limit > 0.8 && (
            <button
              type="button"
              onClick={() => setPlanChangeOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
            >
              Upgrade for more minutes
            </button>
          )}
        </div>
      )}
      {/* Usage Alert Banner */}
      {usageAlert && usageAlert.level !== "healthy" && (
        <div className={`p-4 rounded-xl border mb-4 ${
          usageAlert.level === "overage" || usageAlert.level === "critical"
            ? "border-red-500/30 bg-red-500/10 text-red-100"
            : usageAlert.level === "warning"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
              : "border-blue-500/30 bg-blue-500/10 text-blue-100"
        }`}>
          <p className="text-sm font-medium">
            {usageAlert.level === "overage"
              ? `You've exceeded your plan limit by ${usageAlert.projected_overage_minutes} minutes.`
              : usageAlert.level === "critical"
                ? `${usageAlert.pct_used.toFixed(0)}% of minutes used — ${usageAlert.minutes_remaining} minutes remaining.`
                : `${usageAlert.pct_used.toFixed(0)}% of minutes used this period. ~${usageAlert.days_remaining} days left.`}
          </p>
          {usageAlert.projected_overage_cost_cents > 0 && (
            <p className="text-xs mt-1 opacity-80">
              Projected overage: ~${(usageAlert.projected_overage_cost_cents / 100).toFixed(2)} at current rate.
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
                Buy More Minutes
              </button>
            )}
            {usageAlert.upsell && (
              <button
                type="button"
                onClick={() => setPlanChangeOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                Upgrade to {usageAlert.upsell.recommended_tier}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Bonus Minutes Display */}
      {bonusMinutes > 0 && (
        <div className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Bonus minutes from purchased packs: <span className="text-[var(--text-primary)] font-medium">{bonusMinutes.toLocaleString()} min</span>
          </p>
        </div>
      )}
      {/* Buy More Minutes Section */}
      {minutePacks.length > 0 && (
        <div id="minute-packs-section" className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Buy More Minutes</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            One-time minute packs — use them anytime, no expiration. Bonus minutes are used before overage billing.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {minutePacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => handleBuyMinutes(pack.id)}
                disabled={buyingPack !== null}
                className={`relative text-left p-3 rounded-xl border transition-all ${
                  pack.popular
                    ? "border-[var(--border-medium)] bg-[var(--bg-inset)] ring-1 ring-[var(--border-default)]"
                    : pack.best_value
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-[var(--border-default)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]"
                } ${buyingPack === pack.id ? "opacity-60" : "cursor-pointer"}`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 right-2 px-2 py-0.5 text-[9px] uppercase tracking-wide bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-full font-bold">Popular</span>
                )}
                {pack.best_value && (
                  <span className="absolute -top-2 right-2 px-2 py-0.5 text-[9px] uppercase tracking-wide bg-emerald-500 text-white rounded-full font-bold">Best Value</span>
                )}
                <p className="text-[var(--text-primary)] font-bold text-sm">{pack.minutes.toLocaleString()} min</p>
                <p className="text-[var(--text-primary)] text-lg font-bold mt-0.5">{pack.price_display}</p>
                <p className="text-[var(--text-tertiary)] text-[10px] mt-1">
                  ${(pack.per_minute_cents / 100).toFixed(3)}/min
                  {pack.savings_pct > 0 && ` · ${pack.savings_pct}% off`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setPlanChangeOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-secondary)] mb-4 block hover:bg-[var(--bg-inset)]/50"
        data-testid="billing-change-plan"
        aria-haspopup="dialog"
        aria-expanded={planChangeOpen}
      >
        {tBilling("changePlan")}
      </button>
      <PlanChangeModal
        currentPlanId={currentPlanId}
        isOpen={planChangeOpen}
        onClose={() => setPlanChangeOpen(false)}
        onSuccess={(_, message) => setToast(message ?? tBilling("toast.planUpdated"))}
        workspaceId={workspaceId}
      />
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {tBilling("paymentMethod")}{" "}
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
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-2"
          >
            {tBilling("update")}
          </button>
        </p>
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
      <div className="flex gap-2">
        <button type="button" onClick={() => setPauseStep(1)} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-[var(--text-tertiary)] disabled:opacity-60 hover:bg-[var(--bg-inset)]/50">{pausing ? tBilling("pausing") : tBilling("pauseAccount")}</button>
        <button
          type="button"
          onClick={() => setCancelStep(1)}
          className="px-4 py-2 rounded-xl text-sm border border-[var(--accent-red)]/30 text-[var(--accent-red)]"
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
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setPauseStep(0)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)]">{tBilling("cancel")}</button>
              <button type="button" onClick={() => { void handlePauseCoverage(); }} disabled={pausing} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium disabled:opacity-60">{pausing ? tBilling("pausing") : tBilling("pause")}</button>
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
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)]">{tBilling("stay")}</button>
                  <button type="button" onClick={() => setCancelStep(2)} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium">{tBilling("continueCancel")}</button>
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
                  <button type="button" onClick={() => setCancelStep(3)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)]">{tBilling("noContinue")}</button>
                  <button type="button" onClick={() => { void handlePauseCoverage(); }} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium disabled:opacity-60">{pausing ? tBilling("pausing") : tBilling("pauseFor30Days")}</button>
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
                  <button type="button" onClick={() => setCancelStep(4)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)]">{tBilling("noCancel")}</button>
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium">{tBilling("keepStarter")}</button>
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
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-secondary)]">{tBilling("back")}</button>
                  <button type="button" onClick={() => { void handlePauseCoverage(); setCancelStep(0); }} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm bg-red-600 text-[var(--text-primary)] font-medium disabled:opacity-60">{pausing ? tBilling("pausing") : tBilling("confirmCancel")}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-lg text-sm text-[var(--text-primary)]">
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tBilling("backToSettingsLink")}</Link></p>
    </div>
  );
}
