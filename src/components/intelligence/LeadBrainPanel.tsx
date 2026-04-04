"use client";

import { useEffect, useState } from "react";
import { AlertCircle, TrendingUp, Clock, CheckCircle2, AlertTriangle, Brain, Zap, Shield, Activity, PauseCircle, Play } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface LeadIntelligence {
  lead_id: string;
  urgency_score: number;
  intent_score: number;
  engagement_score: number;
  conversion_probability: number;
  churn_risk: number;
  risk_flags: string[];
  next_best_action: string;
  action_reason: string;
  action_confidence: number;
  action_timing: "immediate" | "scheduled" | "deferred";
  action_channel: string;
  lifecycle_phase: string;
  hours_since_last_contact: number;
  computed_at: string;
}

interface AutonomousAction {
  id: string;
  action_type: string;
  success?: boolean;
  details?: string;
  executed_at: string;
  confidence?: number;
  reason?: string;
}

interface LeadBrainPanelProps {
  leadId: string;
}

function getTemperature(
  urgency: number,
  intent: number,
  engagement: number
): { label: string; color: string; bgColor: string } {
  const avg = (urgency + intent + engagement) / 3;
  if (avg >= 70) return { label: "Hot", color: "text-red-400", bgColor: "bg-red-500/10" };
  if (avg >= 50) return { label: "Warm", color: "text-orange-400", bgColor: "bg-orange-500/10" };
  if (avg >= 30) return { label: "Cool", color: "text-blue-400", bgColor: "bg-blue-500/10" };
  return { label: "Cold", color: "text-gray-400", bgColor: "bg-gray-500/10" };
}

function getRiskBadgeVariant(flag: string): "error" | "warning" | "info" {
  if (flag === "anger" || flag === "opt_out_signal") return "error";
  if (flag === "going_cold" || flag === "no_show_risk") return "warning";
  return "info";
}

const ACTION_LABELS: Record<string, string> = {
  ask_clarification: "Clarifying needs via SMS",
  send_proof: "Sending proof of value",
  reframe_value: "Reframing the value proposition",
  book_call: "Scheduling a call",
  schedule_call: "Scheduling a call",
  schedule_followup: "Running follow-up sequence",
  reactivate_later: "Queuing for reactivation",
  escalate_human: "Escalating to your team",
};

