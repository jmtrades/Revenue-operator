"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
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
    <div className="dash-section p-5 md:p-6">
      <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
      <div className="space-y-3">
        <div className="h-32 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        <div className="h-20 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
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

      // Determine setup steps based on data
      const setupSteps: SetupStep[] = [
        {
          id: "agent",
          label: "Configure operator",
          description: "Set up your AI voice operator with prompts and call handling rules. Required for all inbound and outbound calling.",
          completed: result.agent_configured ?? false,
          actionLabel: "Configure operator",
          actionHref: "/app/agents",
        },
        {
          id: "phone",
          label: "Set up phone number",
          description: "Connect your business phone number to receive and make calls. Required for voice and SMS capabilities.",
          completed: result.phone_number_configured ?? false,
          actionLabel: "Set up phone",
          actionHref: "/app/settings/phone",
        },
        {
          id: "call",
          label: "Make your first call",
          description: "Place your first outbound call to verify the operator works end-to-end.",
          completed: result.calls_answered > 0,
          actionLabel: "Test call",
          actionHref: "/app/agents",
          actionText: "Make test call from your agent",
        },
        {
          id: "appointment",
          label: "Book first appointment",
          description: "Enable the operator to qualify prospects and schedule meetings automatically. Requires operator + calendar setup.",
          completed: result.appointments_booked > 0,
          actionText: "Configure qualifying questions to enable auto-booking",
        },
        {
          id: "followups",
          label: "Enable follow-ups",
          description: "Set up automated SMS and email sequences to nurture leads. Requires phone number + email provider.",
          completed: result.follow_ups_sent > 0,
          actionLabel: "Enable follow-ups",
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

  // Hide card if setup is 100% complete
  if (isComplete) {
    return null;
  }

  return (
    <motion.div
      className="dash-section p-5 md:p-6 border border-[var(--border-default)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-surface)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Setup Progress</h2>
            <p className="text-xs text-[var(--text-tertiary)]">Complete your workspace setup</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--accent-primary)]">{progressPercent}%</div>
          <div className="text-xs text-[var(--text-tertiary)]">
            {completedCount} of {totalCount}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isCompleted = step.completed;
          return (
            <motion.div
              key={step.id}
              className="flex gap-3 items-start p-3 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/80 transition-colors"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--text-tertiary)]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium ${
                    isCompleted ? "text-emerald-400 line-through" : "text-[var(--text-primary)]"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{step.description}</p>

                {/* Action */}
                {!isCompleted && (step.actionHref || step.actionText) && (
                  <div className="mt-2">
                    {step.actionHref ? (
                      <Link
                        href={step.actionHref}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors"
                      >
                        {step.actionLabel || "Go to setup"}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)]">{step.actionText}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Call to Action */}
      {completedCount > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20">
          <p className="text-xs text-[var(--text-secondary)]">
            Complete {steps.filter(s => !s.completed).map(s => s.label).join(' and ')} to start processing leads automatically.
          </p>
        </div>
      )}
    </motion.div>
  );
}
