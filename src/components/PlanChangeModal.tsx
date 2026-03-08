"use client";

import { useState, useEffect } from "react";
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
  { id: "starter", name: "Starter", price: 297, minutes: 400, features: ["1 agent", "1 phone number", "Usage insights"] },
  { id: "growth", name: "Pro", price: 597, minutes: 1000, features: ["3 agents", "3 phone numbers", "Call Intelligence", "Priority support"] },
  { id: "scale", name: "Business", price: 1197, minutes: 3000, features: ["10 agents", "10 phone numbers", "Detailed reporting", "API access", "Team collaboration"] },
  { id: "enterprise", name: "Enterprise", price: null, minutes: null, features: ["Unlimited agents", "Unlimited numbers", "Custom integrations", "Dedicated support", "SLA"] },
];

type PlanChangeModalProps = {
  currentPlanId: PlanId;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (planName: string) => void;
  workspaceId: string | null;
};

export function PlanChangeModal({ currentPlanId, isOpen, onClose, onSuccess, workspaceId }: PlanChangeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PlanOption | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const currentPlan = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0];

  const handleSelect = (plan: PlanOption) => {
    if (plan.id === currentPlanId) return;
    if (plan.id === "enterprise") {
      window.location.href = "mailto:enterprise@recall-touch.com?subject=Enterprise%20plan%20inquiry";
      return;
    }
    setConfirming(plan);
  };

  const handleConfirmChange = async () => {
    if (!confirming || !workspaceId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, plan_id: confirming.id }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not change plan.");
        return;
      }
      onSuccess?.(confirming.name);
      onClose();
      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setConfirming(null);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-change-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 id="plan-change-title" className="text-lg font-semibold text-white">Change your plan</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-zinc-400 mb-4">
            Current plan: <span className="text-white font-medium">{currentPlan.name}</span>
            {currentPlan.price != null && ` — $${currentPlan.price}/mo`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handleSelect(plan)}
                  disabled={isCurrent}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    isCurrent
                      ? "border-zinc-600 bg-zinc-800/50 cursor-default"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{plan.name}</span>
                    {isCurrent && <span className="text-[10px] uppercase tracking-wide text-zinc-500 bg-zinc-700 px-2 py-0.5 rounded">Current</span>}
                  </div>
                  {plan.price != null ? (
                    <p className="text-sm text-zinc-400 mt-1">${plan.price}/mo · {plan.minutes} min</p>
                  ) : (
                    <p className="text-sm text-zinc-400 mt-1">Contact us</p>
                  )}
                  <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
                    {plan.features.slice(0, 3).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">{error}</p>
          )}
          {confirming && confirming.id !== "enterprise" && (
            <div className="mt-4 p-4 rounded-xl border border-zinc-700 bg-zinc-800/50">
              {!workspaceId ? (
                <p className="text-sm text-zinc-500">Loading workspace…</p>
              ) : (
                <>
                  <p className="text-sm text-zinc-300">
                    Switch to {confirming.name} (${confirming.price}/mo)? You&apos;ll be charged the prorated difference.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => setConfirming(null)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">Back</button>
                    <button type="button" onClick={handleConfirmChange} disabled={loading} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-semibold disabled:opacity-60">
                      {loading ? "Updating…" : "Upgrade now"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
