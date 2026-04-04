"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Lightbulb, CheckCircle, ArrowRight } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import { apiFetch } from "@/lib/api";

interface Recommendation {
  id: string;
  type: "warning" | "opportunity" | "success";
  title: string;
  description: string;
  action_label: string;
  action_url: string;
  priority: number;
  estimated_impact_cents: number;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  revenue_at_risk_total_cents: number;
}

const EMPTY_RECOMMENDATIONS: Recommendation[] = [];

function RecommendationSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      ))}
    </div>
  );
}

const staggerContainer = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function RecommendationsCard({ workspaceId: propsWorkspaceId }: { workspaceId?: string }) {
  const ws = useWorkspaceSafe();
  const workspaceId = propsWorkspaceId || ws?.workspaceId || "";
  const [recommendations, setRecommendations] = useState<Recommendation[]>(EMPTY_RECOMMENDATIONS);
  const [revenueAtRiskTotal, setRevenueAtRiskTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    apiFetch<RecommendationsResponse>(
      `/api/dashboard/recommendations?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" }
    )
      .then((data) => {
        if (data && typeof data === "object" && "recommendations" in data) {
          setRecommendations(Array.isArray(data.recommendations) ? data.recommendations : EMPTY_RECOMMENDATIONS);
          setRevenueAtRiskTotal(data.revenue_at_risk_total_cents || 0);
        } else if (Array.isArray(data)) {
          // Backwards compatibility for old API format
          setRecommendations(data);
          setRevenueAtRiskTotal(0);
        } else {
          setRecommendations(EMPTY_RECOMMENDATIONS);
          setRevenueAtRiskTotal(0);
        }
      })
      .catch(() => {
        setRecommendations(EMPTY_RECOMMENDATIONS);
        setRevenueAtRiskTotal(0);
        setError(null); // Silent error handling
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <RecommendationSkeleton />
      </div>
    );
  }

  // Don't show card if no recommendations
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const displayCount = 5;
  const hasMore = recommendations.length > displayCount;
  const displayedRecommendations = recommendations.slice(0, displayCount);

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return AlertTriangle;
      case "opportunity":
        return Lightbulb;
      case "success":
        return CheckCircle;
      default:
        return AlertTriangle;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case "warning":
        return "border-l-amber-500";
      case "opportunity":
        return "border-l-blue-500";
      case "success":
        return "border-l-emerald-500";
      default:
        return "border-l-amber-500";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "warning":
        return "text-amber-500";
      case "opportunity":
        return "text-blue-500";
      case "success":
        return "text-emerald-500";
      default:
        return "text-amber-500";
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-amber-500/[0.06]";
      case "opportunity":
        return "bg-blue-500/[0.06]";
      case "success":
        return "bg-emerald-500/[0.06]";
      default:
        return "bg-amber-500/[0.06]";
    }
  };

  const getBorderHoverColor = (type: string) => {
    switch (type) {
      case "warning":
        return "border-amber-500/40";
      case "opportunity":
        return "border-blue-500/40";
      case "success":
        return "border-emerald-500/40";
      default:
        return "border-amber-500/40";
    }
  };

  const hasRevenueAtRisk = revenueAtRiskTotal > 0;

  return (
    <section className="dash-section p-5 md:p-6 border-l-4 border-l-indigo-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Actionable insights
          </h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
            {recommendations.length}
          </span>
        </div>
      </div>

      {hasRevenueAtRisk && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/30">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            ~${(revenueAtRiskTotal / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })} in recoverable revenue identified
          </p>
        </div>
      )}

      <motion.div
        className="space-y-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {displayedRecommendations.map((rec) => {
          const Icon = getIcon(rec.type);
          const borderColor = getBorderColor(rec.type);
          const iconColor = getIconColor(rec.type);
          const bgColor = getBgColor(rec.type);
          const _hoverBorderColor = getBorderHoverColor(rec.type);
          const impactDisplay = rec.estimated_impact_cents > 0 ? `$${(rec.estimated_impact_cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : null;

          return (
            <motion.div
              key={rec.id}
              variants={staggerItem}
              className={`group border border-[var(--border-default)] ${borderColor} rounded-lg p-3 transition-all hover:border-[var(--border-hover)] ${bgColor}`}
            >
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                      {rec.title}
                    </p>
                    {impactDisplay && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {impactDisplay}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {rec.description}
                  </p>
                  <Link
                    href={rec.action_url}
                    className={`inline-flex items-center gap-1 text-xs font-medium mt-2 transition-colors ${
                      rec.type === "warning"
                        ? "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                        : rec.type === "opportunity"
                          ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                    }`}
                  >
                    {rec.action_label}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {hasMore && (
        <Link
          href="/app/recommendations"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mt-3 transition-colors"
        >
          View all {recommendations.length} insights
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </section>
  );
}
