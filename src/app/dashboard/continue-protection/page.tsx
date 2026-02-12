"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, Card, CardHeader, CardBody, EmptyState, LoadingState } from "@/components/ui";

interface ContinuationContext {
  active_conversations: Array<{ id: string; name: string; company?: string }>;
  scheduled_follow_ups: { count: number; next_at: string | null };
  pending_confirmations: Array<{ id: string; lead_id: string; name: string; call_at: string }>;
  summary: { active_count: number; follow_ups_count: number; confirmations_count: number };
}

export default function ContinueProtectionPage() {
  const { workspaceId } = useWorkspace();
  const [context, setContext] = useState<ContinuationContext | null>(null);
  const [billingStatus, setBillingStatus] = useState<{ renewal_at?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [step, setStep] = useState<"interstitial" | "payment">("interstitial");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/billing/continuation-context?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
      fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => r.json()),
    ])
      .then(([ctx, status]) => {
        setContext(ctx?.error ? null : ctx);
        setBillingStatus(status?.error ? null : status);
      })
      .catch(() => { setContext(null); setBillingStatus(null); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <EmptyState title="Watching for new conversations" subtitle="Maintaining continuity" icon="watch" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <LoadingState message="Watching over" submessage="We maintain; you take the calls." />
      </div>
    );
  }


  const ctx = context as ContinuationContext | null;
  const activeCount = ctx?.summary?.active_count ?? 0;
  const followUpsCount = ctx?.summary?.follow_ups_count ?? 0;
  const confirmationsCount = ctx?.summary?.confirmations_count ?? 0;
  const hasWork = activeCount > 0 || followUpsCount > 0 || confirmationsCount > 0;

  return (
    <div className="p-8 max-w-xl mx-auto" style={{ color: "var(--text-primary)" }}>
      <PageHeader title="Keep protection active" subtitle="Coverage continues automatically. We maintain your conversations. You take the calls." />
      <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>
        Protection will continue automatically after your trial.
      </p>
      <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
        $0 today — trial ends in 14 days — pause anytime before renewal
      </p>

      <div className="space-y-4 mb-8">
        <Card>
          <CardHeader>Active conversations</CardHeader>
          <CardBody>
            {activeCount > 0 ? (
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {activeCount} conversation{activeCount !== 1 ? "s" : ""} currently being protected
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Watching over. Maintaining readiness for new conversations.</p>
            )}
            {ctx && ctx.active_conversations.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                {ctx.active_conversations.slice(0, 5).map((c) => (
                  <li key={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</li>
                ))}
                {ctx.active_conversations.length > 5 && (
                  <li>+{ctx.active_conversations.length - 5} more</li>
                )}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Scheduled follow-ups</CardHeader>
          <CardBody>
            {followUpsCount > 0 ? (
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {followUpsCount} follow-up{followUpsCount !== 1 ? "s" : ""} queued
                {ctx?.scheduled_follow_ups?.next_at && (
                  <span style={{ color: "var(--text-muted)" }}> · Next in ~{Math.max(1, Math.ceil((new Date(ctx.scheduled_follow_ups.next_at).getTime() - Date.now()) / 60000))} min</span>
                )}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Maintaining engagement intervals. Follow-ups will appear as planned.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Pending confirmations</CardHeader>
          <CardBody>
            {confirmationsCount > 0 ? (
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {confirmationsCount} attendance confirmation{confirmationsCount !== 1 ? "s" : ""} pending
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Confirming upcoming attendance. Protecting booked calls.</p>
            )}
            {ctx && ctx.pending_confirmations.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                {ctx.pending_confirmations.slice(0, 3).map((c) => (
                  <li key={c.id}>{c.name} · {new Date(c.call_at).toLocaleString()}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="p-4 rounded-xl mb-6" style={{ background: "rgba(243, 156, 18, 0.1)", borderColor: "var(--meaning-amber)", borderWidth: "1px" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {hasWork
            ? `${activeCount + followUpsCount + confirmationsCount} conversation${activeCount + followUpsCount + confirmationsCount !== 1 ? "s" : ""} will lose continuity within the next hour`
            : "Stopping protection interrupts ongoing work"}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Momentum fades if continuity stops. We maintain; you take the calls.
        </p>
      </div>

      {billingStatus?.renewal_at && (
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          Renewal: {new Date(billingStatus.renewal_at).toLocaleDateString()}. Pause protection anytime before renewal.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          disabled={checkoutLoading}
          onClick={async () => {
            setCheckoutLoading(true);
            try {
              const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  workspace_id: workspaceId,
                  success_url: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard?checkout=success`,
                  cancel_url: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/continue-protection`,
                }),
              });
              const data = await res.json();
              if (data.checkout_url) window.location.href = data.checkout_url;
            } catch {
              // fallback: continue protection without checkout (trial continues)
            } finally {
              setCheckoutLoading(false);
            }
          }}
          className="px-6 py-3 rounded-lg font-medium"
          style={{ background: "var(--meaning-green)", color: "#0E1116" }}
        >
          {checkoutLoading ? "Preparing…" : "Keep protection active"}
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-lg font-medium text-center"
          style={{ borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-secondary)" }}
        >
          Not now
        </Link>
      </div>

      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Coverage continues automatically. Pause protection anytime. Resume when ready.
      </p>
    </div>
  );
}
