"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { Shell } from "@/components/Shell";
import { HandoffList } from "@/components/HandoffList";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

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

export default function SituationPage() {
  const { workspaceId, workspaces } = useWorkspace();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [retention, setRetention] = useState<RetentionPayload | null>(null);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [beyondScope, setBeyondScope] = useState(false);
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
    ]).then(([capRes, retRes, handRes]) => {
      if (capRes.data) setCapsule(capRes.data);
      if (retRes.data) setRetention(retRes.data);
      if (handRes.data?.handoffs) {
        setHandoffs(handRes.data.handoffs);
        setBeyondScope(handRes.data.beyond_scope === true);
      }
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
  const searchParams = useSearchParams();
  const recordHref = `/dashboard/record${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const callsHref = `/dashboard/calls${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <Shell>
      <DashboardExecutionStateBanner />
      <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
        Handling active. Commitments secured. Compliance enforced. Confirmation recorded.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>—</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Active records</p>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>—</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Recent calls</p>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>—</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Pending follow-ups</p>
        </div>
      </div>
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
