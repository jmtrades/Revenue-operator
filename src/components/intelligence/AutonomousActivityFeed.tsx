"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface AutonomousAction {
  id: string;
  action_type: string;
  executed_at: string;
  outcome?: string;
  details?: Record<string, unknown>;
  reason?: string;
  confidence?: number;
}

interface AutonomousActivityFeedProps {
  leadId: string;
}

const ACTION_ICONS: Record<string, string> = {
  sms: "📱",
  email: "📧",
  call: "📞",
  sequence: "⚡",
  reactivation: "🔄",
  escalation: "🚨",
  task: "✅",
  note: "📝",
  "brain-computed": "🧠",
};

const ACTION_LABELS: Record<string, string> = {
  sms: "SMS Sent",
  email: "Email Sent",
  call: "Call Made",
  sequence: "Sequence Started",
  reactivation: "Reactivation Campaign",
  escalation: "Escalated to Sales",
  task: "Task Created",
  note: "Note Added",
  "brain-computed": "Brain Computed",
};

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getOutcomeBadgeVariant(outcome?: string): "success" | "warning" | "error" | "info" {
  if (!outcome) return "info";
  const lower = outcome.toLowerCase();
  if (lower === "success" || lower === "delivered") return "success";
  if (lower === "pending" || lower === "queued") return "info";
  if (lower === "failed" || lower === "error") return "error";
  return "warning";
}

export function AutonomousActivityFeed({ leadId }: AutonomousActivityFeedProps) {
  const [actions, setActions] = useState<AutonomousAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActions() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/leads/${leadId}/intelligence`, { credentials: "include" });
        if (!response.ok) {
          if (response.status === 404) {
            setError("Lead not found");
          } else {
            setError("Temporarily unable to load brain activity — actions are still running");
          }
          return;
        }
        const data = await response.json();
        setActions(data.recent_actions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    }

    fetchActions();
  }, [leadId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>Autonomous Activity</CardHeader>
        <CardBody className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton variant="circular" className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton variant="text" className="h-3 w-32" />
                <Skeleton variant="text" className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>Autonomous Activity</CardHeader>
        <CardBody>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>Brain Activity</CardHeader>
        <CardBody>
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">
            Brain is standing by — actions will appear here as it manages this lead
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>Autonomous Activity</CardHeader>
      <CardBody>
        <div className="space-y-0 divide-y divide-[var(--border-default)]">
          {actions.slice(0, 10).map((action, index) => {
            const isBrainComputed = action.details?.["is_computed"] === true;
            const timeStr = formatRelativeTime(action.executed_at);
            const actionIcon = ACTION_ICONS[action.action_type] || "📌";
            const actionLabel =
              ACTION_LABELS[action.action_type] ||
              action.action_type.replace(/_/g, " ");

            return (
              <div
                key={action.id}
                className={`py-3 first:pt-0 last:pb-0 ${isBrainComputed ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-lg leading-none">{actionIcon}</span>
                    {index < actions.length - 1 && (
                      <div className="w-0.5 h-6 bg-[var(--border-default)] my-1" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {actionLabel}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {timeStr}
                        </p>
                      </div>
                      {isBrainComputed && (
                        <Badge variant="neutral" size="sm">
                          computed
                        </Badge>
                      )}
                    </div>

                    {action.reason && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-relaxed">{action.reason}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {action.outcome && (
                        <Badge
                          variant={getOutcomeBadgeVariant(action.outcome)}
                          size="sm"
                        >
                          {action.outcome}
                        </Badge>
                      )}
                      {action.confidence != null && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          action.confidence >= 0.7 ? "bg-emerald-500/10 text-emerald-400" :
                          action.confidence >= 0.4 ? "bg-orange-500/10 text-orange-400" :
                          "bg-red-500/10 text-red-400"
                        }`}>
                          {Math.round(action.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
