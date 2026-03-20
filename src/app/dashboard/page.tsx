"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { Shell } from "@/components/Shell";
import { HandoffList } from "@/components/HandoffList";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";
import { TrialGraceEndedBanner } from "@/components/TrialGraceEndedBanner";

interface Capsule {
  today: string[];
  proof: string[];
  reversion: string[];
  position: Record<string, unknown>;
}
interface RetentionPayload {
  recent_operation: string[];
  current_dependency: string[];
  if_disabled: string[];
}
interface Handoff {
  id: string;
  lead_id: string;
  who: string;
  when: string;
  decision_needed: string;
}
interface QuickStats {
  active_leads: number;
  recent_calls: number;
  pending_followups: number;
}
interface RevenueAtRisk {
  total_at_risk: number;
  avg_deal_value: number;
  categories: Array<{
    key: string;
    label: string;
    count: number;
    estimatedRevenue: number;
    action: string;
    actionLabel: string;
  }>;
}
interface KnowledgeGap {
  id: string;
  question: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
}

export default function SituationPage() {
  const searchParams = useSearchParams();
  const { workspaceId, workspaces } = useWorkspace();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [retention, setRetention] = useState<RetentionPayload | null>(null);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [beyondScope, setBeyondScope] = useState(false);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [revenueRisk, setRevenueRisk] = useState<RevenueAtRisk | null>(null);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setCapsule(null);
      setRetention(null);
      setHandoffs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchWithFallback<Capsule>(`/api/operational/operator-capsule?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<RetentionPayload>(`/api/operational/retention-intercept?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<{ handoffs: Handoff[]; beyond_scope?: boolean }>(`/api/handoffs?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<QuickStats>(`/api/dashboard/quick-stats?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<RevenueAtRisk>(`/api/dashboard/revenue-at-risk?workspace_id=${encodeURIComponent(workspaceId)}`),
      fetchWithFallback<{ gaps: KnowledgeGap[]; total: number }>(`/api/dashboard/knowledge-gaps?workspace_id=${encodeURIComponent(workspaceId)}`),
    ]).then(([capRes, retRes, handRes, statsRes, riskRes, gapsRes]) => {
      if (capRes.data) setCapsule(capRes.data);
      if (retRes.data) setRetention(retRes.data);
      if (handRes.data?.handoffs) {
        setHandoffs(handRes.data.handoffs);
        setBeyondScope(handRes.data.beyond_scope === true);
      }
      if (statsRes.data) setStats(statsRes.data);
      if (riskRes.data) setRevenueRisk(riskRes.data);
      if (gapsRes.data?.gaps) setGaps(gapsRes.data.gaps);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  if (workspaces.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8" style={{ background: "var(--background)" }}>
        <div className="max-w-lg text-center">
          <p className="text-lg" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
            Operation is not yet in place.
          </p>
          <Link
            href="/activate"
            className="mt-8 inline-block px-6 py-3 text-sm font-medium"
            style={{ color: "var(--meaning-blue)" }}
          >
            Start protection
          </Link>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-lg" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Normal conditions.
        </p>
      </Shell>
    );
  }

  if (handoffs.length > 0) {
    return (
      <Shell>
        <HandoffList handoffs={handoffs} beyondScope={beyondScope} />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>One moment…</p>
      </Shell>
    );
  }

  const CAP = 6;
  const currentStateFull = [...(capsule?.today ?? []), ...(capsule?.proof ?? [])].filter(Boolean);
  const recentChangeFull = retention?.recent_operation ?? [];
  const ifRemovedFull = [...(capsule?.reversion ?? []), ...(retention?.if_disabled ?? [])].filter(Boolean);
  const currentState = currentStateFull.slice(0, CAP);
  const recentChange = recentChangeFull.slice(0, CAP);
  const ifRemoved = ifRemovedFull.slice(0, CAP);
  const hasMoreCurrent = currentStateFull.length > CAP;
  const hasMoreRecent = recentChangeFull.length > CAP;
  const hasMoreRemoved = ifRemovedFull.length > CAP;
  const recordHref = `/dashboard/record${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const callsHref = `/dashboard/calls${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <Shell>
      <TrialGraceEndedBanner />
      <DashboardExecutionStateBanner />
      <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
        Handling active. Commitments secured. Compliance enforced. Confirmation recorded.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link href={`/dashboard/leads${searchParams.toString() ? `?${searchParams.toString()}` : ""}`} className="rounded-lg border p-4 transition-colors hover:border-emerald-500/30" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{stats?.active_leads ?? "—"}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Active leads</p>
        </Link>
        <Link href={callsHref} className="rounded-lg border p-4 transition-colors hover:border-emerald-500/30" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{stats?.recent_calls ?? "—"}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Calls this week</p>
        </Link>
        <Link href={`/dashboard/leads?filter=followup${searchParams.get("workspace_id") ? `&workspace_id=${searchParams.get("workspace_id")}` : ""}`} className="rounded-lg border p-4 transition-colors hover:border-emerald-500/30" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{stats?.pending_followups ?? "—"}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Pending follow-ups</p>
        </Link>
      </div>
      {/* Revenue At Risk Widget */}
      {revenueRisk && revenueRisk.categories.length > 0 && (
        <div className="mb-10 rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Revenue At Risk</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Estimated revenue leaking this week</p>
            </div>
            <p className="text-2xl font-bold text-red-400">${revenueRisk.total_at_risk.toLocaleString()}</p>
          </div>
          <div className="space-y-3">
            {revenueRisk.categories.map((cat) => (
              <div key={cat.key} className="flex items-center justify-between gap-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {cat.label}
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "rgb(239,68,68)" }}>
                      {cat.count}
                    </span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>~${cat.estimatedRevenue.toLocaleString()} at risk</p>
                </div>
                <Link
                  href={cat.action}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
                  style={{ background: "rgba(16,185,129,0.1)", color: "rgb(16,185,129)" }}
                >
                  {cat.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Gaps */}
      {gaps.length > 0 && (
        <div className="mb-10 rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>AI Knowledge Gaps</h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Your AI couldn&apos;t answer these questions. Add answers to make it smarter.</p>
          <div className="space-y-2">
            {gaps.slice(0, 5).map((gap) => (
              <div key={gap.id} className="flex items-center justify-between gap-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>&ldquo;{gap.question}&rdquo;</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Asked {gap.occurrences}x</p>
                </div>
                <Link
                  href={`/dashboard/agents?gap=${gap.id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
                  style={{ background: "rgba(59,130,246,0.1)", color: "rgb(59,130,246)" }}
                >
                  Add answer
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10">
        <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>Recent records</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <Link href={callsHref} style={{ color: "var(--meaning-blue)" }}>View all calls</Link>
          {" · "}
          <Link href={recordHref} style={{ color: "var(--text-muted)" }}>Record</Link>
        </p>
      </div>
      <div className="space-y-16 max-w-2xl">
        <section>
          <div className="border-b pb-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Current state
            </h2>
          </div>
          <div className="space-y-4">
            {currentState.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                No unresolved condition was present.
              </p>
            ) : (
              currentState.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))
            )}
            {hasMoreCurrent && (
              <p className="text-sm pt-2">
                <Link href={recordHref} style={{ color: "var(--text-muted)" }}>More in Record</Link>
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="border-b pb-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Recent change
            </h2>
          </div>
          <div className="space-y-4">
            {recentChange.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                No recent change recorded.
              </p>
            ) : (
              recentChange.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))
            )}
            {hasMoreRecent && (
              <p className="text-sm pt-2">
                <Link href={recordHref} style={{ color: "var(--text-muted)" }}>More in Record</Link>
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="border-b pb-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-medium" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              If removed
            </h2>
          </div>
          <div className="space-y-4">
            {ifRemoved.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                No dependency recorded.
              </p>
            ) : (
              ifRemoved.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))
            )}
            {hasMoreRemoved && (
              <p className="text-sm pt-2">
                <Link href={recordHref} style={{ color: "var(--text-muted)" }}>More in Record</Link>
              </p>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
