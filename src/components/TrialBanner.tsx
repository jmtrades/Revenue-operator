"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

export function TrialBanner() {
  const { workspaceId } = useWorkspace();
  const [day, setDay] = useState(0);
  const [conversationsAtRisk, setConversationsAtRisk] = useState<Array<{ id: string; name?: string; company?: string }>>([]);
  const [futureCalls, setFutureCalls] = useState<Array<{ deal_id: string; lead_id: string; name?: string; company?: string; value_cents?: number }>>([]);
  const [billingStatus, setBillingStatus] = useState<{ renewal_at?: string | null } | null>(null);
  const [commandCenter, setCommandCenter] = useState<{
    active_protections?: { conversations_being_warmed: number; followups_scheduled_24h: number; attendance_protections: number; recoveries_running: number };
    expected_weekly?: { low: number; high: number } | null;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const start = typeof window !== "undefined" ? localStorage.getItem("trial_start") : null;
    if (!start) {
      const now = new Date().toISOString();
      if (typeof window !== "undefined") localStorage.setItem("trial_start", now);
      setDay(0);
    } else {
      const elapsed = (Date.now() - new Date(start).getTime()) / (24 * 60 * 60 * 1000);
      setDay(Math.min(14, Math.max(0, Math.floor(elapsed))));
    }
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([cc, status]) => {
        setCommandCenter(cc);
        setBillingStatus(status?.error ? null : status);
      })
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && day >= 6) {
      fetch(`/api/trial/conversations-at-risk?workspace_id=${workspaceId}`)
        .then((r) => r.json())
        .then((d) => {
          setConversationsAtRisk(d.conversations ?? []);
          setFutureCalls(d.future_calls ?? []);
        })
        .catch(() => {});
    }
  }, [workspaceId, day]);

  if (dismissed) return null;

  const ap = commandCenter?.active_protections;
  const ew = commandCenter?.expected_weekly;
  const hasProtections = ap && (ap.conversations_being_warmed > 0 || ap.followups_scheduled_24h > 0 || ap.attendance_protections > 0 || ap.recoveries_running > 0);
  const hasExpectation = ew && (ew.low > 0 || ew.high > 0);

  if (day >= 11) {
    const willLoseContinuity = conversationsAtRisk.length + futureCalls.length || (hasProtections ? ap!.conversations_being_warmed + ap!.followups_scheduled_24h + ap!.attendance_protections + ap!.recoveries_running : 0);
    return (
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm" style={{ background: "rgba(243, 156, 18, 0.1)", borderBottom: "1px solid var(--meaning-amber)" }}>
        <div>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>Protection will pause automatically unless continued</span>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            {willLoseContinuity > 0
              ? `${willLoseContinuity} conversation${willLoseContinuity !== 1 ? "s" : ""} will lose continuity within the next hour.`
              : "Prevent interruption to keep coverage active."}
          </p>
        </div>
        <Link
          href="/dashboard/continue-protection"
          className="px-4 py-2 rounded-lg font-medium shrink-0"
          style={{ background: "var(--meaning-green)", color: "#0E1116" }}
        >
          Keep coverage active
        </Link>
      </div>
    );
  }

  if (day >= 6) {
    const renewalDate = billingStatus?.renewal_at ? new Date(billingStatus.renewal_at).toLocaleDateString() : null;
    return (
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm" style={{ background: "rgba(243, 156, 18, 0.1)", borderBottom: "1px solid var(--meaning-amber)" }}>
        <div>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>Protection active</span>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            {renewalDate && `Renewal on ${renewalDate}. `}
            {hasProtections
              ? `${ap!.conversations_being_warmed + ap!.followups_scheduled_24h + ap!.attendance_protections + ap!.recoveries_running} protection${(ap!.conversations_being_warmed + ap!.followups_scheduled_24h + ap!.attendance_protections + ap!.recoveries_running) !== 1 ? "s" : ""} running. Pause anytime. `
              : "Protection continues when active. Pause anytime. "}
            We&apos;ll remind you before any charge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/continue-protection"
            className="px-4 py-2 rounded-lg font-medium shrink-0"
            style={{ background: "var(--meaning-green)", color: "#0E1116" }}
          >
            Keep coverage active
          </Link>
          <button onClick={() => setDismissed(true)} style={{ color: "var(--text-muted)" }}>×</button>
        </div>
      </div>
    );
  }

  if (day >= 3) {
    const renewalDate = billingStatus?.renewal_at ? new Date(billingStatus.renewal_at).toLocaleDateString() : null;
    return (
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm" style={{ background: "rgba(243, 156, 18, 0.1)", borderBottom: "1px solid var(--meaning-amber)" }}>
        <div>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>Protection running</span>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            {renewalDate ? `Renewal on ${renewalDate}. ` : ""}
            {hasExpectation
              ? `We expect ${ew!.low}–${ew!.high} conversations per week. `
              : "Activity appears in Activity as we work. "}
            We&apos;ll remind you before any charge.
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0" style={{ color: "var(--text-muted)" }}>×</button>
      </div>
    );
  }

  if (day <= 2) {
    return (
      <div className="px-4 py-2 flex items-center justify-between text-sm" style={{ background: "rgba(243, 156, 18, 0.1)", borderBottom: "1px solid var(--meaning-amber)" }}>
        <span style={{ color: "var(--text-primary)" }}>
          Activity appears in Overview as we work. We&apos;ll remind you before any charge.
        </span>
        <button onClick={() => setDismissed(true)} style={{ color: "var(--text-muted)" }}>×</button>
      </div>
    );
  }

  return null;
}
