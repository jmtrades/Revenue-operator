"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings2,
  ChevronDown,
  ChevronRight,
  Shield,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Status = "ready" | "blocked" | "degraded" | "unconfigured";

interface ReadinessCheck {
  key: string;
  label: string;
  category: string;
  status: Status;
  detail: string;
  impact: string;
  action: string;
  href?: string;
  dependency_type: string;
}

interface CategorySummary {
  category: string;
  total: number;
  ready: number;
  blocked: number;
  degraded: number;
  unconfigured: number;
  overall: string;
}

interface ReadinessResponse {
  status: Status;
  total_checks: number;
  ready: number;
  blocked: number;
  degraded: number;
  unconfigured: number;
  percentage: number;
  critical_blocker: { key: string; label: string; action: string } | null;
  categories: CategorySummary[];
  checks: ReadinessCheck[];
}

const STATUS_CONFIG: Record<
  Status,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  ready: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Ready",
  },
  blocked: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Blocked",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Degraded",
  },
  unconfigured: {
    icon: Settings2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Not configured",
  },
};

function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color} ${config.bg}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CategorySection({
  category,
  checks,
}: {
  category: CategorySummary;
  checks: ReadinessCheck[];
}) {
  const [expanded, setExpanded] = useState(category.overall !== "ready");
  const ChevIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="border border-[var(--border-default)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <ChevIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {category.category}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {category.ready}/{category.total}
          </span>
        </div>
        <StatusBadge status={category.overall as Status} />
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-default)] divide-y divide-[var(--border-default)]">
          {checks.map((check) => {
            const config = STATUS_CONFIG[check.status];
            const Icon = config.icon;
            return (
              <div key={check.key} className="p-3 pl-9">
                <div className="flex items-start gap-2">
                  <Icon
                    className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${config.color}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {check.label}
                    </span>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      {check.detail}
                    </p>
                    {check.status !== "ready" && check.href && (
                      <Link
                        href={check.href}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent-primary)] hover:underline mt-1"
                      >
                        {check.action}{" "}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SystemReadiness({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      const result = await apiFetch<ReadinessResponse>(
        `/api/admin/system-readiness?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" }
      );
      setData(result);
      if (result.status === "ready") setCollapsed(true);
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
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="h-4 w-40 rounded bg-[var(--bg-hover)] mb-3 skeleton-shimmer" />
        <div className="h-2 rounded-full bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="space-y-2">
          <div className="h-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
          <div className="h-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const overallConfig = STATUS_CONFIG[data.status];

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${overallConfig.color}`} />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              System Readiness
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              {data.status === "ready"
                ? "All systems operational"
                : `${data.ready} of ${data.total_checks} checks passing`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-semibold ${overallConfig.color} tabular-nums`}>
            {data.percentage}%
          </span>
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-4">
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                data.status === "ready"
                  ? "bg-emerald-500"
                  : data.status === "blocked"
                    ? "bg-red-500"
                    : "bg-amber-500"
              }`}
              style={{ width: `${data.percentage}%` }}
            />
          </div>

          {/* Critical blocker */}
          {data.critical_blocker && (
            <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20">
              <p className="text-xs text-red-500 font-medium">
                {data.critical_blocker.label}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                {data.critical_blocker.action}
              </p>
            </div>
          )}

          {/* Categories */}
          <div className="space-y-2">
            {data.categories.map((cat) => (
              <CategorySection
                key={cat.category}
                category={cat}
                checks={data.checks.filter(
                  (c) => c.category === cat.category
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
