"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FlaskConical, TrendingUp, ArrowRight } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface ABTestVariant {
  sequence_id: string;
  name: string;
  status: string;
  enrolled: number;
  completed: number;
  converted: number;
  conversion_rate: number;
}

interface ABTest {
  group_id: string;
  trigger: string;
  variants: ABTestVariant[];
  leader: string | null;
  lift: number;
  is_significant: boolean;
  total_enrolled: number;
}

export function SequenceABTestCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(`/api/sequences/ab-tests?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tests?: ABTest[] } | null) => {
        setTests(data?.tests ?? []);
      })
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-48 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sequence A/B Testing</h2>
          </div>
          <Link
            href="/app/follow-ups"
            className="text-xs text-[var(--accent-primary)] font-medium hover:underline inline-flex items-center gap-1"
          >
            Start test <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No sequence A/B tests running. Clone a sequence to start testing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sequence A/B Testing</h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
            {tests.length} active
          </span>
        </div>
        <Link
          href="/app/follow-ups"
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {tests.slice(0, 3).map((test) => {
          const leader = test.variants.find((v) => v.sequence_id === test.leader);
          const _challenger = test.variants.find((v) => v.sequence_id !== test.leader);

          return (
            <div
              key={test.group_id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {test.variants[0]?.name} vs {test.variants[1]?.name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {test.total_enrolled.toLocaleString()} enrolled
                  </p>
                </div>
                {test.is_significant && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    Significant
                  </span>
                )}
              </div>

              {/* Conversion comparison bars */}
              <div className="space-y-2">
                {test.variants.map((variant) => (
                  <div key={variant.sequence_id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--text-secondary)]">{variant.name}</span>
                      <span className="font-medium tabular-nums text-[var(--text-primary)]">
                        {variant.conversion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-hover)]">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-[width]"
                        style={{ width: `${Math.min(100, variant.conversion_rate * 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {leader && test.lift > 0 && (
                <p className="text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-default)]">
                  <span className="font-medium text-amber-400">{leader.name}</span> is
                  converting{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {test.lift}% better
                  </span>
                  {test.is_significant
                    ? " with statistical significance"
                    : " — needs more data for confidence"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
