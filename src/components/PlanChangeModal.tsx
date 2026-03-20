"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { track } from "@/lib/analytics/posthog";

export type PlanId = "starter" | "growth" | "scale" | "enterprise";

export type PlanOption = {
  id: PlanId;
  name: string;
  price: number | null;
  minutes: number | null;
  features: string[];
};

const PLAN_ORDER: PlanId[] = ["starter", "growth", "scale", "enterprise"];

const PLAN_PRICES: Record<PlanId, { price: number | null; minutes: number | null }> = {
  starter: { price: 97, minutes: 500 },
  growth: { price: 297, minutes: 2500 },
  scale: { price: 597, minutes: 6000 },
  enterprise: { price: 997, minutes: 15000 },
};

type PlanChangeModalProps = {
  currentPlanId: PlanId;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (planName: string, message?: string) => void;
  workspaceId: string | null;
};

export function PlanChangeModal({ currentPlanId, isOpen, onClose, onSuccess, workspaceId }: PlanChangeModalProps) {
  const t = useTranslations("common");
  const tPlan = useTranslations("planChange");
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [selected, setSelected] = useState<PlanId>(currentPlanId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPlanOption = (id: PlanId): PlanOption => {
    const prices = PLAN_PRICES[id];
    const name = tPlan(`plans.${id}.name`);
    const featuresRaw = tPlan.raw(`plans.${id}.features`) as string[] | undefined;
    const features = Array.isArray(featuresRaw) ? featuresRaw : [];
    return { id, name, price: prices.price, minutes: prices.minutes, features };
  };

  const PLANS: PlanOption[] = PLAN_ORDER.map((id) => getPlanOption(id));

  if (!isOpen) return null;

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0];
  const selectedPlan = PLANS.find((p) => p.id === selected);
  const currentIndex = PLAN_ORDER.indexOf(currentPlanId);
  const selectedIndex = PLAN_ORDER.indexOf(selected);
  const isUpgrade = selectedIndex > currentIndex;

  const handleContinue = () => {
    if (selected === currentPlanId) return;
    setStep("confirm");
    setError(null);
  };

  const handleConfirm = async () => {
    if (!workspaceId) return;
    if (currentPlanId === "starter" && selected === "growth") {
      track("upgrade_clicked", { from: "solo", to: "business" });
    }
    if (selected === "scale" && isUpgrade) {
      track("plan_changed", { action: "upgrade", plan: "scale" });
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, plan_id: selected, interval: "month" }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        checkout_url?: string;
        message?: string;
        scheduled?: boolean;
      } | null;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (!res.ok || !data?.ok) {
        const msg = data?.error ?? tPlan("couldNotChange");
        setError(
          msg === "Plan not configured" || msg === "Billing not configured"
            ? tPlan("billingBeingSetUp")
            : msg
        );
        return;
      }
      onSuccess?.(selectedPlan?.name ?? selected, data?.message);
      onClose();
      // Soft refresh — refetch data without full page reload
      if (typeof window !== "undefined" && "navigation" in window) {
        try { window.location.href = window.location.href; } catch { window.location.reload(); }
      } else {
        window.location.reload();
      }
    } catch {
      setError(t("genericErrorTryAgain"));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-change-title"
      onClick={(e) => e.target === e.currentTarget && (setStep("select"), setError(null), onClose())}
    >
      <div
        className="bg-[var(--bg-card-elevated)] border border-[var(--border-default)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 id="plan-change-title" className="text-lg font-semibold text-white">
            {step === "select"
              ? tPlan("title")
              : isUpgrade
                ? tPlan("upgradeTitle", { planName: selectedPlan?.name ?? "" })
                : tPlan("downgradeTitle", { planName: selectedPlan?.name ?? "" })}
          </h2>
          <button type="button" onClick={() => { setStep("select"); setError(null); onClose(); }} className="p-2 rounded-lg text-zinc-400 hover:text-white" aria-label={t("close")}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {step === "select" ? (
            <>
              <p className="text-sm text-zinc-400 mb-4">
                {tPlan("currentlyOn", { planName: currentPlan.name })}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {PLANS.map((plan) => {
                  const isCurrent = plan.id === currentPlanId;
                  const isSelected = plan.id === selected;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelected(plan.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "border-zinc-500 bg-zinc-800/80 ring-1 ring-zinc-500/30"
                          : isCurrent
                          ? "border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5"
                          : "border-[var(--border-default)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{plan.name}</p>
                      <p className="text-lg font-bold text-white mt-1">
                        {plan.price != null ? `$${plan.price}` : tPlan("custom")}
                        {plan.price != null && <span className="text-xs font-normal text-zinc-400">{tPlan("perMonth")}</span>}
                      </p>
                      <ul className="mt-2 space-y-0.5">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="text-xs text-zinc-400">• {f}</li>
                        ))}
                      </ul>
                      {isCurrent && (
                        <span className="inline-block mt-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded">
                          {tPlan("currentBadge")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-sm text-[var(--accent-red)] mb-4" role="alert">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-medium)]">
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={selected === currentPlanId}
                  className="px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm disabled:opacity-30 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
                >
                  {tPlan("continue")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-4">
                {isUpgrade ? tPlan("upgradeDescription") : tPlan("downgradeDescription")}
              </p>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">{tPlan("currentPlanLabel")}</span>
                  <span className="text-white">{currentPlan.name}{currentPlan.price != null ? ` — $${currentPlan.price}${tPlan("perMonth")}` : ""}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-zinc-500">{tPlan("newPlanLabel")}</span>
                  <span className="text-white font-medium">{selectedPlan?.name}{selectedPlan?.price != null ? ` — $${selectedPlan.price}${tPlan("perMonth")}` : ` — ${tPlan("contactUsPrice")}`}</span>
                </div>
              </div>
              {error && <p className="text-sm text-[var(--accent-red)] mb-4" role="alert">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setStep("select"); setError(null); }} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-medium)]">
                  {t("back")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm disabled:opacity-50 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
                >
                  {loading ? tPlan("processing") : isUpgrade ? tPlan("upgradeNow") : tPlan("confirmDowngrade")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
