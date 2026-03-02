"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

export function HeartbeatBar() {
  const { workspaceId } = useWorkspace();
  const [statusLevel, setStatusLevel] = useState<"healthy" | "warning" | "risk">("healthy");
  const [_maintained, setMaintained] = useState(0);

  useEffect(() => {
    if (!workspaceId) {
      setMaintained(0);
      setStatusLevel("healthy");
      return;
    }
    fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d: { error?: string; operator_status?: string; at_risk?: unknown[]; hot_leads?: unknown[]; recovered?: unknown[]; active_protections?: { conversations_being_warmed: number; followups_scheduled_24h: number; attendance_protections: number; recoveries_running: number }; performance_status?: { status: string }; revenue_trajectory?: string }) => {
        if (d.error) return;
        const isPaused = d.operator_status === "Paused";
        const atRiskCount = (d.at_risk?.length ?? 0);
        const hasUrgency = d.revenue_trajectory === "At risk" || (d.performance_status?.status === "behind" && atRiskCount > 0);
        let level: "healthy" | "warning" | "risk" = "healthy";
        if (isPaused || hasUrgency) level = "risk";
        else if (atRiskCount > 0) level = "warning";
        setStatusLevel(level);
        const ap = d.active_protections;
        const count =
          (d.hot_leads?.length ?? 0) +
          (d.at_risk?.length ?? 0) +
          (d.recovered?.length ?? 0) +
          (ap ? ap.conversations_being_warmed + ap.followups_scheduled_24h + ap.attendance_protections + ap.recoveries_running : 0);
        setMaintained(isPaused ? 0 : Math.max(count || 0, 0));
      })
      .catch(() => {});
  }, [workspaceId]);

  const statusMessage =
    statusLevel === "risk"
      ? "Follow-through at risk"
      : statusLevel === "warning"
        ? "Falls outside normal handling"
        : "Nothing required.";
  const pulseColor = statusLevel === "healthy" ? "var(--meaning-green)" : statusLevel === "warning" ? "var(--meaning-amber)" : "var(--meaning-red)";

  if (!workspaceId) {
    return (
      <div
        className="px-4 py-2.5 text-sm shrink-0"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span style={{ color: "var(--text-muted)" }}>Nothing required.</span>
      </div>
    );
  }

  // When healthy: almost blank. No colored state (per design: healthy looks almost blank).
  if (statusLevel === "healthy") {
    return (
      <div
        className="px-4 py-2.5 shrink-0 text-sm"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span style={{ color: "var(--text-muted)" }}>{statusMessage}</span>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm shrink-0"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: pulseColor }} aria-hidden />
        <span style={{ color: "var(--text-primary)" }}>{statusMessage}</span>
      </div>
    </div>
  );
}
