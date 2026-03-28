"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  PhoneForwarded,
  Phone,
  Users,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
} from "lucide-react";

interface Transfer {
  id: string;
  call_session_id: string;
  transfer_type: "cold" | "warm" | "conference";
  target_number: string;
  target_name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  initiated_at: string;
  completed_at: string | null;
  duration_seconds: number;
  reason: string;
  created_at: string;
}

interface TransferStats {
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
  by_type: { cold: number; warm: number; conference: number };
}

const TYPE_CONFIG: Record<string, { icon: typeof Phone; color: string; label: string }> = {
  cold: { icon: Phone, color: "rgb(59,130,246)", label: "Cold" },
  warm: { icon: PhoneForwarded, color: "rgb(16,185,129)", label: "Warm" },
  conference: { icon: Users, color: "rgb(139,92,246)", label: "Conference" },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "rgb(16,185,129)", bg: "rgba(16,185,129,0.1)", label: "Completed" },
  failed: { icon: XCircle, color: "rgb(239,68,68)", bg: "rgba(239,68,68,0.1)", label: "Failed" },
  in_progress: { icon: Loader2, color: "rgb(245,158,11)", bg: "rgba(245,158,11,0.1)", label: "In Progress" },
  pending: { icon: Clock, color: "rgb(107,114,128)", bg: "rgba(107,114,128,0.1)", label: "Pending" },
};

function maskPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return `***-***-${digits.slice(-4)}`;
  return phone;
}

export function CallTransferCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchTransfers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/transfers?workspace_id=${encodeURIComponent(workspaceId)}&days=${days}&limit=15`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setTransfers(json.transfers ?? []);
      setStats(json.stats ?? null);
    } catch {
      setTransfers([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, days]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const successRate = stats && stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div className="dash-section p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PhoneForwarded className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Call Transfers
          </h2>
          {stats && stats.total > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]">
              {stats.total}
            </span>
          )}
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Stats row */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-[var(--bg-hover)]">
            <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{stats.total}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">Total</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-[var(--bg-hover)]">
            <p className="text-lg font-bold text-emerald-500 tabular-nums">{successRate}%</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">Success</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-[var(--bg-hover)]">
            <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{stats.by_type.warm}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">Warm</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-[var(--bg-hover)]">
            <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{stats.by_type.conference}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">Conference</p>
          </div>
        </div>
      )}

      {/* Transfer list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-[var(--bg-hover)] animate-pulse" />
          ))}
        </div>
      ) : transfers.length === 0 ? (
        <div className="py-8 text-center">
          <PhoneForwarded className="w-8 h-8 mx-auto text-[var(--text-disabled)] mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">No call transfers yet</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Transfers are logged when the AI agent routes calls to human agents
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {transfers.map((t) => {
            const tc = TYPE_CONFIG[t.transfer_type] ?? TYPE_CONFIG.cold;
            const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.pending;
            const TypeIcon = tc.icon;
            const StatusIcon = sc.icon;
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${tc.color} 10%, transparent)` }}
                >
                  <TypeIcon className="w-4 h-4" style={{ color: tc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {t.target_name}
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--text-disabled)]" />
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">
                      {maskPhone(t.target_number)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: `color-mix(in srgb, ${tc.color} 10%, transparent)`, color: tc.color }}
                    >
                      {tc.label}
                    </span>
                    {t.reason && (
                      <span className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[150px]">
                        {t.reason}
                      </span>
                    )}
                    {t.duration_seconds > 0 && (
                      <span className="text-[11px] text-[var(--text-disabled)]">
                        {Math.floor(t.duration_seconds / 60)}:{String(t.duration_seconds % 60).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: sc.bg, color: sc.color }}
                  >
                    <StatusIcon className={`w-3 h-3 ${t.status === "in_progress" ? "animate-spin" : ""}`} />
                    {sc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
