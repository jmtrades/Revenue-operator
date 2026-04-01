"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { AlertCircle, Clock } from "lucide-react";

export function TrialGraceEndedBanner() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations("banners.trial");
  const [workspaceStatus, setWorkspaceStatus] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    fetch(`/api/overview?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.workspace_status;
        if (typeof s === "string") setWorkspaceStatus(s);
        // Calculate trial days remaining
        const trialEnd = d?.trial_ends_at;
        if (trialEnd) {
          const daysLeft = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(daysLeft);
        }
      })
      .catch((e) => { console.warn("[TrialGraceEndedBanner] fetch failed:", e instanceof Error ? e.message : String(e)); });
  }, [workspaceId]);

  if (!workspaceId) return null;

  // Show expired banner
  if (workspaceStatus === "trial_expired") {
    return (
      <section className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-5 py-4">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("trialGraceEnded", { defaultValue: "Your trial has ended" })}
          </p>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {t("trialExpiredBody", { defaultValue: "Upgrade now to keep your AI operator running and avoid losing leads." })}{" "}
            <Link href="/app/settings/billing" className="font-medium underline" style={{ color: "var(--accent-primary)" }}>
              {t("trialUpgradeToContinue", { defaultValue: "Choose a plan" })}
            </Link>
          </p>
        </div>
      </section>
    );
  }

  // Show countdown banner when 7 or fewer days remain
  if (trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 7) {
    return (
      <section className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-5 py-4">
        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {trialDaysLeft === 1
              ? t("trialEndsToday", { defaultValue: "Your trial ends tomorrow" })
              : t("trialEndingSoon", { defaultValue: `Your trial ends in ${trialDaysLeft} days` })}
          </p>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {t("trialCountdownBody", { defaultValue: "Lock in your plan now to ensure uninterrupted service." })}{" "}
            <Link href="/app/settings/billing" className="font-medium underline" style={{ color: "var(--accent-primary)" }}>
              {t("trialUpgradeNow", { defaultValue: "Upgrade now" })}
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return null;
}
