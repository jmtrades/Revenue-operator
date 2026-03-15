"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useSearchParams } from "next/navigation";
import { fetchWorkspaceMeCached, getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { PlanChangeModal, type PlanId } from "@/components/PlanChangeModal";

type CancelStep = 0 | 1 | 2 | 3 | 4;
type PauseStep = 0 | 1;

const defaultUsage = { minutes_used: 0, minutes_limit: 400, calls: 0, leads: 0, estRevenue: 0 };

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
  const [billingStatus, setBillingStatus] = useState("trial");
  const [renewalAt, setRenewalAt] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>("starter");
  const [planChangeOpen, setPlanChangeOpen] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [pauseStep, setPauseStep] = useState<PauseStep>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingError, setBillingError] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    document.title = tBilling("pageTitle");
  }, [tBilling]);

  useEffect(() => {
    if (searchParams.get("plan_changed") === "1") setToast(tBilling("toast.planUpdated"));
  }, [searchParams, tBilling]);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: { id?: string | null; stats?: typeof defaultUsage } | null) => {
        setWorkspaceId(data?.id ?? null);
        if (data?.stats) setUsage(data.stats as typeof defaultUsage);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setBillingError(false);
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          setBillingError(true);
          return null;
        }
        return res.json();
      })
      .then((data: { billing_status?: string; renewal_at?: string | null; billing_tier?: string } | null) => {
        if (!data) return;
        setBillingStatus(data?.billing_status ?? "trial");
        setRenewalAt(data?.renewal_at ?? null);
        const tier = (data as { billing_tier?: string })?.billing_tier?.toLowerCase();
        if (tier === "solo" || tier === "starter") setCurrentPlanId("starter");
        else if (tier === "growth") setCurrentPlanId("growth");
        else if (tier === "team" || tier === "scale") setCurrentPlanId("scale");
      })
      .catch(() => setBillingError(true));
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
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setToast(data?.error ?? tBilling("toast.pauseFailed"));
        return;
      }
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
        <h1 className="text-lg font-semibold text-white mb-4">{tNav("billing")}</h1>
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
      <h1 className="text-lg font-semibold text-white mb-4">{tNav("billing")}</h1>
      {billingError && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm mb-4">
          <p className="font-medium">{tBilling("errors.loadingFailed")}</p>
          <p className="mt-1 text-amber-200/80">{tBilling("errors.loadingFailedDesc")}</p>
          <Link href="/app/settings" className="inline-block mt-2 text-sm font-medium underline underline-offset-2">{tBilling("backToSettingsLink")}</Link>
        </div>
      )}
      <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
        <p className="text-sm font-medium text-white">{tBilling("planDisplay", { plan: "Starter", price: "297" })}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {tBilling("minutesUsed", { used: usage.minutes_used, limit: usage.minutes_limit })}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {tBilling("status")} {billingStatus}{renewalAt ? ` · ${tBilling("renews")} ${new Date(renewalAt).toLocaleDateString()}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setPlanChangeOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-600 text-zinc-300 mb-4 block hover:bg-zinc-800/50"
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
        onSuccess={() => setToast(tBilling("toast.planUpdated"))}
        workspaceId={workspaceId}
      />
        <p className="text-xs text-zinc-500 mb-4">
          {tBilling("paymentMethod")}{" "}
          <button
            type="button"
            onClick={async () => {
              if (!workspaceId) return;
              const res = await fetch("/api/billing/portal", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace_id: workspaceId, return_url: window.location.href }),
              });
              const data = (await res.json().catch(() => null)) as { url?: string } | null;
              if (data?.url) window.location.href = data.url;
              else setToast(tBilling("toast.paymentFailed"));
            }}
            className="text-zinc-400 hover:text-white ml-2"
          >
            {tBilling("update")}
          </button>
        </p>
      <p className="text-sm text-zinc-400 mb-2">{tBilling("invoiceHistory")}</p>
      <div className="rounded-xl border border-[var(--border-default)] p-3 mb-6">
        <p className="text-xs text-zinc-500 mb-2">{tBilling("invoiceDesc")}</p>
        <button
          type="button"
          onClick={async () => {
            if (!workspaceId) return;
            const res = await fetch("/api/billing/portal", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspace_id: workspaceId, return_url: window.location.href }),
            });
            const data = (await res.json().catch(() => null)) as { url?: string } | null;
            if (data?.url) window.location.href = data.url;
            else setToast(tBilling("toast.portalFailed"));
          }}
          className="text-sm text-zinc-300 hover:text-white underline underline-offset-2"
        >
          {tBilling("viewInvoices")}
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setPauseStep(1)} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-400 disabled:opacity-60 hover:bg-zinc-800/50">{pausing ? tBilling("pausing") : tBilling("pauseAccount")}</button>
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
            <h2 className="text-lg font-semibold text-white mb-2">{tBilling("pauseTitle")}</h2>
            <p className="text-sm text-zinc-400 mb-4">
              {tBilling("pauseDesc")}
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setPauseStep(0)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">{tBilling("cancel")}</button>
              <button type="button" onClick={() => { void handlePauseCoverage(); }} disabled={pausing} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium disabled:opacity-60">{pausing ? tBilling("pausing") : tBilling("pause")}</button>
            </div>
          </div>
        </div>
      )}

      {cancelStep >= 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setCancelStep(0)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            {cancelStep === 1 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">{tBilling("beforeYouGo")}</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  {tBilling("beforeYouGoDesc", { leads: usage.leads, revenue: usage.estRevenue.toLocaleString() })}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">{tBilling("stay")}</button>
                  <button type="button" onClick={() => setCancelStep(2)} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium">{tBilling("continueCancel")}</button>
                </div>
              </>
            )}
            {cancelStep === 2 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">{tBilling("pauseInstead")}</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  {tBilling("pauseInsteadDesc")}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(3)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">{tBilling("noContinue")}</button>
                  <button type="button" onClick={() => { void handlePauseCoverage(); }} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium disabled:opacity-60">{pausing ? tBilling("pausing") : tBilling("pauseFor30Days")}</button>
                </div>
              </>
            )}
            {cancelStep === 3 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">{tBilling("downgradeTitle")}</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  {tBilling("downgradeDesc")}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(4)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">{tBilling("noCancel")}</button>
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium">{tBilling("keepStarter")}</button>
                </div>
              </>
            )}
            {cancelStep === 4 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">{tBilling("sorryToSeeYouGo")}</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  {tBilling("sorryDesc")}
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">{tBilling("back")}</button>
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm bg-red-600 text-white font-medium">{tBilling("confirmCancel")}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">{tBilling("backToSettingsLink")}</Link></p>
    </div>
  );
}
