"use client";

import { useEffect, useState, useCallback } from "react";
import { Brain, Zap, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface BrainDashboardStats {
  total_leads_with_intelligence: number;
  autonomous_actions_24h: number;
  autonomous_actions_7d: number;
  avg_conversion_probability: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  leads_with_risk_flags: number;
  top_actions: Array<{ action_type: string; count: number }>;
}

const EMPTY: BrainDashboardStats = {
  total_leads_with_intelligence: 0,
  autonomous_actions_24h: 0,
  autonomous_actions_7d: 0,
  avg_conversion_probability: 0,
  hot_leads: 0,
  warm_leads: 0,
  cold_leads: 0,
  leads_with_risk_flags: 0,
  top_actions: [],
};

export function AutonomousBrainCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [stats, setStats] = useState<BrainDashboardStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(`/api/dashboard/brain-stats?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BrainDashboardStats | null) => setStats(data ?? EMPTY))
      .catch(() => setStats(EMPTY))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  const hasData = stats.total_leads_with_intelligence > 0;

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Autonomous Revenue Brain
          </h2>
          {stats.autonomous_actions_24h > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              <Zap className="w-3 h-3" />
              {stats.autonomous_actions_24h} actions today
            </span>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="py-6 text-center">
          <Brain className="w-8 h-8 mx-auto mb-3 text-[var(--text-disabled)]" />
          <p className="text-sm text-[var(--text-secondary)] mb-1">
            Brain intelligence activates after your first leads
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            The autonomous brain will compute scores, detect risk, and execute actions automatically
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Temperature distribution */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Hot</p>
              </div>
              <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                {stats.hot_leads}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">high-intent leads</p>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Warm</p>
              </div>
              <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                {stats.warm_leads}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">nurturing</p>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Cool/Cold</p>
              </div>
              <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                {stats.cold_leads}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">reactivation queue</p>
            </div>
          </div>

          {/* Key metrics */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-[var(--text-secondary)]">Avg conversion probability</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">
              {(stats.avg_conversion_probability * 100).toFixed(0)}%
            </span>
          </div>

          {stats.leads_with_risk_flags > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-[var(--text-secondary)]">Leads with risk flags</span>
              </div>
              <span className="text-sm font-semibold text-orange-400">
                {stats.leads_with_risk_flags}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-[var(--text-secondary)]">Actions this week</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {stats.autonomous_actions_7d}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
