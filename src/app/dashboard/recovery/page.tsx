"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import Link from "next/link";
import {
  PhoneMissed, Clock, DollarSign, CheckCircle2,
  AlertTriangle, Phone, MessageSquare, Calendar, TrendingUp,
  RefreshCw, Filter,
} from "lucide-react";

interface MissedCall {
  id: string;
  caller_name: string;
  caller_phone: string;
  called_at: string;
  status: "recovered" | "pending" | "lost" | "in_progress";
  estimated_value: number;
  recovery_method?: "ai_callback" | "sms_followup" | "manual";
  recovery_time_minutes?: number;
}

interface RecoveryStats {
  total_missed: number;
  recovered: number;
  pending: number;
  lost: number;
  total_revenue_recovered: number;
  avg_recovery_time_minutes: number;
  recovery_rate: number;
}

const STATUS_CONFIG = {
  recovered: { label: "Recovered", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
  in_progress: { label: "In Progress", color: "text-blue-400", bg: "bg-[var(--bg-card)]/60", border: "border-[var(--border-default)]", icon: RefreshCw },
  lost: { label: "Lost", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: AlertTriangle },
} as const;

// Demo data for when API returns empty
const DEMO_CALLS: MissedCall[] = [
  { id: "1", caller_name: "John Martinez", caller_phone: "(555) 123-4567", called_at: new Date(Date.now() - 3600000).toISOString(), status: "recovered", estimated_value: 450, recovery_method: "ai_callback", recovery_time_minutes: 3 },
  { id: "2", caller_name: "Sarah Johnson", caller_phone: "(555) 234-5678", called_at: new Date(Date.now() - 7200000).toISOString(), status: "recovered", estimated_value: 1200, recovery_method: "sms_followup", recovery_time_minutes: 12 },
  { id: "3", caller_name: "Mike Chen", caller_phone: "(555) 345-6789", called_at: new Date(Date.now() - 10800000).toISOString(), status: "pending", estimated_value: 350, recovery_method: undefined, recovery_time_minutes: undefined },
  { id: "4", caller_name: "Emily Davis", caller_phone: "(555) 456-7890", called_at: new Date(Date.now() - 14400000).toISOString(), status: "in_progress", estimated_value: 800, recovery_method: "ai_callback", recovery_time_minutes: undefined },
  { id: "5", caller_name: "Robert Williams", caller_phone: "(555) 567-8901", called_at: new Date(Date.now() - 86400000).toISOString(), status: "recovered", estimated_value: 600, recovery_method: "ai_callback", recovery_time_minutes: 5 },
  { id: "6", caller_name: "Unknown Caller", caller_phone: "(555) 678-9012", called_at: new Date(Date.now() - 172800000).toISOString(), status: "lost", estimated_value: 300, recovery_method: undefined, recovery_time_minutes: undefined },
];

const DEMO_STATS: RecoveryStats = {
  total_missed: 24,
  recovered: 18,
  pending: 3,
  lost: 3,
  total_revenue_recovered: 14200,
  avg_recovery_time_minutes: 6,
  recovery_rate: 75,
};

export default function MissedCallRecoveryPage() {
  const { workspaceId } = useWorkspace();
  const [calls, setCalls] = useState<MissedCall[]>(DEMO_CALLS);
  const [stats, setStats] = useState<RecoveryStats>(DEMO_STATS);
  const [filter, setFilter] = useState<string>("all");
  const [_isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      fetchWithFallback<{ calls: MissedCall[] }>(`/api/recovery/missed-calls?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<RecoveryStats>(`/api/recovery/stats?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
    ]).then(([callsRes, statsRes]) => {
      if (callsRes.data?.calls?.length) {
        setCalls(callsRes.data.calls);
        setIsLive(true);
      }
      if (statsRes.data && statsRes.data.total_missed > 0) {
        setStats(statsRes.data);
        setIsLive(true);
      }
    });
  }, [workspaceId]);

  const filteredCalls = filter === "all" ? calls : calls.filter((c) => c.status === filter);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Revenue Recovery
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Track and recover revenue from missed calls, no-shows, and stalled leads automatically.
          </p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="text-sm font-medium text-emerald-400 no-underline hover:underline"
        >
          View full analytics →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Revenue Recovered</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">${stats.total_revenue_recovered.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Recovery Rate</span>
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{stats.recovery_rate}%</p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Avg Recovery Time</span>
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{stats.avg_recovery_time_minutes}min</p>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2 mb-2">
            <PhoneMissed className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Pending Recovery</span>
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{stats.pending}</p>
        </div>
      </div>

      {/* Recovery Pipeline */}
      <div className="rounded-xl border p-4 mb-8" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Recovery Pipeline</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-lg font-bold text-amber-400 tabular-nums">{stats.total_missed}</p>
            <p className="text-xs text-amber-400/70">Total Missed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--bg-card)]/60 border border-[var(--border-default)]">
            <p className="text-lg font-bold text-blue-400 tabular-nums">{stats.pending}</p>
            <p className="text-xs text-blue-400/70">In Progress</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-lg font-bold text-emerald-400 tabular-nums">{stats.recovered}</p>
            <p className="text-xs text-emerald-400/70">Recovered</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-lg font-bold text-red-400 tabular-nums">{stats.lost}</p>
            <p className="text-xs text-red-400/70">Lost</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
        {["all", "recovered", "pending", "in_progress", "lost"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === f ? "var(--accent-primary)" : "rgba(255,255,255,0.05)",
              color: filter === f ? "#000" : "var(--text-secondary)",
              border: filter === f ? "1px solid var(--accent-primary)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Call List */}
      <div className="space-y-3">
        {filteredCalls.map((call) => {
          const config = STATUS_CONFIG[call.status];
          const StatusIcon = config.icon;
          return (
            <div
              key={call.id}
              className="rounded-xl border p-4 flex items-center gap-4 hover:border-[var(--border-default)] transition-colors"
              style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
            >
              <div className={`w-10 h-10 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}>
                <StatusIcon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {call.caller_name}
                  </p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {call.caller_phone}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {formatTime(call.called_at)}
                  </span>
                  {call.recovery_method && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                      {call.recovery_method === "ai_callback" && <><Phone className="w-3 h-3" /> AI Callback</>}
                      {call.recovery_method === "sms_followup" && <><MessageSquare className="w-3 h-3" /> SMS Follow-up</>}
                      {call.recovery_method === "manual" && <><Calendar className="w-3 h-3" /> Manual</>}
                    </span>
                  )}
                  {call.recovery_time_minutes !== undefined && (
                    <span className="text-xs text-emerald-400">
                      Recovered in {call.recovery_time_minutes}min
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums" style={{ color: call.status === "recovered" ? "var(--accent-primary)" : "var(--text-secondary)" }}>
                  ${call.estimated_value.toLocaleString()}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>est. value</p>
              </div>
              {call.status === "pending" && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shrink-0"
                >
                  Recover Now
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredCalls.length === 0 && (
        <div className="text-center py-12">
          <PhoneMissed className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No {filter === "all" ? "" : filter} calls to display.
          </p>
        </div>
      )}
    </div>
  );
}
