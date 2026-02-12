"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface CalendarCall {
  session_id: string;
  lead_id: string;
  probability: number;
  call_started_at: string;
  lead?: { name?: string; company?: string };
}

interface CalendarRiskData {
  next_48h?: {
    likely_no_shows: CalendarCall[];
    confirmation_needed: CalendarCall[];
    high_confidence: CalendarCall[];
  };
  total_calls?: number;
}

export default function CalendarPage() {
  const { workspaceId } = useWorkspace();
  const [data, setData] = useState<CalendarRiskData | null>(null);
  const [riskSurface, setRiskSurface] = useState<{ calendar_at_risk: Array<{ call_id: string; rescue_needed: boolean }> } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setData(null);
      setRiskSurface(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchWithFallback(`/api/calendar-risk?workspace_id=${encodeURIComponent(workspaceId)}`, {
        cacheKey: `calendar-risk-${workspaceId}`,
      }),
      fetchWithFallback(`/api/risk-surface?workspace_id=${encodeURIComponent(workspaceId)}`, {
        cacheKey: `risk-surface-${workspaceId}`,
      }),
    ])
      .then(([dResult, riskResult]) => {
        if (dResult.data) {
          const d = dResult.data as { next_48h?: CalendarRiskData["next_48h"]; total_calls?: number };
          if (d.next_48h) {
            setData({ next_48h: d.next_48h, total_calls: d.total_calls });
          }
        }
        if (riskResult.data && !(riskResult.data as { error?: unknown }).error) {
          setRiskSurface(riskResult.data as { calendar_at_risk: Array<{ call_id: string; rescue_needed: boolean }> });
        }
        // Keep previous state on error
      })
      .catch(() => {
        // Keep previous state
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const noShows = data?.next_48h?.likely_no_shows ?? [];
  const confirmationNeeded = data?.next_48h?.confirmation_needed ?? [];
  const highConfidence = data?.next_48h?.high_confidence ?? [];
  const rescueIds = new Set((riskSurface?.calendar_at_risk ?? []).filter((c) => c.rescue_needed).map((c) => c.call_id));
  const allCalls = [...noShows, ...confirmationNeeded, ...highConfidence].sort(
    (a, b) => new Date(a.call_started_at).getTime() - new Date(b.call_started_at).getTime()
  );

  function attendanceConfidence(c: CalendarCall): "Low" | "Medium" | "High" {
    if (noShows.some((n) => n.session_id === c.session_id)) return "Low";
    if (confirmationNeeded.some((n) => n.session_id === c.session_id)) return "Medium";
    return "High";
  }

  function preparationState(c: CalendarCall): "Prepared" | "Confirming" | "Monitoring" {
    if (noShows.some((n) => n.session_id === c.session_id)) return "Monitoring";
    if (confirmationNeeded.some((n) => n.session_id === c.session_id)) return "Confirming";
    if (highConfidence.some((h) => h.session_id === c.session_id)) return "Prepared";
    return "Monitoring";
  }

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-3xl">
        <PageHeader title="Calendar" subtitle="Attendance confidence and preparation state." />
        <EmptyState icon="watch" title="Watching for new conversations" subtitle="Maintaining continuity" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Calendar" subtitle="Attendance confidence and preparation state." />

      {/* Live system guarantee: Always show monitoring */}
      {!loading && allCalls.length === 0 && (
        <div className="mb-4 py-2 px-4 rounded-lg text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <span style={{ color: "var(--text-muted)" }}>Protecting upcoming attendance</span>
        </div>
      )}
      {loading ? (
        <LoadingState message="Watching over" submessage="Protecting booked calls. Continuity monitoring in progress." />
      ) : allCalls.length === 0 ? (
        <EmptyState icon="pulse" title="Protecting upcoming attendance" subtitle="We prepare each call when it lands on your calendar." />
      ) : (
        <div className="space-y-4">
          {allCalls.map((c) => {
            const confidence = attendanceConfidence(c);
            const prep = preparationState(c);
            const name = c.lead?.name ?? c.lead?.company ?? "—";
            return (
              <div
                key={c.session_id}
                className="p-5 rounded-xl"
                style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
                    {c.lead?.company && c.lead?.company !== name && (
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{c.lead.company}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>Attendance confidence: {confidence}</span>
                      <span className="flex items-center gap-1">
                        {rescueIds.has(c.session_id) && (
                          <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(243, 156, 18, 0.2)", color: "var(--meaning-amber)" }}>Recovering</span>
                        )}
                        <span>Preparation: {prep}</span>
                      </span>
                    </div>
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                      {new Date(c.call_started_at).toLocaleString()}
                    </p>
                    {new Date(c.call_started_at).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
                      <p className="text-xs mt-2" style={{ color: "var(--meaning-green)", opacity: 0.8 }}>
                        This conversation has been kept warm
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/leads/${c.lead_id}`}
                    className="text-sm font-medium shrink-0"
                    style={{ color: "var(--meaning-blue)" }}
                  >
                    View details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
