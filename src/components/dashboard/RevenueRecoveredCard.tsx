"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

interface RevenueMetrics {
  total_recovered: number;
  calls_answered: number;
  no_shows_recovered: number;
  reactivations: number;
}

export function RevenueRecoveredCard() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/analytics/revenue-recovered", {
          credentials: "include",
        });

        if (!res.ok) {
          // If the endpoint doesn't exist yet, show placeholder
          if (res.status === 404) {
            setMetrics({
              total_recovered: 0,
              calls_answered: 0,
              no_shows_recovered: 0,
              reactivations: 0,
            });
            return;
          }
          throw new Error("Failed to fetch revenue metrics");
        }

        const data = (await res.json()) as RevenueMetrics;
        setMetrics(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <div className="h-8 bg-[var(--bg-hover)] rounded w-40 mb-4 skeleton-shimmer" />
        <div className="h-16 bg-[var(--bg-hover)] rounded mb-4 skeleton-shimmer" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
          <div className="h-12 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
          <div className="h-12 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 flex flex-col items-center justify-center py-8 gap-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)]">!</div>
        <p className="text-sm text-[var(--text-secondary)]">Unable to load revenue metrics</p>
        <p className="text-xs text-[var(--text-muted)]">Try refreshing the page</p>
      </div>
    );
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(metrics.total_recovered);

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-tertiary)] mb-1">
            Revenue Recovered This Month
          </p>
          <p className="text-4xl font-bold text-green-500">{formattedAmount}</p>
        </div>
        {metrics.total_recovered > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-green-400">Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/5 border border-[var(--border-default)] p-3">
          <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
            Calls Answered
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {metrics.calls_answered}
          </p>
        </div>

        <div className="rounded-lg bg-white/5 border border-[var(--border-default)] p-3">
          <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
            No-Shows Recovered
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {metrics.no_shows_recovered}
          </p>
        </div>

        <div className="rounded-lg bg-white/5 border border-[var(--border-default)] p-3">
          <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
            Reactivations
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {metrics.reactivations}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
        <p className="text-xs text-[var(--text-secondary)]">
          Based on answered calls that would have been missed and recovered revenue impact
        </p>
      </div>
    </div>
  );
}
