"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Target,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { motion } from "framer-motion";

interface PerformanceMetrics {
  calls_answered: number;
  appointments: number;
  follow_ups: number;
  minutes_used: number;
  conversion_rate: number;
}

interface AgentBenchmarksProps {
  workspaceId: string;
  agentId?: string;
}

const INDUSTRY_BENCHMARKS = {
  conversionRate: 0.12,
  avgCallDuration: 4.2,
  appointmentRate: 0.08,
  followUpRate: 0.45,
};

const EMPTY_METRICS: PerformanceMetrics = {
  calls_answered: 0,
  appointments: 0,
  follow_ups: 0,
  minutes_used: 0,
  conversion_rate: 0,
};

interface MetricRow {
  label: string;
  icon: React.ReactNode;
  agentValue: number | string;
  benchmark: number | string;
  unit: string;
  isAboveAverage: boolean;
}

export function AgentBenchmarks({
  workspaceId,
  agentId,
}: AgentBenchmarksProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(
      `/api/dashboard/summary?workspace_id=${encodeURIComponent(
        workspaceId
      )}`,
      {
        credentials: "include",
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PerformanceMetrics | null) => {
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
      <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-[var(--bg-hover)] mb-4" />
        <div className="h-40 rounded-lg bg-[var(--bg-hover)]" />
      </div>
    );
  }

  const hasData = metrics.calls_answered > 0;

  const avgCallDuration =
    metrics.calls_answered > 0
      ? metrics.minutes_used / metrics.calls_answered
      : 0;

  const appointmentRate =
    metrics.calls_answered > 0
      ? metrics.appointments / metrics.calls_answered
      : 0;

  const followUpRate =
    metrics.calls_answered > 0
      ? metrics.follow_ups / metrics.calls_answered
      : 0;

  const metricRows: MetricRow[] = [
    {
      label: "Conversion Rate",
      icon: <Target className="w-4 h-4" />,
      agentValue: `${(metrics.conversion_rate * 100).toFixed(1)}%`,
      benchmark: `${(INDUSTRY_BENCHMARKS.conversionRate * 100).toFixed(0)}%`,
      unit: "%",
      isAboveAverage:
        metrics.conversion_rate > INDUSTRY_BENCHMARKS.conversionRate,
    },
    {
      label: "Avg Call Duration",
      icon: <Clock className="w-4 h-4" />,
      agentValue: `${avgCallDuration.toFixed(1)}m`,
      benchmark: `${INDUSTRY_BENCHMARKS.avgCallDuration.toFixed(1)}m`,
      unit: "min",
      isAboveAverage:
        avgCallDuration > INDUSTRY_BENCHMARKS.avgCallDuration,
    },
    {
      label: "Appointment Rate",
      icon: <Target className="w-4 h-4" />,
      agentValue: `${(appointmentRate * 100).toFixed(1)}%`,
      benchmark: `${(INDUSTRY_BENCHMARKS.appointmentRate * 100).toFixed(0)}%`,
      unit: "%",
      isAboveAverage:
        appointmentRate > INDUSTRY_BENCHMARKS.appointmentRate,
    },
    {
      label: "Follow-up Rate",
      icon: <ArrowUp className="w-4 h-4" />,
      agentValue: `${(followUpRate * 100).toFixed(1)}%`,
      benchmark: `${(INDUSTRY_BENCHMARKS.followUpRate * 100).toFixed(0)}%`,
      unit: "%",
      isAboveAverage: followUpRate > INDUSTRY_BENCHMARKS.followUpRate,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="rounded-xl bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-hover)] border border-cyan-500/20 p-6 relative overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Ambient background effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div className="flex items-center gap-2 mb-6" variants={itemVariants}>
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Performance vs Industry
          </h2>
        </motion.div>

        {!hasData ? (
          <motion.div className="py-8 text-center" variants={itemVariants}>
            <div className="inline-flex p-3 rounded-lg bg-cyan-500/10 mb-3">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              Building performance profile
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Benchmarks appear after analyzing calls
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            variants={containerVariants}
          >
            {metricRows.map((metric, idx) => (
              <motion.div
                key={metric.label}
                variants={itemVariants}
                className="rounded-lg bg-[var(--bg-surface)]/50 border border-[var(--border-default)] p-4 space-y-2"
              >
                {/* Metric Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-cyan-400">
                      {metric.icon}
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {metric.label}
                    </p>
                  </div>
                  <motion.span
                    className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                      metric.isAboveAverage
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.3 + idx * 0.05 }}
                  >
                    {metric.isAboveAverage ? (
                      <>
                        <ArrowUp className="w-3 h-3" />
                        Above average
                      </>
                    ) : (
                      <>
                        <ArrowDown className="w-3 h-3" />
                        Below average
                      </>
                    )}
                  </motion.span>
                </div>

                {/* Values */}
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Agent</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {metric.agentValue}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">
                      Industry
                    </p>
                    <p className="text-lg text-[var(--text-secondary)]">
                      {metric.benchmark}
                    </p>
                  </div>
                </div>

                {/* Comparison Bar */}
                <div className="space-y-1.5">
                  <div className="h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden relative">
                    {/* Industry benchmark bar (background) */}
                    <motion.div
                      className="absolute h-full bg-cyan-500/30"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (metric.isAboveAverage ? 80 : 100) / 2)}%`,
                      }}
                      transition={{ delay: 0.4 + idx * 0.05, duration: 0.8 }}
                    />
                    {/* Agent performance bar (overlaid) */}
                    <motion.div
                      className={`h-full ${
                        metric.isAboveAverage
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : "bg-gradient-to-r from-cyan-500 to-cyan-400"
                      }`}
                      initial={{ width: 0 }}
                      animate={{
                        width: metric.isAboveAverage ? "100%" : "65%",
                      }}
                      transition={{ delay: 0.5 + idx * 0.05, duration: 1 }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
                    <span>Benchmark</span>
                    <span>Agent Performance</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
