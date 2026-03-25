"use client";

import {
  PROGRESS_STAGES,
  getStageLabel,
  getStageIndex,
  type ProgressStage,
} from "@/lib/progress/conversation-progress";

interface ConversationProgressIndicatorProps {
  /** Current progress stage */
  stage: ProgressStage;
  /** Optional: stage that the action advances toward (for activity feed) */
  advancesToward?: ProgressStage | null;
  /** Compact mode for tight spaces */
  compact?: boolean;
  className?: string;
}

export function ConversationProgressIndicator({
  stage,
  advancesToward,
  compact = false,
  className = "",
}: ConversationProgressIndicatorProps) {
  const currentIndex = getStageIndex(stage);
  const advanceIndex = advancesToward != null ? getStageIndex(advancesToward) : null;

  return (
    <div
      className={`flex items-center gap-0.5 ${compact ? "text-xs" : "text-sm"} ${className}`}
      title={
        advancesToward
          ? `Moving toward ${getStageLabel(advancesToward)}`
          : `At ${getStageLabel(stage)}`
      }
    >
      {PROGRESS_STAGES.map((s, i) => {
        const idx = getStageIndex(s);
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isAdvancing = advanceIndex != null && idx === advanceIndex && idx > currentIndex;

        return (
          <span key={s} className="flex items-center">
            <span
              className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                isCompleted
                  ? "bg-emerald-900/50 text-emerald-400"
                  : isCurrent
                    ? "bg-amber-900/50 text-amber-400"
                    : isAdvancing
                      ? "bg-sky-900/50 text-sky-400"
                      : "bg-stone-800 text-stone-600"
              }`}
            >
              {getStageLabel(s)}
            </span>
            {i < PROGRESS_STAGES.length - 1 && (
              <span
                className={`mx-0.5 ${
                  isCompleted ? "text-emerald-500/60" : isCurrent ? "text-amber-500/60" : "text-stone-600"
                }`}
              >
                →
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
