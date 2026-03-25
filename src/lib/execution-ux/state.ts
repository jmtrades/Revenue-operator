"use client";

import { useEffect, useState } from "react";

export type ExecutionUxState = "under_review" | "active" | "paused";

interface BillingSnapshot {
  status?: string;
}

interface ApprovalsSnapshot {
  pending?: unknown[];
}

interface PolicySnapshot {
  jurisdiction?: string | null;
  approval_mode?: string | null;
}

/**
 * UX-only hook: derive high-level execution state from existing safe signals.
 * Does not change behaviour; reads existing governance, approvals, and billing endpoints.
 */
export function useExecutionUxState(workspaceId: string | null | undefined): ExecutionUxState | null {
  const [state, setState] = useState<ExecutionUxState | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      const id = setTimeout(() => setState("under_review"), 0);
      return () => clearTimeout(id);
    }

    let cancelled = false;

    async function load() {
      try {
        const wid = workspaceId ?? "";
        const [policiesRes, approvalsRes, billingRes] = await Promise.all([
          fetch(`/api/enterprise/policies?workspace_id=${encodeURIComponent(wid)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/enterprise/approvals?workspace_id=${encodeURIComponent(wid)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/dashboard/billing?workspace_id=${encodeURIComponent(wid)}`, {
            credentials: "include",
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        let computed: ExecutionUxState = "active";

        const billing = (billingRes ?? {}) as BillingSnapshot;
        const billingStatus = typeof billing.status === "string" ? billing.status : undefined;
        if (billingStatus === "paused" || billingStatus === "past_due") {
          computed = "paused";
        }

        const approvals = (approvalsRes ?? {}) as ApprovalsSnapshot;
        const pending = Array.isArray(approvals.pending) ? approvals.pending : [];
        if (pending.length > 0 && computed !== "paused") {
          computed = "under_review";
        }

        const rawPolicies = policiesRes as unknown;
        const policies: PolicySnapshot[] = Array.isArray(rawPolicies)
          ? (rawPolicies as PolicySnapshot[])
          : Array.isArray((rawPolicies as { policies?: PolicySnapshot[] } | null)?.policies)
          ? ((rawPolicies as { policies?: PolicySnapshot[] }).policies as PolicySnapshot[])
          : [];

        if (policies.length > 0 && computed !== "paused") {
          const hasUnspecified = policies.some((p) => (p.jurisdiction ?? "").toUpperCase() === "UNSPECIFIED");
          const hasPreviewOrApproval = policies.some((p) => {
            const mode = (p.approval_mode ?? "").toLowerCase();
            return mode === "preview_required" || mode === "approval_required";
          });
          if (hasUnspecified || hasPreviewOrApproval) {
            computed = "under_review";
          }
        }

        if (!cancelled) {
          setState(computed);
        }
      } catch {
        if (!cancelled) {
          setState("under_review");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return state;
}

