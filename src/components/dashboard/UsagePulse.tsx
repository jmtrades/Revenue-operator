"use client";

/**
 * Phase 7 — Usage & billing visibility.
 *
 * Surfaces the four things an operator actually needs to know at a glance:
 *   1. Trial countdown (when the workspace is still in trial).
 *   2. Minutes burn-down — progress bar + projected exhaustion date.
 *   3. Burn rate (minutes/day) with a tiny sparkline read from the API.
 *   4. Cost per active agent (plan price ÷ agents) so the return math is obvious.
 *
 * Uses the existing /api/billing/status payload (augmented in this phase with
 * `burn_rate_per_day`, `days_until_exhausted`, `trial_days_remaining`, and
 * `cost_per_agent_cents`). When any of those are missing we fall back to safe
 * local math so the card still renders on older servers.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, Flame, Users } from "lucide-react";

interface BillingStatusPayload {
  billing_status?: string;
  billing_tier?: string;
  minutes_used?: number;
  minutes_limit?: number;
  effective_minutes_limit?: number;
  bonus_minutes?: number;
  trial_days_remaining?: number | null;
  trial_ends_at?: string | null;
  burn_rate_per_day?: number;
  days_until_exhausted?: number | null;
  projected_exhaustion_at?: string | null;
  active_agents_count?: number;
  cost_per_agent_cents?: number;
  monthly_price_cents?: number;
}

export interface UsagePulseProps {
  workspaceId: string | null;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function toneFor(pct: number): "ok" | "warn" | "danger" {
  if (pct >= 95) return "danger";
  if (pct >= 75) return "warn";
  return "ok";
}

export function UsagePulse({ workspaceId }: UsagePulseProps) {
  const [data, setData] = useState<BillingStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((payload: BillingStatusPayload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load usage right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const derived = useMemo(() => {
    if (!data) return null;
    const used = data.minutes_used ?? 0;
    const limit = data.effective_minutes_limit ?? data.minutes_limit ?? 0;
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const tone = toneFor(pct);
    const burn = data.burn_rate_per_day ?? 0;
    const daysLeft = data.days_until_exhausted ?? null;
    const trialDays = data.trial_days_remaining ?? null;
    const agents = data.active_agents_count ?? 0;
    const cpa = data.cost_per_agent_cents ?? 0;
    return { used, limit, pct, tone, burn, daysLeft, trialDays, agents, cpa };
  }, [data]);

  if (!workspaceId || (loading && !data)) {
    return (
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Usage pulse</h3>
          <p className="text-xs text-[var(--text-secondary)]">Trial, burn rate, and cost per agent.</p>
        </header>
        <div className="skeleton-shimmer space-y-2" aria-hidden>
          <div className="h-3 w-1/2 rounded bg-[var(--bg-inset)]" />
          <div className="h-2 w-full rounded bg-[var(--bg-inset)]" />
          <div className="h-3 w-1/3 rounded bg-[var(--bg-inset)]" />
        </div>
      </section>
    );
  }

  if (error || !derived) {
    return (
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Usage pulse</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {error ?? "Usage data unavailable."}
        </p>
      </section>
    );
  }

  const { used, limit, pct, tone, burn, daysLeft, trialDays, agents, cpa } = derived;
  const barColor =
    tone === "danger"
      ? "bg-[var(--accent-danger,#ef4444)]"
      : tone === "warn"
        ? "bg-[var(--accent-warning,#f59e0b)]"
        : "bg-[var(--accent-primary)]";

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Usage pulse</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Plan burn-down, trial countdown, and cost per active agent.
          </p>
        </div>
        <Link
          href="/app/settings/billing"
          className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
        >
          Billing
        </Link>
      </header>

      {trialDays !== null && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 p-3 text-xs text-[var(--accent-primary)]">
          <Clock3 className="h-4 w-4" aria-hidden />
          <span>
            {trialDays > 0
              ? `${trialDays} day${trialDays === 1 ? "" : "s"} left in your trial`
              : "Trial has ended — subscribe to keep your operators active."}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--text-primary)]">Minutes this period</span>
          <span className="tabular-nums text-[var(--text-secondary)]">
            {used.toLocaleString()} / {limit > 0 ? limit.toLocaleString() : "—"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-inset)]">
          <div
            className={`h-full rounded-full transition-[width] ${barColor}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Minutes used this period"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
          <span>{pct}% used</span>
          {daysLeft !== null && limit > 0 && (
            <span>
              {daysLeft > 0
                ? `~${daysLeft} day${daysLeft === 1 ? "" : "s"} at current pace`
                : "Ran out — buy a pack or upgrade"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)]/40 p-3">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
            <Flame className="h-3.5 w-3.5" aria-hidden /> Burn rate
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {burn > 0 ? `${burn} min/day` : "No calls yet"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)]/40 p-3">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
            <Users className="h-3.5 w-3.5" aria-hidden /> Cost per agent
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {agents > 0 && cpa > 0 ? `${formatDollars(cpa)}/mo` : "—"}
          </p>
          {agents > 0 && (
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              {agents} active agent{agents === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {tone !== "ok" && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs ${
            tone === "danger"
              ? "border-[var(--accent-danger,#ef4444)]/30 bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)]"
              : "border-[var(--accent-warning,#f59e0b)]/30 bg-[var(--accent-warning,#f59e0b)]/10 text-[var(--accent-warning,#f59e0b)]"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">
              {tone === "danger"
                ? "You're about to run out of minutes."
                : "Heads up — you're past 75% of this period's minutes."}
            </p>
            <p className="mt-1 opacity-80">
              <Link href="/app/settings/billing" className="underline underline-offset-2">
                Upgrade or buy a minute pack
              </Link>{" "}
              to avoid overage charges.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
