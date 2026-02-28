"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

interface BillingState {
  plan_name: string;
  interval: string;
  status: string;
  renews_at: string | null;
  can_manage: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
};

export default function DashboardBillingPage() {
  const { workspaceId } = useWorkspace();
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setBilling(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/dashboard/billing?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setBilling(d) : setBilling(null)))
      .catch(() => setBilling(null))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleManage = () => {
    if (!workspaceId || !billing?.can_manage || managing) return;
    setManaging(true);
    fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        workspace_id: workspaceId,
        return_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard/billing` : undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d?.url) window.location.href = d.url;
      })
      .finally(() => setManaging(false));
  };

  if (loading || !workspaceId) {
    return (
      <div className="p-6">
        <p className="text-[15px] text-[#78716c]">Loading…</p>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="p-6">
        <p className="text-[15px] text-[#78716c]">Billing information unavailable.</p>
      </div>
    );
  }

  const renewalDate = billing.renews_at
    ? new Date(billing.renews_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="p-6 max-w-lg space-y-6">
      <DashboardExecutionStateBanner />
      <h2 className="text-[18px] font-medium text-[#1c1917]">Billing</h2>

      <div className="space-y-3 text-[15px]">
        <p>
          <span className="text-[#78716c]">Plan:</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>{billing.plan_name}</span>
        </p>
        <p>
          <span className="text-[#78716c]">Interval:</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>{billing.interval === "year" ? "Annual" : "Monthly"}</span>
        </p>
        <p>
          <span className="text-[#78716c]">Status:</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>
            {STATUS_LABEL[billing.status] ?? billing.status}
          </span>
        </p>
        {renewalDate && (
          <p>
            <span className="text-[#78716c]">Renewal date:</span>{" "}
            <span style={{ color: "var(--text-primary)" }}>{renewalDate}</span>
          </p>
        )}
      </div>

      {billing.can_manage && (
        <button
          type="button"
          onClick={handleManage}
          disabled={managing}
          className="py-2.5 px-4 text-[15px] font-medium bg-[#e7e5e4] hover:bg-[#d6d3d1] disabled:opacity-60 transition-colors"
        >
          {managing ? "Opening…" : "Manage billing"}
        </button>
      )}
    </div>
  );
}
