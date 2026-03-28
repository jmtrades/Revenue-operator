"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Shield, PhoneForwarded, Clock } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface EscalationEvent {
  id: string;
  call_session_id: string;
  level: "watch" | "warning" | "critical" | "escalate";
  risk_score: number;
  reason: string;
  action_taken: string;
  transferred: boolean;
  created_at: string;
}

export function EscalationLogCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [events, setEvents] = useState<EscalationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(
      `/api/analytics/escalations?workspace_id=${encodeURIComponent(
        workspaceId
      )}&limit=10`,
      {
        credentials: "include",
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { events?: EscalationEvent[] } | null) => {
        setEvents(data?.events ?? []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const getLevelColor = (level: EscalationEvent["level"]) => {
    switch (level) {
      case "watch":
        return { bg: "bg-yellow-500/10", text: "text-yellow-400", badge: "bg-yellow-500/20" };
      case "warning":
        return { bg: "bg-orange-500/10", text: "text-orange-400", badge: "bg-orange-500/20" };
      case "critical":
        return { bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/20" };
      case "escalate":
        return { bg: "bg-red-600/10", text: "text-red-500", badge: "bg-red-600/20" };
    }
  };

  const getLevelLabel = (level: EscalationEvent["level"]) => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const getRiskBarColor = (score: number) => {
    if (score >= 80) return "bg-red-600";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6 animate-pulse">
        <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[var(--bg-hover)]" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Escalation Log</h2>
        </div>
        <div className="py-8 text-center">
          <Shield className="w-10 h-10 text-green-400/40 mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">
            No escalations — your AI is handling calls smoothly
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Escalation Log</h2>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
          {events.length} recent
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const colors = getLevelColor(event.level);
          return (
            <div
              key={event.id}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  {/* Timeline dot */}
                  <div className="pt-0.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.bg} border border-[var(--border-default)]`} />
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.badge}`}>
                        {getLevelLabel(event.level)}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] font-medium mb-1 line-clamp-2">
                      {event.reason}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-1">
                      {event.action_taken}
                    </p>
                  </div>
                </div>

                {/* Transferred badge */}
                {event.transferred && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
                      <PhoneForwarded className="w-3 h-3" />
                      Transferred
                    </div>
                  </div>
                )}
              </div>

              {/* Risk score bar */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-tertiary)] min-w-fit">
                  Risk: {event.risk_score}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] ${getRiskBarColor(
                      event.risk_score
                    )}`}
                    style={{ width: `${Math.min(100, event.risk_score)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
