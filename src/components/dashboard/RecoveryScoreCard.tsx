"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, DollarSign, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { OperatorPercentile } from "./OperatorPercentile";

interface RecoveryScoreData {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  sub_scores: {
    speed_to_lead: number;
    follow_up_execution: number;
    no_show_recovery: number;
    stale_reactivation: number;
    conversion_depth: number;
  };
  estimated_monthly_recovery_cents: number;
  estimated_monthly_leakage_cents: number;
  confidence: "high" | "medium" | "low";
}

interface RecoveryScoreCardProps {
  workspaceId: string;
}

function CardSkeleton() {
  return (
    <div className="dash-section p-6 md:p-8 animate-pulse">
      <div className="h-6 w-48 rounded bg-[var(--bg-hover)] mb-6" />
      <div className="flex items-center justify-center mb-8">
        <div className="w-32 h-32 rounded-full bg-[var(--bg-hover)]" />
      </div>
      <div className="space-y-4">
        <div className="h-5 w-full rounded bg-[var(--bg-hover)]" />
        <div className="h-5 w-3/4 rounded bg-[var(--bg-hover)]" />
      </div>
    </div>
  );
}

function fmtMoney(cents: number): string {
  if (cents <= 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function RecoveryScoreCard({ workspaceId }: RecoveryScoreCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RecoveryScoreData | null>(null);

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<RecoveryScoreData>(
        `/api/dashboard/recovery-score?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" }
      );
      setData(result);
    } catch {
      setData(null);
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

  // Grade color mapping
  const gradeColors: Record<string, { glow: string; bg: string; text: string }> = {
    "A+": { glow: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-700" },
    A: { glow: "from-emerald-400 to-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    B: { glow: "from-blue-400 to-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    C: { glow: "from-amber-400 to-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
    D: { glow: "from-red-400 to-red-500", bg: "bg-red-50", text: "text-red-700" },
  };

  const colors = gradeColors[data.grade];

  // Score color for ring
  const getScoreColor = (score: number): string => {
    if (score >= 95) return "#10b981"; // emerald
    if (score >= 85) return "#10b981"; // emerald
    if (score >= 70) return "#3b82f6"; // blue
    if (score >= 55) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const scoreColor = getScoreColor(data.score);

  // Calculate ring stroke for circular progress
  const circumference = 2 * Math.PI * 45; // radius 45
  const strokeDashoffset = circumference - (data.score / 100) * circumference;

  // Sub-scores grid
  const subScoresItems = [
    { label: "Speed to Lead", value: data.sub_scores.speed_to_lead, icon: Zap },
    { label: "Follow-up Execution", value: data.sub_scores.follow_up_execution, icon: TrendingUp },
    { label: "No-Show Recovery", value: data.sub_scores.no_show_recovery, icon: Shield },
    { label: "Lead Reactivation", value: data.sub_scores.stale_reactivation, icon: TrendingUp },
    { label: "Conversion Depth", value: data.sub_scores.conversion_depth, icon: DollarSign },
  ];

  const confidenceColors: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-800 border-emerald-300",
    medium: "bg-amber-100 text-amber-800 border-amber-300",
    low: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="dash-section p-6 md:p-8 lg:col-span-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="w-7 h-7 text-[var(--accent-primary)]" />
            Revenue Recovery Score™
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Proprietary metric measuring revenue recovery performance
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-lg border font-medium text-sm ${confidenceColors[data.confidence]}`}
        >
          {data.confidence === "high" ? "High" : data.confidence === "medium" ? "Medium" : "Low"} confidence
        </div>
      </div>

      {/* Main Score Display with Ring */}
      <div className="flex flex-col lg:flex-row items-center gap-8 mb-10">
        {/* Circular Progress Ring */}
        <div className="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 transform -rotate-90 w-full h-full"
          >
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="var(--bg-hover)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              strokeLinecap="round"
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              filter="drop-shadow(0 0 8px rgba(0,0,0,0.1))"
            />
          </svg>

          {/* Center content */}
          <div className="text-center relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl font-bold text-[var(--text-primary)]"
            >
              {data.score}
            </motion.div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">out of 100</div>
          </div>
        </div>

        {/* Grade Badge & Financial Impact */}
        <div className="flex flex-col gap-6 flex-1">
          {/* Grade Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl border-2 ${colors.bg}`}
          >
            <div className={`text-4xl font-bold ${colors.text}`}>{data.grade}</div>
          </motion.div>

          {/* Operator Percentile Badge */}
          <OperatorPercentile workspaceId="" recoveryScore={data.score} />

          {/* Financial Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4"
          >
            {/* Recovery */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
              <p className="text-xs text-emerald-700 font-medium mb-1">Estimated Monthly Recovery</p>
              <p className="text-2xl font-bold text-emerald-900">{fmtMoney(data.estimated_monthly_recovery_cents)}</p>
            </div>

            {/* Risk */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
              <p className="text-xs text-amber-700 font-medium mb-1">Potential Revenue at Risk</p>
              <p className="text-2xl font-bold text-amber-900">{fmtMoney(data.estimated_monthly_leakage_cents)}</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sub-Scores Grid */}
      <div className="mt-10 pt-8 border-t border-[var(--border-default)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Score Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {subScoresItems.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * idx }}
                className="p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[var(--text-primary)]">{item.value}</span>
                  <span className="text-xs text-[var(--text-secondary))">/20</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
