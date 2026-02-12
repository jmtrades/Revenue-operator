"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

/**
 * Billing failure banner: Shows soft message when payment fails.
 * "Protection may pause soon unless billing is updated"
 * System continues appearing active until pause.
 */

export function BillingFailureBanner() {
  const { workspaceId } = useWorkspace();
  const [billingStatus, setBillingStatus] = useState<{ billing_status?: string } | null>(null);
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

  if (dismissed || !billingStatus || billingStatus.billing_status !== "payment_failed") return null;

  return (
    <div className="px-4 py-3 border-b text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <span style={{ color: "var(--text-secondary)" }}>
          Protection may pause soon unless billing is updated
        </span>
        <Link
          href="/dashboard/continue-protection"
          className="text-sm font-medium shrink-0"
          style={{ color: "var(--meaning-green)" }}
        >
          Update billing
        </Link>
      </div>
    </div>
  );
}
