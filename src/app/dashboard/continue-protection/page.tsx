"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

interface ContinuationContext {
  active_conversations: Array<{ id: string; name: string; company?: string }>;
  scheduled_follow_ups: { count: number; next_at: string | null };
  pending_confirmations: Array<{ id: string; lead_id: string; name: string; call_at: string }>;
  summary: { active_count: number; follow_ups_count: number; confirmations_count: number };
}

export default function ContinueProtectionPage() {
  const { workspaceId } = useWorkspace();
  const [context, setContext] = useState<ContinuationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"interstitial" | "payment">("interstitial");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/billing/continuation-context?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setContext(null);
        else setContext(d);
      })
      .catch(() => setContext(null))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <p className="text-stone-500">Select an account.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <p className="text-stone-500">Loading…</p>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-stone-50 mb-2">Allow ongoing work to continue</h1>
        <p className="text-stone-400 text-sm mb-6">
          Enter payment details. Protection continues automatically. Pause protection anytime.
        </p>
        <div className="p-6 rounded-xl bg-stone-900/80 border border-stone-800">
          <p className="text-stone-500 text-sm text-center">
            Payment form will appear here when Stripe is configured.
          </p>
          <p className="text-stone-600 text-xs text-center mt-2">
            For now, protection is active. <Link href="/dashboard" className="text-amber-400 hover:underline">Return to dashboard</Link>
          </p>
        </div>
        <button
          onClick={() => setStep("interstitial")}
          className="mt-6 text-stone-500 text-sm hover:text-stone-300"
        >
          ← Back
        </button>
      </div>
    );
  }

  const ctx = context as ContinuationContext | null;
  const activeCount = ctx?.summary?.active_count ?? 0;
  const followUpsCount = ctx?.summary?.follow_ups_count ?? 0;
  const confirmationsCount = ctx?.summary?.confirmations_count ?? 0;
  const hasWork = activeCount > 0 || followUpsCount > 0 || confirmationsCount > 0;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-50 mb-2">Keep protection active</h1>
      <p className="text-stone-400 text-sm mb-6">
        Allow ongoing work to continue. Payment feels like letting your team finish what they started.
      </p>

      <div className="space-y-4 mb-8">
        <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Active conversations</h2>
          {activeCount > 0 ? (
            <p className="text-stone-300 text-sm">
              {activeCount} conversation{activeCount !== 1 ? "s" : ""} currently being protected
            </p>
          ) : (
            <p className="text-stone-500 text-sm">No active conversations</p>
          )}
          {ctx && ctx.active_conversations.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-stone-500">
              {ctx.active_conversations.slice(0, 5).map((c) => (
                <li key={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</li>
              ))}
              {ctx.active_conversations.length > 5 && (
                <li>+{ctx.active_conversations.length - 5} more</li>
              )}
            </ul>
          )}
        </div>

        <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Scheduled follow-ups</h2>
          {followUpsCount > 0 ? (
            <p className="text-stone-300 text-sm">
              {followUpsCount} follow-up{followUpsCount !== 1 ? "s" : ""} queued
              {ctx?.scheduled_follow_ups?.next_at && (
                <span className="text-stone-500"> · Next in ~{Math.max(1, Math.ceil((new Date(ctx.scheduled_follow_ups.next_at!).getTime() - Date.now()) / 60000))} min</span>
              )}
            </p>
          ) : (
            <p className="text-stone-500 text-sm">No follow-ups scheduled</p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
          <h2 className="text-sm font-medium text-stone-400 mb-2">Pending confirmations</h2>
          {confirmationsCount > 0 ? (
            <p className="text-stone-300 text-sm">
              {confirmationsCount} attendance confirmation{confirmationsCount !== 1 ? "s" : ""} pending
            </p>
          ) : (
            <p className="text-stone-500 text-sm">No pending confirmations</p>
          )}
          {ctx && ctx.pending_confirmations.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-stone-500">
              {ctx.pending_confirmations.slice(0, 3).map((c) => (
                <li key={c.id}>{c.name} · {new Date(c.call_at).toLocaleString()}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 mb-6">
        <p className="text-amber-200 text-sm font-medium">Stopping protection may interrupt this work</p>
        <p className="text-amber-300/80 text-xs mt-1">
          Follow-ups won&apos;t send. Confirmations won&apos;t go out. Conversations will go cold.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => setStep("payment")}
          className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950"
        >
          Continue to payment
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-lg border border-stone-600 text-stone-300 hover:bg-stone-800/80 font-medium text-center"
        >
          Not now
        </Link>
      </div>

      <p className="mt-4 text-stone-500 text-xs">
        Payment allows ongoing work to continue. Pause protection anytime — no subscription to cancel.
      </p>
    </div>
  );
}