const TIMING_LABELS: Record<string, string> = {
  immediate: "Executing now",
  scheduled: "Scheduled",
  deferred: "On hold",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold tabular-nums text-[var(--text-primary)]">{Math.round(value)}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[var(--bg-inset)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export function LeadBrainPanel({ leadId }: LeadBrainPanelProps) {
  const [intelligence, setIntelligence] = useState<LeadIntelligence | null>(null);
  const [actions, setActions] = useState<AutonomousAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseToggling, setPauseToggling] = useState(false);

  useEffect(() => {
    async function fetchIntelligence() {
      try {
        setLoading(true);
        setError(null);
        const [intelligenceRes, leadRes] = await Promise.all([
          fetch(`/api/leads/${leadId}/intelligence`),
          fetch(`/api/leads/${leadId}`),
        ]);

        if (!intelligenceRes.ok) {
          if (intelligenceRes.status === 404) {
            setError("Lead not found");
          } else {
            setError("Failed to load intelligence");
          }
          return;
        }

        const intelligenceData = await intelligenceRes.json();
        setIntelligence(intelligenceData.intelligence);
        setActions(intelligenceData.recent_actions || []);

        // Get pause state from lead metadata
        if (leadRes.ok) {
          const leadData = await leadRes.json();
          setIsPaused((leadData.metadata?.paused_for_followup ?? false) as boolean);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load intelligence");
      } finally {
        setLoading(false);
      }
    }

    fetchIntelligence();
  }, [leadId]);

  async function togglePauseState() {
    try {
      setPauseToggling(true);
      const newPausedState = !isPaused;
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused_for_followup: newPausedState }),
      });

      if (!response.ok) {
        throw new Error("Failed to update pause state");
      }

      setIsPaused(newPausedState);
    } catch (err) {
      console.error("Error toggling pause state:", err);
    } finally {
      setPauseToggling(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">AI Status</h3>
        </div>
        <Skeleton variant="text" className="h-16 w-full rounded-xl" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Autonomous management</h3>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-orange-500/[0.06] border border-orange-500/10 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
          <div>
            <p className="text-xs font-medium text-orange-400">AI temporarily unavailable</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Intelligence will resume automatically — lead is still being tracked</p>
          </div>
        </div>
      </section>
    );
  }

  if (!intelligence) {
    return null;
  }

  const temp = getTemperature(
    intelligence.urgency_score,
    intelligence.intent_score,
    intelligence.engagement_score
  );

  const actionLabel = ACTION_LABELS[intelligence.next_best_action] || intelligence.next_best_action.replace(/_/g, " ");
  const timingLabel = TIMING_LABELS[intelligence.action_timing] || intelligence.action_timing;
  const confidencePct = Math.round(intelligence.action_confidence * 100);
  const recentBrainActions = actions.filter((a) => a.action_type !== "brain_computed").slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Autonomous management
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={togglePauseState}
            disabled={pauseToggling}
            title={isPaused ? "Resume autonomous actions" : "Pause autonomous actions for this lead"}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors disabled:opacity-50"
            style={{
              background: isPaused ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
              color: isPaused ? "rgb(252, 165, 165)" : "rgb(134, 239, 172)",
              borderRadius: "0.375rem",
            }}
          >
            {isPaused ? (
              <>
                <PauseCircle className="w-3.5 h-3.5" />
                AI paused
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                AI active
              </>
            )}
          </button>
        </div>
      </div>

      {isPaused && (
        <div className="rounded-xl bg-orange-500/[0.06] border border-orange-500/10 px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-orange-400">AI paused</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Autonomous actions are paused. Resume to enable AI to take actions.</p>
          </div>
        </div>
      )}

      {/* Active management status */}
      <div className={`rounded-xl ${temp.bgColor} border border-[var(--border-default)] p-4`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${temp.color}`}>{temp.label}</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">·</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">{intelligence.lifecycle_phase}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {intelligence.action_timing === "immediate" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium text-emerald-400">{timingLabel}</span>
              </>
            ) : (
              <Badge variant="neutral" size="sm">{timingLabel}</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <p className="text-sm font-medium text-[var(--text-primary)]">{actionLabel}</p>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] ml-5.5 leading-relaxed">{intelligence.action_reason}</p>

        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border-default)] flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            confidencePct >= 70 ? "bg-emerald-500/10 text-emerald-400" :
            confidencePct >= 40 ? "bg-orange-500/10 text-orange-400" :
            "bg-red-500/10 text-red-400"
          }`}>
            {confidencePct}% confident
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[10px] text-[var(--text-tertiary)]">
            via {intelligence.action_channel}
          </span>
          {intelligence.hours_since_last_contact > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[10px] text-[var(--text-tertiary)]">
              {intelligence.hours_since_last_contact < 24
                ? `${Math.round(intelligence.hours_since_last_contact)}h since contact`
                : `${Math.round(intelligence.hours_since_last_contact / 24)}d since contact`}
            </span>
          )}
          {intelligence.computed_at && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[10px] text-[var(--text-tertiary)]" title={new Date(intelligence.computed_at).toLocaleString()}>
              <Clock className="w-2.5 h-2.5" />
              computed {(() => {
                const h = Math.floor((Date.now() - new Date(intelligence.computed_at).getTime()) / 3600000);
                return h === 0 ? "just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
              })()}
            </span>
          )}
        </div>
      </div>

      {/* Scores */}
      <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-1">Conversion</p>
            <p className="text-lg font-bold tabular-nums text-emerald-400">
              {(intelligence.conversion_probability * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-1">Churn risk</p>
            <p className={`text-lg font-bold tabular-nums ${intelligence.churn_risk > 0.5 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
              {(intelligence.churn_risk * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
          <ScoreBar label="Urgency" value={intelligence.urgency_score} />
          <ScoreBar label="Intent" value={intelligence.intent_score} />
          <ScoreBar label="Engagement" value={intelligence.engagement_score} />
        </div>
      </div>

      {/* Risk flags */}
      {intelligence.risk_flags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Shield className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          {intelligence.risk_flags.map((flag) => (
            <Badge key={flag} variant={getRiskBadgeVariant(flag)} size="sm">
              {flag.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      {/* Autonomous action log — what the brain has done */}
      {recentBrainActions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-violet-400" />
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Recent AI actions</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
            {recentBrainActions.map((action) => {
              const hoursAgo = Math.floor(
                (Date.now() - new Date(action.executed_at).getTime()) / (1000 * 60 * 60)
              );
              const timeLabel =
                hoursAgo === 0 ? "just now"
                  : hoursAgo < 24 ? `${hoursAgo}h ago`
                    : `${Math.floor(hoursAgo / 24)}d ago`;

              return (
                <div key={action.id} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {action.success !== false ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
                      )}
                      <span className="text-[var(--text-primary)] capitalize">
                        {action.action_type.replace(/_/g, " ")}
                      </span>
                      {action.success === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">retrying</span>
                      )}
                    </div>
                    <span className="text-[var(--text-tertiary)] shrink-0">{timeLabel}</span>
                  </div>
                  {(action.reason || action.details) && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 ml-5 leading-relaxed truncate" title={action.reason || action.details}>
                      {action.reason || action.details}
                    </p>
                  )}
                  {action.confidence != null && (
                    <span className={`inline-block ml-5 mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                      action.confidence >= 0.7 ? "bg-emerald-500/10 text-emerald-400" :
                      action.confidence >= 0.4 ? "bg-orange-500/10 text-orange-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      {Math.round(action.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
