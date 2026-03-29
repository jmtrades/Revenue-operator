"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Brain, TrendingUp, BookOpen, MessageSquare, Shield } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface IntelligenceMetrics {
  knowledge_items: number;
  knowledge_items_added_this_month: number;
  topics_learned: string[];
  objection_patterns: number;
  avg_call_confidence: number;
  calls_analyzed: number;
  sentiment_positive_pct: number;
  common_questions: string[];
  improvement_trend: number; // percentage improvement over last month
}

const EMPTY_METRICS: IntelligenceMetrics = {
  knowledge_items: 0,
  knowledge_items_added_this_month: 0,
  topics_learned: [],
  objection_patterns: 0,
  avg_call_confidence: 0,
  calls_analyzed: 0,
  sentiment_positive_pct: 0,
  common_questions: [],
  improvement_trend: 0,
};

export function IntelligenceCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [metrics, setMetrics] = useState<IntelligenceMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(`/api/dashboard/intelligence?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: IntelligenceMetrics | null) => {
        setMetrics(data ?? EMPTY_METRICS);
      })
      .catch(() => setMetrics(EMPTY_METRICS))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  const hasData = metrics.calls_analyzed > 0;

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            AI Intelligence
          </h2>
          {metrics.improvement_trend > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              +{metrics.improvement_trend}%
            </span>
          )}
        </div>
        <Link
          href="/app/knowledge"
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          View all
        </Link>
      </div>

      {!hasData ? (
        <div className="py-6 text-center">
          <Brain className="w-8 h-8 mx-auto mb-3 text-[var(--text-disabled)]" />
          <p className="text-sm text-[var(--text-secondary)] mb-1">
            Your autonomous operator learns from every call
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Intelligence data will appear here after your first calls
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Key stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3 h-3 text-violet-400" />
                <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Knowledge</p>
              </div>
              <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                {metrics.knowledge_items}
              </p>
              {metrics.knowledge_items_added_this_month > 0 && (
                <p className="text-[10px] text-emerald-400 mt-0.5">
                  +{metrics.knowledge_items_added_this_month} this month
                </p>
              )}
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3 h-3 text-blue-400" />
                <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Analyzed</p>
              </div>
              <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                {metrics.calls_analyzed}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">calls</p>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3 h-3 text-emerald-400" />
                <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Confidence</p>
              </div>
              <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                {metrics.avg_call_confidence}%
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">avg score</p>
            </div>
          </div>

          {/* Topics learned */}
          {metrics.topics_learned.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
                Topics your AI has learned
              </p>
              <div className="flex flex-wrap gap-1.5">
                {metrics.topics_learned.slice(0, 8).map((topic) => (
                  <span
                    key={topic}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                  >
                    {topic}
                  </span>
                ))}
                {metrics.topics_learned.length > 8 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full text-[var(--text-tertiary)]">
                    +{metrics.topics_learned.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Objection patterns */}
          {metrics.objection_patterns > 0 && (
            <p className="text-xs text-[var(--text-tertiary)] pt-3 border-t border-[var(--border-default)]">
              <span className="font-medium text-[var(--text-secondary)]">
                {metrics.objection_patterns} objection patterns
              </span>{" "}
              identified from {metrics.calls_analyzed} calls &middot;{" "}
              <span className="text-emerald-400">
                {metrics.sentiment_positive_pct}% positive sentiment
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
