"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Heart,
  Target,
  ArrowRight,
} from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface CoachingReport {
  id: string;
  call_session_id: string;
  overall_score: number;
  grade: string;
  talk_ratio: number;
  question_count: number;
  empathy_statements: number;
  close_attempts: number;
  insights: string[];
  created_at: string;
}

const gradeColors: Record<string, { bg: string; text: string; bar: string }> =
  {
    A: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      bar: "bg-emerald-500",
    },
    B: { bg: "bg-cyan-500/10", text: "text-cyan-400", bar: "bg-cyan-500" },
    C: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500" },
    D: { bg: "bg-orange-500/10", text: "text-orange-400", bar: "bg-orange-500" },
    F: { bg: "bg-red-500/10", text: "text-red-400", bar: "bg-red-500" },
  };

export function CoachingReportCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [reports, setReports] = useState<CoachingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(
      `/api/analytics/coaching?workspace_id=${encodeURIComponent(
        workspaceId
      )}&type=reports`,
      {
        credentials: "include",
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { reports?: CoachingReport[] } | null) => {
        setReports((data?.reports ?? []).sort((a, b) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }));
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-48 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-32 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Coaching Reports
            </h2>
          </div>
          <Link
            href="/app/analytics/coaching"
            className="text-xs text-[var(--accent-primary)] font-medium hover:underline inline-flex items-center gap-1"
          >
            View coaching <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No coaching reports yet. Reports appear after coaching sessions are
            analyzed.
          </p>
        </div>
      </div>
    );
  }

  const displayReports = reports.slice(0, 5);

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Coaching Reports
          </h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
            {reports.length} total
          </span>
        </div>
        <Link
          href="/app/analytics/coaching"
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {displayReports.map((report) => {
          const isExpanded = expandedId === report.id;
          const colors = gradeColors[report.grade] || gradeColors.C;
          const formattedDate = new Date(report.created_at).toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          );

          return (
            <div
              key={report.id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {formattedDate}
                    </p>
                    <span
                      className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}
                    >
                      {report.grade}
                    </span>
                  </div>
                  {report.insights.length > 0 && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {report.insights[0]}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : report.id)
                  }
                  className="ml-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Score bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-secondary)]">
                    Overall Score
                  </span>
                  <span className="font-medium tabular-nums text-[var(--text-primary)]">
                    {report.overall_score.toFixed(1)}/100
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-hover)]">
                  <div
                    className={`h-full rounded-full transition-[width] ${colors.bar}`}
                    style={{
                      width: `${Math.min(100, report.overall_score)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Talk ratio bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">
                    Talk Ratio
                  </span>
                  <span className="font-medium tabular-nums text-[var(--text-primary)]">
                    {report.talk_ratio.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-hover)]">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-[width]"
                    style={{
                      width: `${Math.min(100, report.talk_ratio)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="pt-3 border-t border-[var(--border-default)]">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                          Questions
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {report.question_count}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Heart className="w-3.5 h-3.5 text-red-400" />
                        <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                          Empathy
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {report.empathy_statements}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                          Closes
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {report.close_attempts}
                      </p>
                    </div>
                  </div>

                  {report.insights.length > 1 && (
                    <div className="pt-2 border-t border-[var(--border-default)]">
                      <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-2">
                        Key Insights
                      </p>
                      <ul className="space-y-1">
                        {report.insights.slice(0, 3).map((insight, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[var(--text-tertiary)] leading-relaxed"
                          >
                            • {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
