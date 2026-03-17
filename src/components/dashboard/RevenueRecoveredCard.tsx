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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-40 mb-4" />
        <div className="h-16 bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 bg-zinc-800 rounded" />
          <div className="h-12 bg-zinc-800 rounded" />
          <div className="h-12 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-sm text-zinc-500">Unable to load revenue metrics</p>
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-zinc-400 mb-1">
            Revenue Recovered This Month
          </p>
          <p className="text-4xl font-bold text-white">{formattedAmount}</p>
        </div>
        {metrics.total_recovered > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-green-400">Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <p className="text-xs font-medium text-zinc-400 mb-1">
            Calls Answered
          </p>
          <p className="text-lg font-bold text-white">
            {metrics.calls_answered}
          </p>
        </div>

        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <p className="text-xs font-medium text-zinc-400 mb-1">
            No-Shows Recovered
          </p>
          <p className="text-lg font-bold text-white">
            {metrics.no_shows_recovered}
          </p>
        </div>

        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <p className="text-xs font-medium text-zinc-400 mb-1">
            Reactivations
          </p>
          <p className="text-lg font-bold text-white">
            {metrics.reactivations}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          Based on answered calls that would have been missed and recovered revenue impact
        </p>
      </div>
    </div>
  );
}
