"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

export default function SettingsPage() {
  const { workspaceId } = useWorkspace();
  const [riskLevel, setRiskLevel] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [previewMode, setPreviewMode] = useState(false);
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [callAwareEnabled, setCallAwareEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [zoomHealth, setZoomHealth] = useState<{ connected: boolean; token_valid?: boolean } | null>(null);
  const [zoomDisconnecting, setZoomDisconnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/${workspaceId}/settings`)
      .then((r) => r.json())
      .then((d) => {
        setRiskLevel(d.risk_level ?? "balanced");
        setPreviewMode(d.preview_mode ?? false);
        setEscalationEnabled(d.escalation_rules?.enabled ?? false);
        setCallAwareEnabled(d.call_aware_enabled ?? true);
      })
      .catch(() => {});
    fetch(`/api/workspaces/${workspaceId}/webhook-config`)
      .then((r) => r.ok ? r.json() : Promise.resolve({ endpoint_url: "" }))
      .then((d: { endpoint_url?: string }) => setWebhookUrl(d?.endpoint_url ?? ""))
      .catch(() => {});
    fetch(`/api/workspaces/${workspaceId}/zoom/health`)
      .then((r) => r.ok ? r.json() : Promise.resolve({ connected: false }))
      .then(setZoomHealth)
      .catch(() => setZoomHealth({ connected: false }));
  }, [workspaceId]);

  const save = async () => {
    if (!workspaceId) return;
    const res = await fetch(`/api/workspaces/${workspaceId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        risk_level: riskLevel,
        preview_mode: previewMode,
        escalation_rules: { enabled: escalationEnabled },
        call_aware_enabled: callAwareEnabled,
      }),
    });
    if (webhookUrl) {
      await fetch(`/api/workspaces/${workspaceId}/webhook-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint_url: webhookUrl }),
      });
    }
    setSaved(res.ok);
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-50 mb-2">Settings</h1>
      <p className="text-stone-500 text-sm mb-6">Configure your operator</p>
      {!workspaceId ? (
        <p className="text-stone-500">Select an account.</p>
      ) : (
        <div className="space-y-6">
          <section className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Connect lead source</h2>
            <p className="text-stone-300 text-sm mb-3">
              Operator can reply and follow up automatically once connected.
            </p>
            {zoomHealth?.connected && (
              <div className="mb-3 p-3 rounded-lg bg-stone-800/80 text-sm">
                <p className="text-emerald-400 font-medium">Zoom connected</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!workspaceId) return;
                    setZoomDisconnecting(true);
                    await fetch(`/api/workspaces/${workspaceId}/zoom/disconnect`, { method: "POST" });
                    setZoomHealth({ connected: false });
                    setZoomDisconnecting(false);
                  }}
                  disabled={zoomDisconnecting}
                  className="mt-2 text-red-400 text-xs hover:underline disabled:opacity-50"
                >
                  Disconnect Zoom
                </button>
              </div>
            )}
            <Link
              href="/dashboard/activation"
              className="inline-block px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-sm"
            >
              Connect Zoom
            </Link>
          </section>

          <section className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Operator behaviour</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Response style</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
                  className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-200"
                >
                  <option value="safe">Conservative – safest replies</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">More proactive</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="preview"
                  checked={previewMode}
                  onChange={(e) => setPreviewMode(e.target.checked)}
                  className="rounded border-stone-600"
                />
                <label htmlFor="preview" className="text-sm text-stone-300">
                  Preview mode – show what it would send without sending
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="escalation"
                  checked={escalationEnabled}
                  onChange={(e) => setEscalationEnabled(e.target.checked)}
                  className="rounded border-stone-600"
                />
                <label htmlFor="escalation" className="text-sm text-stone-300">
                  Suggest instead of send for high-value or sensitive replies
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="callAware"
                  checked={callAwareEnabled}
                  onChange={(e) => setCallAwareEnabled(e.target.checked)}
                  className="rounded border-stone-600"
                />
                <label htmlFor="callAware" className="text-sm text-stone-300">
                  Process closing calls and suggest follow-ups
                </label>
              </div>
            </div>
          </section>

          <button
            onClick={save}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium"
          >
            Save
          </button>
          {saved && <p className="text-emerald-400 text-sm">Saved</p>}

          <div className="border-t border-stone-800 pt-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-stone-500 hover:text-stone-300"
            >
              {showAdvanced ? "−" : "+"} Advanced
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Notifications endpoint</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-200"
                  />
                </div>
                <Link href="/dashboard/admin" className="block text-sm text-stone-400 hover:text-stone-300">
                  Admin & failed jobs →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
