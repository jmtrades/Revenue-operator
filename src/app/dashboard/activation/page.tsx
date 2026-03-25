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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setState(d);
        setTargetInput(String(d?.weekly_call_target ?? "5"));
        setShowProgressive(!!d?.activated_at);
      })
      .catch(() => setState(null))
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  };

  useEffect(load, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Connect your calendar</h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
          Connect once. New enquiries then enter handling under governance.
        </p>
      </header>

      {loading && !state ? (
        <div className="flex items-center gap-3 py-6">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" aria-hidden />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>One moment…</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {state?.zoom_configured ? (
              <>
                <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Calendar &amp; calls</p>
                <p className="text-base mt-1" style={{ color: "var(--text-secondary)" }}>Connect Zoom so closing calls and follow-ups continue</p>
                {state?.zoom_connected ? (
                  <div className="mt-3 flex items-center gap-2" style={{ color: "var(--approval)" }}>
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--approval)" }} />
                    Connected
                  </div>
                ) : (
                  <a
                    href={`/api/integrations/zoom/connect?workspace_id=${encodeURIComponent(workspaceId)}&return_to=activation`}
                    className="mt-3 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium btn-primary"
                  >
                    Connect Zoom
                  </a>
                )}
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Zoom is not configured. We work with calendar events without it.</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Connect via external source or calendar.</p>
              </>
            )}
          </div>

          {state?.activated_at && (
            <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--approval)" }} />
              New enquiries now enter handling. <Link href={workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard"} className="underline" style={{ color: "var(--accent)" }}>Open Work</Link>
            </div>
          )}

          {(showProgressive || state?.activated_at) && (
            <div className="p-4 rounded-xl border border-dashed" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Optional: weekly target</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>How many calls per week? We use this to prioritize.</p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-24 px-3 py-2 rounded border focus-ring"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>calls/week</span>
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
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Set
                </button>
              </div>
            </div>
          )}

          {!state?.activated_at && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Not connected yet? <Link href="/activate" className="underline" style={{ color: "var(--accent)" }}>Start here</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
