"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Zap,
  MessageSquare,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface IntelligenceMetrics {
  knowledge_items: number;
  knowledge_items_added_this_month: number;
  topics_learned: string[];
  objection_patterns: number;
  avg_call_confidence: number;
  calls_analyzed: number;
  sentiment_positive_pct: number;
  common_questions: string[];
  improvement_trend: number;
}

interface AgentIntelligencePanelProps {
  workspaceId: string;
  agentId?: string;
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

export function AgentIntelligencePanel({
  workspaceId,
  agentId: _agentId,
}: AgentIntelligencePanelProps) {
  const [metrics, setMetrics] = useState<IntelligenceMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const calculateIntelligenceScore = useCallback(
    (m: IntelligenceMetrics): number => {
      if (m.calls_analyzed === 0) return 0;
      const knowledgeScore = Math.min((m.knowledge_items / 100) * 40, 40);
      const callsScore = Math.min((m.calls_analyzed / 50) * 30, 30);
      const confidenceScore = (m.avg_call_confidence / 100) * 30;
      return Math.round(knowledgeScore + callsScore + confidenceScore);
    },
    []
  );

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(
      `/api/dashboard/intelligence?workspace_id=${encodeURIComponent(
        workspaceId
      )}`,
      {
        credentials: "include",
      }
    )
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
      <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-6">
        <div className="h-6 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-20 rounded-lg bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-32 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  const hasData = metrics.calls_analyzed > 0;
  const score = calculateIntelligenceScore(metrics);
  const scorePercentage = (score / 100) * 100;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="rounded-xl bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-hover)] border border-violet-500/20 p-6 relative overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Ambient background effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div className="flex items-center gap-2 mb-6" variants={itemVariants}>
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Agent Intelligence
          </h2>
          {metrics.improvement_trend > 0 && (
            <motion.span
              className="ml-auto flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <ArrowUpRight className="w-3 h-3" />
              +{metrics.improvement_trend}%
            </motion.span>
          )}
        </motion.div>

        {!hasData ? (
          <motion.div className="py-8 text-center" variants={itemVariants}>
            <div className="inline-flex p-3 rounded-lg bg-violet-500/10 mb-3">
              <Brain className="w-6 h-6 text-violet-400" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              Learning from every call
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Intelligence metrics appear after analyzing calls
            </p>
          </motion.div>
        ) : (
          <motion.div className="space-y-6" variants={containerVariants}>
            {/* Intelligence Score */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">
                  Intelligence Score
                </p>
                <motion.span
                  className="text-4xl font-bold text-violet-400 tabular-nums"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {score}
                </motion.span>
              </div>
              <motion.div
                className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                style={{ originX: 0 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${scorePercentage}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                />
              </motion.div>
            </motion.div>

            {/* Three Column Stats */}
            <motion.div
              className="grid grid-cols-3 gap-3"
              variants={containerVariants}
            >
              {/* Knowledge Coverage */}
              <motion.div
                className="rounded-lg bg-[var(--bg-surface)]/50 border border-violet-500/30 p-3"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                  <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                    KNOWLEDGE
                  </p>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {metrics.knowledge_items}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  {metrics.topics_learned.length} topics
                </p>
              </motion.div>

              {/* Call Analysis */}
              <motion.div
                className="rounded-lg bg-[var(--bg-surface)]/50 border border-blue-500/30 p-3"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                    CALLS
                  </p>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {metrics.calls_analyzed}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  analyzed
                </p>
              </motion.div>

              {/* Confidence */}
              <motion.div
                className="rounded-lg bg-[var(--bg-surface)]/50 border border-emerald-500/30 p-3"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                    CONFIDENCE
                  </p>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {metrics.avg_call_confidence}%
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  avg score
                </p>
              </motion.div>
            </motion.div>

            {/* Knowledge Coverage Tags */}
            {metrics.topics_learned.length > 0 && (
              <motion.div variants={itemVariants}>
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2.5">
                  Topics Covered
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.topics_learned.slice(0, 6).map((topic, idx) => (
                    <motion.span
                      key={topic}
                      className="text-[11px] px-2 py-1 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 font-medium"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + idx * 0.05 }}
                    >
                      {topic}
                    </motion.span>
                  ))}
                  {metrics.topics_learned.length > 6 && (
                    <motion.span className="text-[11px] text-[var(--text-tertiary)] px-2 py-1">
                      +{metrics.topics_learned.length - 6} more
                    </motion.span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Objection Handling & Sentiment */}
            {metrics.objection_patterns > 0 && (
              <motion.div
                className="pt-3 border-t border-[var(--border-default)]"
                variants={itemVariants}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {metrics.objection_patterns} objection patterns
                    </span>{" "}
                    identified
                  </p>
                  <motion.span
                    className="text-xs font-semibold text-emerald-400 flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    {metrics.sentiment_positive_pct}%
                    <span className="text-[10px]">positive</span>
                  </motion.span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
