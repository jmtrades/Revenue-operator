"use client";

import { useEffect, useState } from "react";
import { AlertCircle, TrendingUp, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
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
  lifecycle_phase: string;
  hours_since_last_contact: number;
  computed_at: string;
}

interface AutonomousAction {
  id: string;
  action_type: string;
  executed_at: string;
  outcome?: string;
  details?: Record<string, unknown>;
}

interface LeadBrainPanelProps {
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
};

function getTemperature(
  urgency: number,
  intent: number,
  engagement: number
): { label: string; color: string } {
  const avg = (urgency + intent + engagement) / 3;
  if (avg >= 70) return { label: "Hot", color: "bg-red-500" };
  if (avg >= 50) return { label: "Warm", color: "bg-orange-500" };
  if (avg >= 30) return { label: "Cool", color: "bg-blue-500" };
  return { label: "Cold", color: "bg-gray-500" };
}

function getRiskBadgeVariant(flag: string): "error" | "warning" | "info" {
  if (flag === "anger" || flag === "opt_out") return "error";
  if (flag === "going_cold" || flag === "no_show_risk") return "warning";
  return "info";
}

function ScoreBar({
  label,
  value,
  isInverse = false,
}: {
  label: string;
  value: number;
  isInverse?: boolean;
}) {
  const getColor = () => {
    if (isInverse) {
      if (value >= 70) return "bg-emerald-500";
      if (value >= 50) return "bg-blue-500";
      return "bg-red-500";
    }
    if (value >= 80) return "bg-red-500";
    if (value >= 50) return "bg-orange-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold text-[var(--text-primary)]">{Math.round(value)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getColor()}`}
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

  useEffect(() => {
    async function fetchIntelligence() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/leads/${leadId}/intelligence`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Lead not found");
          } else {
            setError("Failed to load intelligence");
          }
          return;
        }
        const data = await response.json();
        setIntelligence(data.intelligence);
        setActions(data.recent_actions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load intelligence");
      } finally {
        setLoading(false);
      }
    }

    fetchIntelligence();
  }, [leadId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>Brain Intelligence</CardHeader>
        <CardBody className="space-y-6">
          <div className="space-y-3">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-2 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-2 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-2 w-full" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !intelligence) {
    return (
      <Card>
        <CardHeader>Brain Intelligence</CardHeader>
        <CardBody>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error || "Unable to load intelligence"}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const temp = getTemperature(
    intelligence.urgency_score,
    intelligence.intent_score,
    intelligence.engagement_score
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>Lead Temperature</CardHeader>
        <CardBody>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${temp.color}`} />
            <span className="text-lg font-semibold text-[var(--text-primary)]">{temp.label}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Scores</CardHeader>
        <CardBody className="space-y-4">
          <ScoreBar label="Urgency" value={intelligence.urgency_score} />
          <ScoreBar label="Intent" value={intelligence.intent_score} />
          <ScoreBar label="Engagement" value={intelligence.engagement_score} isInverse />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Probabilities</CardHeader>
        <CardBody className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">Conversion Probability</span>
            <span className="text-lg font-semibold text-emerald-400">
              {(intelligence.conversion_probability * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${intelligence.conversion_probability * 100}%` }}
            />
          </div>
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">Churn Risk</span>
            <span className="text-lg font-semibold text-red-400">
              {(intelligence.churn_risk * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${intelligence.churn_risk * 100}%` }}
            />
          </div>
        </CardBody>
      </Card>

      {intelligence.risk_flags.length > 0 && (
        <Card>
          <CardHeader>Risk Flags</CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {intelligence.risk_flags.map((flag) => (
              <Badge key={flag} variant={getRiskBadgeVariant(flag)} size="sm">
                {flag.replace(/_/g, " ")}
              </Badge>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>Next Best Action</CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[var(--text-primary)]">{intelligence.next_best_action}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{intelligence.action_reason}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="info" size="sm">
              {intelligence.action_timing}
            </Badge>
            <Badge variant="neutral" size="sm">
              {Math.round(intelligence.action_confidence * 100)}% confidence
            </Badge>
          </div>
        </CardBody>
      </Card>

      {actions.length > 0 && (
        <Card>
          <CardHeader>Recent Autonomous Activity</CardHeader>
          <CardBody className="space-y-3">
            {actions.slice(0, 5).map((action) => {
              const hoursAgo = Math.floor(
                (Date.now() - new Date(action.executed_at).getTime()) / (1000 * 60 * 60)
              );
              const timeLabel =
                hoursAgo === 0
                  ? "now"
                  : hoursAgo === 1
                    ? "1 hour ago"
                    : `${hoursAgo} hours ago`;

              return (
                <div key={action.id} className="flex items-start gap-3 pb-3 border-b border-[var(--border-default)] last:border-b-0 last:pb-0">
                  <span className="text-lg">{ACTION_ICONS[action.action_type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {action.action_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">{timeLabel}</span>
                    </div>
                    {action.outcome && (
                      <div className="mt-1">
                        <Badge
                          variant={action.outcome === "success" ? "success" : "warning"}
                          size="sm"
                        >
                          {action.outcome}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
