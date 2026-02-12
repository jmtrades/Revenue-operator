"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

function parseNextMinutes(nextAction: string | null): number | null {
  if (!nextAction) return null;
  const m = nextAction.match(/(\d+)\s*min/i);
  if (m) return parseInt(m[1], 10);
  const h = nextAction.match(/(\d+)\s*h/i);
  if (h) return parseInt(h[1], 10) * 60;
  return null;
}

export function HeartbeatBar() {
  const { workspaceId } = useWorkspace();
  const [nextMin, setNextMin] = useState<number | null>(null);
  const [statusLevel, setStatusLevel] = useState<"healthy" | "warning" | "risk">("healthy");
  const [maintained, setMaintained] = useState(0);

  useEffect(() => {
    if (!workspaceId) {
      setNextMin(null);
      setMaintained(0);
      setStatusLevel("healthy");
      return;
    }
    const fetchData = () => {
      fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`)
        .then((r) => r.json())
        .then((d: { error?: string; next_action?: string; operator_status?: string; at_risk?: unknown[]; hot_leads?: unknown[]; recovered?: unknown[]; active_protections?: { conversations_being_warmed: number; followups_scheduled_24h: number; attendance_protections: number; recoveries_running: number }; performance_status?: { status: string }; revenue_trajectory?: string }) => {
          if (d.error) return;
          const mins = parseNextMinutes(d.next_action ?? null);
          setNextMin(mins);
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
    };
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  if (!workspaceId) return null;

  const statusMessage =
    statusLevel === "risk"
      ? "Conversations at risk"
      : statusLevel === "warning"
        ? "Conversations need attention soon"
        : maintained > 0
          ? "All conversations maintained"
          : "Watching over";
  const pulseColor = statusLevel === "healthy" ? "var(--meaning-green)" : statusLevel === "warning" ? "var(--meaning-amber)" : "var(--meaning-red)";

  return (
    <div
      className="px-4 py-2 flex items-center justify-between gap-4 text-sm shrink-0"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: pulseColor }} aria-hidden />
        <span style={{ color: "var(--text-primary)" }}>{statusMessage}</span>
        <span style={{ color: "var(--text-muted)" }}>·</span>
        <span style={{ color: "var(--text-muted)" }}>{maintained} conversation{maintained !== 1 ? "s" : ""} maintained</span>
      </div>
      {nextMin != null && nextMin > 0 && (
        <span style={{ color: "var(--text-secondary)" }}>Next attention in ~{nextMin} min</span>
      )}
    </div>
  );
}
