"use client";

import { useEffect, useState, useCallback } from "react";
import { Brain, Zap, TrendingUp, AlertTriangle, CheckCircle2, Activity, Shield } from "lucide-react";
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
  const totalManaged = stats.hot_leads + stats.warm_leads + stats.cold_leads;

  return (
    <div className="dash-section p-5 md:p-6 relative overflow-hidden">
      {/* Subtle gradient background to signal this is the brain */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] via-transparent to-emerald-500/[0.03] pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Revenue Brain
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {hasData ? "Actively managing your pipeline" : "Standing by"}
              </p>
            </div>
          </div>
          {hasData && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-400">Active</span>
            </div>
          )}
        </div>

        {!hasData ? (
          <div className="py-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
              <Brain className="w-5 h-5 text-violet-400/60" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Brain is standing by
            </p>
            <p className="text-xs text-[var(--text-tertiary)] max-w-[280px] mx-auto">
              When leads arrive, the brain will autonomously score them, decide the best action, execute follow-ups, and advance your pipeline — no manual work required.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active operations summary */}
            {stats.autonomous_actions_24h > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-[var(--text-primary)]">
                  <span className="font-semibold text-emerald-400">{stats.autonomous_actions_24h} actions</span>{" "}
                  executed today across {totalManaged} leads
                </p>
              </div>
            )}

            {/* Pipeline temperature */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Hot</p>
                </div>
                <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                  {stats.hot_leads}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">brain is pursuing</p>
              </div>

              <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Warm</p>
                </div>
                <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                  {stats.warm_leads}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">brain is nurturing</p>
              </div>

              <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Cool</p>
                </div>
                <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                  {stats.cold_leads}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">queued for reactivation</p>
              </div>
            </div>

            {/* Key metrics row */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-[var(--text-secondary)]">Conversion probability</span>
                </div>
                <span className="text-sm font-semibold text-emerald-400">
                  {(stats.avg_conversion_probability * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-[var(--text-secondary)]">Actions this week</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {stats.autonomous_actions_7d}
                </span>
              </div>

              {stats.leads_with_risk_flags > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs text-[var(--text-secondary)]">Risk flags detected</span>
                  </div>
                  <span className="text-sm font-semibold text-orange-400">
                    {stats.leads_with_risk_flags}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
