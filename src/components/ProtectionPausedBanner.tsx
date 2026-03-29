"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function ProtectionPausedBanner() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations("billing.protectionPaused");
  const [billingStatus, setBillingStatus] = useState<{
    billing_status?: string;
    renewal_at?: string | null;
    trial_ends_at?: string | null;
    has_upcoming_booking_24h?: boolean;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => { if (!r.ok) throw new Error("status_failed"); return r.json(); })
      .then((d) => {
        if (!d?.error) setBillingStatus(d);
      })
      .catch(() => {});
  }, [workspaceId]);

  if (dismissed || !billingStatus) return null;

  // Calculate trial days remaining
  const trialEndDate = billingStatus.trial_ends_at
    ? new Date(billingStatus.trial_ends_at)
    : billingStatus.renewal_at
      ? new Date(billingStatus.renewal_at)
      : null;
  const now = new Date();
  const daysLeft = trialEndDate
    ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isTrial = billingStatus.billing_status === "trial";
  const trialEndingSoon = isTrial && daysLeft !== null && daysLeft > 0 && daysLeft <= 7;

  // Show banner if trial ended, cancelled, or payment failed
  const isCancelled = billingStatus.billing_status === "cancelled";
  const isPaymentFailed = billingStatus.billing_status === "payment_failed";
  const trialEnded = billingStatus.billing_status === "trial_ended" ||
    isCancelled ||
    isPaymentFailed ||
    (isTrial && trialEndDate && trialEndDate < now);

  // Show "trial ending soon" banner (7 days or less)
  if (trialEndingSoon) {
    const urgencyColor = daysLeft <= 2 ? "#EF4444" : daysLeft <= 4 ? "#F59E0B" : "var(--accent-primary)";
    return (
      <div
        className="w-full px-4 py-4"
        style={{
          background: daysLeft <= 2 ? "#FEF2F210" : "var(--card)",
          borderBottom: `2px solid ${urgencyColor}`,
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold mb-0.5" style={{ color: urgencyColor }}>
              {daysLeft === 1
                ? "Your trial ends tomorrow"
                : `Your trial ends in ${daysLeft} days`}
            </h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {daysLeft <= 2
                ? "Your AI operator will stop answering calls when the trial ends. Upgrade now to keep recovering revenue."
                : "Lock in your plan to keep your AI operator running 24/7 — no interruption."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app/settings/billing"
              className="inline-block px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: urgencyColor, color: "#fff" }}
            >
              Upgrade now
            </Link>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!trialEnded) return null;

  return (
    <div className="w-full px-4 py-6" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>{t("title")}</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {t("noHandling")}{" "}
          {t("manualConfirmation")}{" "}
          {t("decisionsStall")}
          {billingStatus.has_upcoming_booking_24h && (
            <>
              {" "}
              {t("upcomingManual")}
            </>
          )}
        </p>
        <Link
          href="/dashboard/continue-protection"
          className="inline-block px-6 py-2.5 rounded-lg font-medium"
          style={{ background: "var(--meaning-green)", color: "#0E1116" }}
        >
          {t("resumeHandling")}
        </Link>
      </div>
    </div>
  );
}
