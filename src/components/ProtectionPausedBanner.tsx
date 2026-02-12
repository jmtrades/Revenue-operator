"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

export function ProtectionPausedBanner() {
  const { workspaceId } = useWorkspace();
  const [billingStatus, setBillingStatus] = useState<{ billing_status?: string; renewal_at?: string | null } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.error) setBillingStatus(d);
      })
      .catch(() => {});
  }, [workspaceId]);

  if (dismissed || !billingStatus) return null;

  // Show banner if trial ended and no active subscription
  const trialEnded = billingStatus.billing_status === "trial_ended" || 
    (billingStatus.billing_status === "trial" && billingStatus.renewal_at && new Date(billingStatus.renewal_at) < new Date());

  if (!trialEnded) return null;

  return (
    <div className="w-full px-4 py-6" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>Protection paused</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Conversations are no longer being maintained.
          Some may go quiet.
        </p>
        <Link
          href="/dashboard/continue-protection"
          className="inline-block px-6 py-2.5 rounded-lg font-medium"
          style={{ background: "var(--meaning-green)", color: "#0E1116" }}
        >
          Keep protection active
        </Link>
      </div>
    </div>
  );
}
