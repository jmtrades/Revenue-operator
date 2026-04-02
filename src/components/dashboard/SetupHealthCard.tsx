"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle, Circle, ArrowRight, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Summary {
  agent_configured?: boolean;
  phone_number_configured?: boolean;
  calls_answered: number;
  appointments_booked: number;
  follow_ups_sent: number;
}

interface SetupStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  actionLabel?: string;
  actionHref?: string;
  actionText?: string;
}

interface SetupHealthCardProps {
  workspaceId: string;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="h-4 w-36 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
      <div className="h-2 rounded-full bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
      <div className="space-y-3">
        <div className="h-14 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        <div className="h-14 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    </div>
  );
}

export function SetupHealthCard({ workspaceId }: SetupHealthCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Summary | null>(null);
  const [steps, setSteps] = useState<SetupStep[]>([]);

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<Summary>(
        `/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" }
      );
      setData(result);

      const setupSteps: SetupStep[] = [
        {
          id: "agent",
          label: "Create your AI agent",
          description: "Set up your agent's voice, personality, and business rules.",
          completed: result.agent_configured ?? false,
          actionLabel: "Configure agent",
          actionHref: "/app/agents",
        },
        {
          id: "phone",
          label: "Connect a phone number",
          description: "Get a phone number so your agent can answer calls 24/7.",
          completed: result.phone_number_configured ?? false,
          actionLabel: "Set up phone",
          actionHref: "/app/settings/phone",
        },
        {
          id: "call",
          label: "Make your first call",
          description: "Test your agent by calling it to hear it in action.",
          completed: result.calls_answered > 0,
          actionLabel: "Make a test call",
          actionHref: "/app/agents",
        },
        {
          id: "appointment",
          label: "Book an appointment",
          description: "Your agent will book directly into your calendar.",
          completed: result.appointments_booked > 0,
          actionLabel: "Review calendar",
          actionHref: "/app/settings/agent",
        },
        {
          id: "followups",
          label: "Enable follow-up sequences",
          description: "Automate SMS and email follow-ups after calls.",
          completed: result.follow_ups_sent > 0,
          actionLabel: "Set up sequences",
          actionHref: "/app/follow-ups",
        },
      ];

      setSteps(setupSteps);
    } catch (error) {
      console.error("Failed to fetch setup health data:", error);
      setData(null);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <CardSkeleton />;
  }

  if (!data) {
    return null;
  }

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  if (isComplete) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Setup Progress
          </h2>
        </div>
        <span className="text-xs font-medium text-[var(--text-tertiary)]">
          {completedCount}/{totalCount} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-start gap-3 rounded-lg p-3 bg-[var(--bg-inset)]"
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-[var(--text-tertiary)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.completed
                    ? "text-[var(--text-tertiary)] line-through"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {step.label}
              </p>
              {!step.completed && (
                <>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {step.description}
                  </p>
                  {step.actionHref && (
                    <Link
                      href={step.actionHref}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline mt-1.5"
                    >
                      {step.actionLabel || "Set up"}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
