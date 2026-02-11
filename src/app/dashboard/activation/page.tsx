"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

interface ActivationState {
  step: string;
  activated_at: string | null;
  zoom_connected?: boolean;
  zoom_configured?: boolean;
  weekly_call_target?: number | null;
}

export default function ActivationPage() {
  const { workspaceId } = useWorkspace();
  const [state, setState] = useState<ActivationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProgressive, setShowProgressive] = useState(false);
  const [targetInput, setTargetInput] = useState<string>("5");

  const load = () => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        setState(d);
        setTargetInput(String(d?.weekly_call_target ?? "5"));
        setShowProgressive(!!d?.activated_at);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Connect your pipeline</h1>
        <p className="text-stone-400 mt-1">
          One step: connect. We protect your calendar — follow-ups, reminders, revivals.
        </p>
      </header>

      {loading && !state ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            {state?.zoom_configured ? (
              <>
                <p className="text-sm font-medium text-stone-400">Calendar &amp; calls</p>
                <p className="text-base text-stone-200 mt-1">Connect Zoom so we process closing calls and handle follow-ups</p>
                {state?.zoom_connected ? (
                  <div className="mt-3 flex items-center gap-2 text-emerald-400">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    Connected — protection active
                  </div>
                ) : (
                  <a
                    href={`/api/integrations/zoom/connect?workspace_id=${encodeURIComponent(workspaceId)}&return_to=activation`}
                    className="mt-3 inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-medium"
                  >
                    Connect Zoom
                  </a>
                )}
              </>
            ) : (
              <>
                <p className="text-stone-500">Zoom is not configured. We work with calendar events without it.</p>
                <p className="text-stone-500 text-xs mt-1">Connect your pipeline via webhook or integrations.</p>
              </>
            )}
          </div>

          {state?.activated_at && (
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
              Protection is live. <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">View dashboard →</Link>
            </div>
          )}

          {(showProgressive || state?.activated_at) && (
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 border-dashed">
              <p className="text-sm font-medium text-stone-400">Optional: weekly target</p>
              <p className="text-stone-400 text-sm mt-1">How many calls per week? We use this to prioritize.</p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-24 px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-200"
                />
                <span className="text-stone-500 text-sm">calls/week</span>
                <button
                  onClick={async () => {
                    const n = parseInt(targetInput, 10);
                    if (isNaN(n) || n < 1 || n > 100) return;
                    await fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "set_target", weekly_call_target: n }),
                    });
                    load();
                  }}
                  className="px-4 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-medium"
                >
                  Set
                </button>
              </div>
            </div>
          )}

          {!state?.activated_at && (
            <p className="text-stone-500 text-sm">
              Not connected yet? <Link href="/dashboard/onboarding" className="text-amber-400 hover:text-amber-300">Start here</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
