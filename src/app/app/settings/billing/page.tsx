"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CancelStep = 0 | 1 | 2 | 3 | 4;

export default function AppSettingsBillingPage() {
  const [cancelStep, setCancelStep] = useState<CancelStep>(0);
  const [usage, setUsage] = useState({ minutesUsed: 0, minutesLimit: 400, calls: 0, leads: 0, estRevenue: 0 });
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState("trial");
  const [renewalAt, setRenewalAt] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { id?: string | null; stats?: typeof usage } | null) => {
        setWorkspaceId(data?.id ?? null);
        if (data?.stats) setUsage(data.stats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { billing_status?: string; renewal_at?: string | null } | null) => {
        setBillingStatus(data?.billing_status ?? "trial");
        setRenewalAt(data?.renewal_at ?? null);
      })
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handlePauseCoverage = async () => {
    if (!workspaceId) return;
    setPausing(true);
    try {
      const res = await fetch("/api/billing/pause-coverage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setToast(data?.error ?? "Could not pause coverage.");
        return;
      }
      setBillingStatus("paused");
      setToast(data?.message ?? "Coverage paused.");
      setCancelStep(0);
    } catch {
      setToast("Could not pause coverage.");
    } finally {
      setPausing(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Billing</h1>
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 mb-4">
        <p className="text-sm font-medium text-white">Starter — $297/mo</p>
        <p className="text-xs text-zinc-500 mt-1">{usage.minutesUsed} / {usage.minutesLimit} min used</p>
        <p className="text-xs text-zinc-500 mt-1">
          Status: {billingStatus}{renewalAt ? ` · renews ${new Date(renewalAt).toLocaleDateString()}` : ""}
        </p>
      </div>
      <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-600 text-zinc-300 mb-4 block">Change plan</button>
        <p className="text-xs text-zinc-500 mb-4">Payment method: •••• 4242</p>
      <p className="text-sm text-zinc-400 mb-2">Invoice history</p>
      <div className="rounded-xl border border-zinc-800 p-3 mb-6">
        <p className="text-xs text-zinc-500">March 2026 — $297.00</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handlePauseCoverage} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-400 disabled:opacity-60">{pausing ? "Pausing…" : "Pause account"}</button>
        <button
          type="button"
          onClick={() => setCancelStep(1)}
          className="px-4 py-2 rounded-xl text-sm border border-red-900/50 text-red-400"
        >
          Cancel
        </button>
      </div>

      {cancelStep >= 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setCancelStep(0)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            {cancelStep === 1 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">Before you go</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  This month you captured {usage.leads} lead{usage.leads !== 1 ? "s" : ""} worth ~${usage.estRevenue.toLocaleString()}. Your plan costs $297. Are you sure?
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">Stay</button>
                  <button type="button" onClick={() => setCancelStep(2)} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium">Continue cancel</button>
                </div>
              </>
            )}
            {cancelStep === 2 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">Pause instead?</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Keep your number and settings for 30 days at $0. You can resume anytime.
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(3)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">No, continue</button>
                  <button type="button" onClick={() => { void handlePauseCoverage(); }} disabled={pausing || !workspaceId} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium disabled:opacity-60">{pausing ? "Pausing…" : "Pause for 30 days"}</button>
                </div>
              </>
            )}
            {cancelStep === 3 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">Downgrade to Starter?</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Stay on Starter at $297/mo with fewer minutes. You can upgrade again later.
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(4)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">No, cancel</button>
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm bg-white text-black font-medium">Keep Starter</button>
                </div>
              </>
            )}
            {cancelStep === 4 && (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">We&apos;re sorry to see you go</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Your data will be available for 30 days. You can reactivate from Settings.
                </p>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm border border-zinc-600 text-zinc-300">Back</button>
                  <button type="button" onClick={() => setCancelStep(0)} className="px-4 py-2 rounded-xl text-sm bg-red-600 text-white font-medium">Confirm cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
