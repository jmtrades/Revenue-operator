"use client";

import { useEffect, useState } from "react";
import { Brain, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

interface DashboardSummary {
  calls_answered: number;
  appointments_booked: number;
  conversion_rate: number;
  follow_ups_sent: number;
  minutes_used: number;
}

interface AgentDossierProps {
  workspaceId: string;
  agentId: string;
}

const INDUSTRY_CONVERSION_BENCHMARK = 12;

export function AgentDossier({ workspaceId, agentId }: AgentDossierProps) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const summary = await apiFetch<DashboardSummary>(
          `/api/dashboard/summary?workspace_id=${workspaceId}`
        );
        setData(summary);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-2"
      >
        <div className="h-4 w-20 bg-[var(--bg-input)] rounded skeleton-shimmer" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-[var(--bg-input)] rounded skeleton-shimmer" />
          <div className="h-3 w-5/6 bg-[var(--bg-input)] rounded skeleton-shimmer" />
        </div>
      </motion.div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { calls_answered, appointments_booked, conversion_rate, follow_ups_sent, minutes_used } = data;

  // Determine performance color and accent
  const isAboveAverage = conversion_rate > INDUSTRY_CONVERSION_BENCHMARK;
  const followUpRate = calls_answered > 0 ? Math.round((follow_ups_sent / calls_answered) * 100) : 0;
  const strongFollowUpExecution = followUpRate > 45;

  // Determine accent color
  let accentColor = "border-amber-500/30";
  let textAccent = "text-amber-400/90";
  if (isAboveAverage) {
    accentColor = "border-emerald-500/30";
    textAccent = "text-emerald-400/90";
  }

  // Build dossier text
  const line1 = `This agent has handled ${calls_answered} calls and created ${appointments_booked} revenue opportunities since deployment.`;

  const conversionDiff = conversion_rate - INDUSTRY_CONVERSION_BENCHMARK;
  const line2 =
    conversion_rate > 0
      ? `Maintaining a ${conversion_rate}% conversion rate — ${
          isAboveAverage ? "above" : "below"
        } the ${INDUSTRY_CONVERSION_BENCHMARK}% industry average.`
      : "No conversion data yet.";

  const line3 = `${follow_ups_sent} automated recovery actions executed with ${minutes_used} minutes of operating time.`;

  // Determine strongest area or opportunity
  let line4 = "";
  if (isAboveAverage) {
    line4 = "Strongest performance area: above-average conversion.";
  } else if (strongFollowUpExecution) {
    line4 = "Strongest area: follow-up execution.";
  } else {
    line4 = "Opportunity: increasing follow-up rate could improve conversion.";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 relative overflow-hidden ${accentColor}`}
      style={{
        borderLeft: `3px solid ${isAboveAverage ? "rgb(16, 185, 129)" : "rgb(217, 119, 6)"}`,
      }}
    >
      {/* Subtle background accent */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          background: isAboveAverage ? "linear-gradient(135deg, rgb(16, 185, 129), transparent)" : "linear-gradient(135deg, rgb(217, 119, 6), transparent)",
        }}
      />

      <div className="relative z-10 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden />
          <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Agent Dossier</p>
        </div>

        {/* Dossier paragraph */}
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">
          {line1} {line2} {line3} {line4}
        </p>

        {/* Performance indicator */}
        <div className="flex items-center gap-2 pt-1 text-xs text-[var(--text-secondary)]">
          {isAboveAverage ? (
            <>
              <TrendingUp className={`w-3 h-3 ${textAccent}`} aria-hidden />
              <span>Above-average performance</span>
            </>
          ) : strongFollowUpExecution ? (
            <>
              <TrendingUp className={`w-3 h-3 ${textAccent}`} aria-hidden />
              <span>Strong follow-up execution</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3 text-amber-400/90" aria-hidden />
              <span>Opportunity to improve</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
