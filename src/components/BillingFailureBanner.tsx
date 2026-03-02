"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";
import { PAYMENT_FAILURE_PRIMARY } from "@/lib/billing-copy";

/**
 * Payment failure banner: Primary message only; payment/retry in secondary line.
 */

export function BillingFailureBanner() {
  const { workspaceId } = useWorkspace();
  const [billingStatus, setBillingStatus] = useState<{ billing_status?: string } | null>(null);
  const [dismissed, _setDismissed] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.error) setBillingStatus(d);
      })
      .catch(() => {});
  }, [workspaceId]);

  if (dismissed || !billingStatus || billingStatus.billing_status !== "payment_failed") return null;

  return (
    <div className="px-4 py-3 border-b text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{PAYMENT_FAILURE_PRIMARY}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Update your payment method in Preferences to resume coverage.
          </p>
        </div>
        <Link
          href="/dashboard/continue-protection"
          className="text-sm font-medium shrink-0"
          style={{ color: "var(--meaning-green)" }}
        >
          Preferences
        </Link>
      </div>
    </div>
  );
}
