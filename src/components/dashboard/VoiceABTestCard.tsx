"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FlaskConical, TrendingUp, ArrowRight } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface ABTestSummary {
  test_id: string;
  name: string;
  voice_a: string;
  voice_b: string;
  calls_a: number;
  calls_b: number;
  conversion_a: number;
  conversion_b: number;
  satisfaction_a: number;
  satisfaction_b: number;
  is_significant: boolean;
  winner: string | null;
  status: "running" | "completed";
}

export function VoiceABTestCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [tests, setTests] = useState<ABTestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(`/api/voice/ab-tests?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tests?: ABTestSummary[] } | null) => {
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
        <div className="h-5 w-36 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-20 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  const runningTests = tests.filter((t) => t.status === "running");

  if (runningTests.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Voice A/B Testing</h2>
          </div>
          <Link
            href="/app/settings/voices"
            className="text-xs text-[var(--accent-primary)] font-medium hover:underline inline-flex items-center gap-1"
          >
            Create test <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No active voice tests. A/B test different voices to find which converts best.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Voice A/B Testing</h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
            {runningTests.length} active
          </span>
        </div>
        <Link
          href="/app/settings/voices"
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {runningTests.slice(0, 3).map((test) => {
          const totalCalls = test.calls_a + test.calls_b;
          const leadingVoice =
            test.conversion_a > test.conversion_b ? test.voice_a : test.voice_b;
          const leadingConversion = Math.max(test.conversion_a, test.conversion_b);
          const trailingConversion = Math.min(test.conversion_a, test.conversion_b);
          const lift =
            trailingConversion > 0
              ? ((leadingConversion - trailingConversion) / trailingConversion) * 100
              : 0;

          return (
            <div
              key={test.test_id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {test.voice_a} vs {test.voice_b}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {totalCalls.toLocaleString()} calls
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
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)]">{test.voice_a}</span>
                    <span className="font-medium tabular-nums text-[var(--text-primary)]">
                      {test.conversion_a.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-hover)]">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-[width]"
                      style={{ width: `${Math.min(100, test.conversion_a * 2)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)]">{test.voice_b}</span>
                    <span className="font-medium tabular-nums text-[var(--text-primary)]">
                      {test.conversion_b.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-hover)]">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-[width]"
                      style={{ width: `${Math.min(100, test.conversion_b * 2)}%` }}
                    />
                  </div>
                </div>
              </div>

              {lift > 0 && (
                <p className="text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-default)]">
                  <span className="font-medium text-emerald-400">{leadingVoice}</span> is
                  converting{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {lift.toFixed(0)}% better
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
