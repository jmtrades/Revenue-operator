"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

export default function SettingsPage() {
  const { workspaceId } = useWorkspace();
  const [riskLevel, setRiskLevel] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [previewMode, setPreviewMode] = useState(false);
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationTimeoutHours, setEscalationTimeoutHours] = useState(24);
  const [callAwareEnabled, setCallAwareEnabled] = useState(true);
  const [consentMode, setConsentMode] = useState<"strict" | "soft" | "off">("soft");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [schedulingRules, setSchedulingRules] = useState({
    max_calls_per_day: 20,
    min_notice_minutes: 60,
    reserve_for_high_probability: true,
  });
  const [saved, setSaved] = useState(false);
  const [zoomHealth, setZoomHealth] = useState<{ connected: boolean; token_valid?: boolean; last_webhook_at?: string | null } | null>(null);
  const [zoomDisconnecting, setZoomDisconnecting] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/${workspaceId}/settings`)
      .then((r) => r.json())
      .then((d) => {
        setRiskLevel(d.risk_level ?? "balanced");
        setPreviewMode(d.preview_mode ?? false);
        setEscalationEnabled(d.escalation_rules?.enabled ?? false);
        setCallAwareEnabled(d.call_aware_enabled ?? true);
        setConsentMode(d.consent_mode ?? "soft");
        setEscalationTimeoutHours(d.escalation_rules?.escalation_timeout_hours ?? d.escalation_timeout_hours ?? 24);
        setSchedulingRules({
          max_calls_per_day: 20,
          min_notice_minutes: 60,
          reserve_for_high_probability: true,
          ...d.scheduling_rules,
        });
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
        escalation_rules: { enabled: escalationEnabled, escalation_timeout_hours: escalationTimeoutHours },
        scheduling_rules: schedulingRules,
        call_aware_enabled: callAwareEnabled,
        consent_mode: consentMode,
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
    <div className="min-h-screen bg-stone-950 text-stone-100 p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      {!workspaceId ? (
        <p className="text-stone-500">Select a workspace from the sidebar.</p>
      ) : (
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Risk Level</label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
          >
            <option value="safe">Safe – conservative fallbacks</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
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
            Preview Mode – run full pipeline but don&apos;t send. For demos and trust building.
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
            Escalation – suggest instead of auto-send for high-value, VIP, anger, negotiation.
          </label>
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Escalation Timeout (hours)</label>
          <input
            type="number"
            min={1}
            max={168}
            value={escalationTimeoutHours}
            onChange={(e) => setEscalationTimeoutHours(Number(e.target.value) || 24)}
            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
          />
          <p className="text-xs text-stone-500 mt-0.5">Revert to autonomous if no human response</p>
        </div>
        <div className="border-t border-stone-800 pt-4 mt-4">
          <h3 className="text-sm font-medium text-stone-400 mb-2">Scheduling Constraints</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-stone-500">Max calls per day</label>
              <input
                type="number"
                min={1}
                value={schedulingRules.max_calls_per_day}
                onChange={(e) => setSchedulingRules((s) => ({ ...s, max_calls_per_day: Number(e.target.value) || 20 }))}
                className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500">Min notice (minutes)</label>
              <input
                type="number"
                min={0}
                value={schedulingRules.min_notice_minutes}
                onChange={(e) => setSchedulingRules((s) => ({ ...s, min_notice_minutes: Number(e.target.value) || 60 }))}
                className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="reserve"
                checked={schedulingRules.reserve_for_high_probability}
                onChange={(e) => setSchedulingRules((s) => ({ ...s, reserve_for_high_probability: e.target.checked }))}
                className="rounded border-stone-600"
              />
              <label htmlFor="reserve" className="text-sm text-stone-300">Reserve prime slots for high-probability leads</label>
            </div>
          </div>
        </div>
        <div className="border-t border-stone-800 pt-4 mt-4">
          <h3 className="text-sm font-medium text-stone-400 mb-2">Call-Aware Operator</h3>
          {zoomHealth?.connected && (
            <div className="mb-3 p-3 rounded-lg bg-stone-800/80 text-sm">
              <p className="text-emerald-400 font-medium">Zoom connected</p>
              <p className="text-stone-500 mt-0.5">
                Token: {zoomHealth.token_valid ? "Valid" : "Needs refresh"}
                {zoomHealth.last_webhook_at && ` · Last webhook: ${new Date(zoomHealth.last_webhook_at).toLocaleString()}`}
              </p>
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
                className="mt-2 px-3 py-1.5 rounded bg-red-900/50 hover:bg-red-800 text-red-200 text-xs font-medium disabled:opacity-50"
              >
                Disconnect Zoom
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              id="callAware"
              checked={callAwareEnabled}
              onChange={(e) => setCallAwareEnabled(e.target.checked)}
              className="rounded border-stone-600"
            />
            <label htmlFor="callAware" className="text-sm text-stone-300">
              Process closing calls automatically
            </label>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Consent requirement mode</label>
            <select
              value={consentMode}
              onChange={(e) => setConsentMode(e.target.value as typeof consentMode)}
              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
            >
              <option value="strict">Strict – require explicit consent phrase in transcript</option>
              <option value="soft">Soft – use Zoom recording consent + toggle</option>
              <option value="off">Off – store summary only, no transcript</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Webhook Endpoint (outbound events)</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
          />
        </div>
        <button
          onClick={save}
          className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium"
        >
          Save
        </button>
        {saved && <p className="text-green-400 text-sm">Saved</p>}
      </div>
      )}
    </div>
  );
}
