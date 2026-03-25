"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  HeadsetIcon,
  TrendingUp,
  X,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

interface BillingData {
  plan_name: string;
  status: string;
  interval: string;
  renews_at: string | null;
  can_manage: boolean;
  revenue_recovered?: number;
  workspace_name?: string;
}

type CancellationReason = "expensive" | "unused" | "competitor" | "features" | "other" | null;

const CANCELLATION_REASONS = [
  { id: "expensive", label: "Too expensive" },
  { id: "unused", label: "Not using enough" },
  { id: "competitor", label: "Switching to a competitor" },
  { id: "features", label: "Missing features" },
  { id: "other", label: "Other reason" },
];

const PLAN_BENEFITS = [
  { icon: TrendingUp, label: "Revenue Recovery Insights", desc: "AI-powered revenue analysis" },
  { icon: Clock, label: "24/7 Support Access", desc: "Priority support team" },
  { icon: DollarSign, label: "Advanced Analytics", desc: "Detailed performance metrics" },
  { icon: CheckCircle2, label: "Team Collaboration", desc: "Multi-user workspace access" },
];

export default function CancelSubscriptionPage() {
  const { workspaceId } = useWorkspace();
  const [stage, setStage] = useState<"intercept" | "reason" | "confirm">("intercept");
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReason, setSelectedReason] = useState<CancellationReason>(null);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    fetch(`/api/dashboard/billing?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setBilling(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [workspaceId]);

  const handleContinueWithoutCanceling = (action: "pause" | "downgrade" | "support") => {
    switch (action) {
      case "pause":
        // Navigate to pause subscription flow or show modal
        window.location.href = `/dashboard/billing?action=pause`;
        break;
      case "downgrade":
        // Navigate to downgrade flow
        window.location.href = `/dashboard/billing?action=downgrade`;
        break;
      case "support":
        // Open support modal or navigate to contact
        window.open("mailto:hello@recall-touch.com?subject=Help%20with%20Subscription", "_blank");
        break;
    }
  };

  const handleProceedToCancel = () => {
    setStage("reason");
  };

  const handleSubmitReason = async () => {
    if (!selectedReason || !workspaceId) {
      setError("Please select a reason");
      return;
    }

    setCanceling(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          reason: selectedReason,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record cancellation reason");
      }

      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCanceling(false);
    }
  };

  const handleFinalCancel = async () => {
    if (!workspaceId || !billing?.can_manage) return;

    setCanceling(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          return_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard/billing` : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to open billing portal");
      }

      const data = await res.json();
      if (data?.ok && data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCanceling(false);
    }
  };

  if (loading || !workspaceId) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-2xl rounded-2xl p-8 animate-pulse" style={{ background: "var(--bg-surface)" }}>
          <div className="h-8 w-48 rounded mb-6" style={{ background: "var(--border-default)" }} />
          <div className="space-y-4">
            <div className="h-4 w-full rounded" style={{ background: "var(--border-default)" }} />
            <div className="h-4 w-3/4 rounded" style={{ background: "var(--border-default)" }} />
          </div>
        </div>
      </div>
    );
  }

  // Stage 1: Intercept with alternatives
  if (stage === "intercept") {
    return (
      <div
        className="min-h-screen p-4 sm:p-6 flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
              style={{ color: "var(--accent-primary)" }}
            >
              <ArrowLeft size={16} />
              Back to Billing
            </Link>
          </div>

          {/* Main Card */}
          <div className="rounded-2xl border p-8 space-y-8" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            {/* Title Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle size={28} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Before you go
                  </h1>
                  <p className="text-lg mt-2" style={{ color: "var(--text-secondary)" }}>
                    We&apos;d love to help you get the most from Recall Touch
                  </p>
                </div>
              </div>
            </div>

            {/* Revenue Recovery Summary */}
            {billing?.revenue_recovered && (
              <div
                className="rounded-xl p-5 border-2"
                style={{
                  background: "rgba(34, 197, 94, 0.05)",
                  borderColor: "rgba(34, 197, 94, 0.3)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} style={{ color: "#22c55e" }} />
                  <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>
                    Your Impact
                  </p>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Since joining, Recall Touch has recovered ${billing.revenue_recovered.toLocaleString()} in revenue for your business
                </p>
              </div>
            )}

            {/* Alternative Options */}
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                Instead of canceling, consider
              </p>

              {/* Option 1: Pause */}
              <button
                onClick={() => handleContinueWithoutCanceling("pause")}
                className="w-full rounded-xl border p-5 text-left transition-[border-color,box-shadow,transform] hover:shadow-lg"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-primary)")}
              >
                <div className="flex items-start gap-4">
                  <Clock size={24} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                      Pause for 30 days
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Keep your data and resume anytime. Perfect if you need a break.
                    </p>
                  </div>
                  <ChevronUp size={20} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                </div>
              </button>

              {/* Option 2: Downgrade */}
              <button
                onClick={() => handleContinueWithoutCanceling("downgrade")}
                className="w-full rounded-xl border p-5 text-left transition-[border-color,box-shadow,transform] hover:shadow-lg"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-primary)")}
              >
                <div className="flex items-start gap-4">
                  <DollarSign size={24} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                      Downgrade to Starter
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Start at just $97/month instead of canceling completely.
                    </p>
                  </div>
                  <ChevronUp size={20} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                </div>
              </button>

              {/* Option 3: Support */}
              <button
                onClick={() => handleContinueWithoutCanceling("support")}
                className="w-full rounded-xl border p-5 text-left transition-[border-color,box-shadow,transform] hover:shadow-lg"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-primary)")}
              >
                <div className="flex items-start gap-4">
                  <HeadsetIcon size={24} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                      Talk to support first
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Let us help! Our team can address your concerns or find a better solution.
                    </p>
                  </div>
                  <ChevronUp size={20} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                </div>
              </button>
            </div>

            {/* What You'll Lose Section */}
            <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                What you&apos;ll lose
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLAN_BENEFITS.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={benefit.label} className="flex gap-3 p-3 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                      <Icon size={20} style={{ color: "var(--accent-primary)", flexShrink: 0, marginTop: 2 }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {benefit.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {benefit.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Still Want to Cancel Button */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
              <button
                onClick={handleProceedToCancel}
                className="w-full py-3 px-4 text-sm font-semibold rounded-lg transition-opacity"
                style={{
                  background: "rgba(255, 77, 77, 0.1)",
                  color: "var(--accent-danger, #ff4d4d)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Still want to cancel? Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stage 2: Reason Selection
  if (stage === "reason") {
    return (
      <div
        className="min-h-screen p-4 sm:p-6 flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => setStage("intercept")}
              className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
              style={{ color: "var(--accent-primary)" }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>

          {/* Main Card */}
          <div className="rounded-2xl border p-8 space-y-8" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Help us improve
              </h1>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                Your feedback helps us build a better product. Why are you canceling?
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="flex items-center gap-3 p-4 rounded-lg"
                style={{
                  background: "rgba(255, 77, 77, 0.1)",
                  borderLeft: "3px solid var(--accent-danger)",
                }}
              >
                <AlertTriangle size={18} style={{ color: "var(--accent-danger)" }} />
                <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Reason Options */}
            <div className="space-y-3">
              {CANCELLATION_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => {
                    setSelectedReason(reason.id as CancellationReason);
                    setError(null);
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-[border-color,box-shadow,transform] ${
                    selectedReason === reason.id ? "border-2" : "border"
                  }`}
                  style={{
                    borderColor: selectedReason === reason.id ? "var(--accent-primary)" : "var(--border-default)",
                    background: selectedReason === reason.id ? "rgba(79, 140, 255, 0.05)" : "var(--bg-primary)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {reason.label}
                    </span>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-[border-color,box-shadow]"
                      style={{
                        borderColor: selectedReason === reason.id ? "var(--accent-primary)" : "var(--border-default)",
                        background: selectedReason === reason.id ? "var(--accent-primary)" : "transparent",
                      }}
                    >
                      {selectedReason === reason.id && (
                        <X size={14} style={{ color: "white" }} />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Submit Reason Button */}
            <button
              onClick={handleSubmitReason}
              disabled={!selectedReason || canceling}
              className="w-full py-3 px-4 text-sm font-semibold rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent-primary)",
                color: "white",
              }}
            >
              {canceling ? "Processing..." : "Continue to cancel"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Stage 3: Final Confirmation
  return (
    <div
      className="min-h-screen p-4 sm:p-6 flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="rounded-2xl border p-8 space-y-8 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255, 77, 77, 0.1)" }}
            >
              <AlertCircle size={32} style={{ color: "var(--accent-danger)" }} />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Final confirmation needed
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              Canceling your subscription will end your access at the end of your billing period.
            </p>
          </div>

          {/* Details */}
          <div className="space-y-3 p-4 rounded-xl" style={{ background: "var(--bg-primary)" }}>
            {billing && (
              <>
                <div className="flex justify-between items-center">
                  <span style={{ color: "var(--text-secondary)" }}>Current Plan:</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {billing.plan_name}
                  </span>
                </div>
                {billing.renews_at && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: "var(--text-secondary)" }}>Access until:</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {new Date(billing.renews_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{
                background: "rgba(255, 77, 77, 0.1)",
                borderLeft: "3px solid var(--accent-danger)",
              }}
            >
              <AlertTriangle size={18} style={{ color: "var(--accent-danger)" }} />
              <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
                {error}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleFinalCancel}
              disabled={canceling || !billing?.can_manage}
              className="w-full py-3 px-4 text-sm font-semibold rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent-danger, #ff4d4d)",
                color: "white",
              }}
            >
              {canceling ? "Canceling..." : "Confirm cancellation"}
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard/billing")}
              className="w-full py-3 px-4 text-sm font-semibold rounded-lg transition-[background-color,border-color,color,transform]"
              style={{
                background: "var(--bg-primary)",
                color: "var(--accent-primary)",
                border: "1px solid var(--border-default)",
              }}
            >
              Keep my subscription
            </button>
          </div>

          {/* Support Link */}
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Have questions?{" "}
            <a
              href="mailto:hello@recall-touch.com?subject=Cancellation%20Help"
              className="underline transition-opacity hover:opacity-70"
              style={{ color: "var(--accent-primary)" }}
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
