"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type PlanId = "starter" | "growth" | "scale" | "enterprise";

export type PlanOption = {
  id: PlanId;
  name: string;
  price: number | null;
  minutes: number | null;
  features: string[];
};

const PLANS: PlanOption[] = [
  { id: "starter", name: "Starter", price: 297, minutes: 400, features: ["1 AI agent", "1 phone number", "400 min/mo", "Usage insights"] },
  { id: "growth", name: "Pro", price: 597, minutes: 1000, features: ["3 AI agents", "3 phone numbers", "1,000 min/mo", "Call Intelligence", "Priority support"] },
  { id: "scale", name: "Business", price: 1197, minutes: 3000, features: ["10 AI agents", "10 phone numbers", "3,000 min/mo", "Detailed reporting", "API access"] },
  { id: "enterprise", name: "Enterprise", price: null, minutes: null, features: ["Unlimited agents", "Unlimited numbers", "Custom integrations", "Dedicated support", "SLA"] },
];

const PLAN_ORDER: PlanId[] = ["starter", "growth", "scale", "enterprise"];

type PlanChangeModalProps = {
  currentPlanId: PlanId;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (planName: string) => void;
  workspaceId: string | null;
};

export function PlanChangeModal({ currentPlanId, isOpen, onClose, onSuccess, workspaceId }: PlanChangeModalProps) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [selected, setSelected] = useState<PlanId>(currentPlanId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0];
  const selectedPlan = PLANS.find((p) => p.id === selected);
  const currentIndex = PLAN_ORDER.indexOf(currentPlanId);
  const selectedIndex = PLAN_ORDER.indexOf(selected);
  const isUpgrade = selectedIndex > currentIndex && selected !== "enterprise";

  const handleContinue = () => {
    if (selected === "enterprise") {
      window.location.href = "mailto:team@recall-touch.com?subject=Enterprise%20plan%20inquiry";
      return;
    }
    if (selected === currentPlanId) return;
    setStep("confirm");
    setError(null);
  };

  const handleConfirm = async () => {
    if (selected === "enterprise" || !workspaceId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, plan_id: selected, planId: selected }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        checkout_url?: string;
        message?: string;
      } | null;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not change plan.");
        return;
      }
      onSuccess?.(selectedPlan?.name ?? selected);
      onClose();
      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
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
            {step === "select" ? "Change your plan" : isUpgrade ? `Upgrade to ${selectedPlan?.name}` : `Downgrade to ${selectedPlan?.name}`}
          </h2>
          <button type="button" onClick={() => { setStep("select"); setError(null); onClose(); }} className="p-2 rounded-lg text-zinc-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {step === "select" ? (
            <>
              <p className="text-sm text-zinc-400 mb-4">
                Currently on {currentPlan.name}. Select a new plan below.
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
                          ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 ring-1 ring-[var(--accent-blue)]/30"
                          : isCurrent
                          ? "border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5"
                          : "border-[var(--border-default)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{plan.name}</p>
                      <p className="text-lg font-bold text-white mt-1">
                        {plan.price != null ? `$${plan.price}` : "Custom"}
                        {plan.price != null && <span className="text-xs font-normal text-zinc-400">/mo</span>}
                      </p>
                      <ul className="mt-2 space-y-0.5">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="text-xs text-zinc-400">• {f}</li>
                        ))}
                      </ul>
                      {isCurrent && (
                        <span className="inline-block mt-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-sm text-[var(--accent-red)] mb-4" role="alert">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-medium)]">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={selected === currentPlanId}
                  className="px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm disabled:opacity-30 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                >
                  {selected === "enterprise" ? "Contact us" : "Continue"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-4">
                {isUpgrade
                  ? "You'll be charged the prorated difference. Your new features are available right away."
                  : "Your plan will change at your next billing date. You'll keep current features until then."}
              </p>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Current plan</span>
                  <span className="text-white">{currentPlan.name}{currentPlan.price != null ? ` — $${currentPlan.price}/mo` : ""}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-zinc-500">New plan</span>
                  <span className="text-white font-medium">{selectedPlan?.name}{selectedPlan?.price != null ? ` — $${selectedPlan.price}/mo` : " — Contact us"}</span>
                </div>
              </div>
              {error && <p className="text-sm text-[var(--accent-red)] mb-4" role="alert">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setStep("select"); setError(null); }} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-medium)]">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm disabled:opacity-50 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                >
                  {loading ? "Processing…" : isUpgrade ? "Upgrade now" : "Confirm downgrade"}
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
