"use client";

import { useEffect, useState, useCallback } from "react";
import { MailCheck, Phone, CalendarCheck, TrendingUp, Zap } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface AutomationMetrics {
  period: string;
  total_actions: number;
  sequences_active: number;
  follow_ups_sent: number;
  calls_made: number;
  appointments_booked: number;
  leads_recovered: number;
}

const EMPTY_METRICS: AutomationMetrics = {
  period: "24h",
  total_actions: 0,
  sequences_active: 0,
  follow_ups_sent: 0,
  calls_made: 0,
  appointments_booked: 0,
  leads_recovered: 0,
};

export function AutomationEngineCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [metrics, setMetrics] = useState<AutomationMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(
      `/api/dashboard/automation-activity?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AutomationMetrics | null) => {
        setMetrics(data ?? EMPTY_METRICS);
      })
      .catch(() => setMetrics(EMPTY_METRICS))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  const hasActivity = metrics.total_actions > 0;
  const pulsing = hasActivity ? "animate-pulse" : "";

  return (
    <div className="dash-section p-5 md:p-6 border-l-2 border-l-emerald-500">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className="w-5 h-5 text-emerald-400" />
            {hasActivity && (
              <span className={`absolute inset-0 rounded-full bg-emerald-400 opacity-30 ${pulsing}`} />
            )}
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Autonomous Operations Engine
          </h2>
          {hasActivity && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${pulsing}`} />
              ACTIVE
            </span>
          )}
        </div>
      </div>

      {!hasActivity ? (
        <div className="py-8 text-center">
          <Zap className="w-10 h-10 mx-auto mb-3 text-[var(--text-disabled)] opacity-30" />
          <p className="text-sm text-[var(--text-secondary)] mb-1 font-medium">
            Your automation engine is standing by
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            It will activate after your first calls
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Big stat */}
          <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-400/20 p-4">
            <p className="text-xs font-medium text-emerald-400 mb-1">Last 24 hours</p>
            <p className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
              {metrics.total_actions}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              autonomous actions executed
            </p>
          </div>

          {/* Breakdown grid 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <MailCheck className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Automations sent
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {metrics.follow_ups_sent}
              </p>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Phone className="w-3.5 h-3.5 text-purple-400" />
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Agent calls
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {metrics.calls_made}
              </p>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarCheck className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Opportunities booked
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {metrics.appointments_booked}
              </p>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Recovered
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {metrics.leads_recovered}
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-[var(--text-tertiary)] text-center pt-2 border-t border-[var(--border-default)]">
            Your AI engine works 24/7. Refresh to see latest activity.
          </p>
        </div>
      )}
    </div>
  );
}
