"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

const TEAM_ROLES = [
  { id: "qualifier", label: "Qualifier", desc: "Replies and qualifies" },
  { id: "setter", label: "Setter", desc: "Schedules calls" },
  { id: "show_manager", label: "Show Manager", desc: "Reminders and no-shows" },
  { id: "follow_up_manager", label: "Follow-up Manager", desc: "Keeps leads engaged" },
  { id: "revival_manager", label: "Revival Manager", desc: "Reaches cold prospects" },
  { id: "full_autopilot", label: "Full department", desc: "All roles" },
] as const;

export default function SettingsPage() {
  const { workspaceId } = useWorkspace();
  const [riskLevel, setRiskLevel] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [previewMode, setPreviewMode] = useState(false);
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [callAwareEnabled, setCallAwareEnabled] = useState(true);
  const [hiredRoles, setHiredRoles] = useState<string[]>(["full_autopilot"]);
  const [communicationStyle, setCommunicationStyle] = useState<"direct" | "consultative" | "high_urgency">("consultative");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [zoomHealth, setZoomHealth] = useState<{ connected: boolean; token_valid?: boolean } | null>(null);
  const [zoomDisconnecting, setZoomDisconnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [responsibilityLevel, setResponsibilityLevel] = useState<"monitor" | "handle" | "guarantee">("handle");

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/${workspaceId}/settings`)
      .then((r) => r.json())
      .then((d) => {
        setRiskLevel(d.risk_level ?? "balanced");
        setPreviewMode(d.preview_mode ?? false);
        setEscalationEnabled(d.escalation_rules?.enabled ?? false);
        setCallAwareEnabled(d.call_aware_enabled ?? true);
        setHiredRoles(Array.isArray(d.hired_roles) && d.hired_roles.length ? d.hired_roles : ["full_autopilot"]);
        const style = d.communication_style;
        setCommunicationStyle(style === "direct" || style === "high_urgency" ? style : "consultative");
        const rl = d.responsibility_level;
        setResponsibilityLevel(rl === "monitor" || rl === "guarantee" ? rl : "handle");
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
        hired_roles: hiredRoles,
        communication_style: communicationStyle,
        responsibility_level: responsibilityLevel,
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
      <p className="text-stone-500 text-sm mb-6">Your department</p>
      {!workspaceId ? (
        <p className="text-stone-500">Select an account.</p>
      ) : (
        <div className="space-y-6">
          <section className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Your team</h2>
            <p className="text-stone-300 text-sm mb-3">Who handles your leads</p>
            <div className="space-y-2">
              {TEAM_ROLES.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-stone-800/60"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-200">{r.label}</p>
                    <p className="text-xs text-stone-500">{r.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hiredRoles.includes(r.id)}
                    onChange={() => {
                      if (r.id === "full_autopilot") {
                        setHiredRoles(["full_autopilot"]);
                      } else {
                        setHiredRoles((prev) => {
                          const w = prev.filter((x) => x !== "full_autopilot");
                          if (prev.includes(r.id)) return w.filter((x) => x !== r.id).length ? w.filter((x) => x !== r.id) : ["full_autopilot"];
                          const next = [...w, r.id];
                          return next.length >= 5 ? ["full_autopilot"] : next;
                        });
                      }
                    }}
                    className="rounded border-stone-600"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Responsibility coverage</h2>
            <p className="text-stone-300 text-sm mb-3">What gets handled for you</p>
            <div className="space-y-2 mb-3">
              {[
                { id: "monitor" as const, label: "Monitor", desc: "Visibility and risk detection only" },
                { id: "handle" as const, label: "Handle", desc: "Follow-ups and recovery" },
                { id: "guarantee" as const, label: "Guarantee", desc: "Booking and attendance protection" },
              ].map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-stone-800/60">
                  <div>
                    <p className="text-sm font-medium text-stone-200">{t.label}</p>
                    <p className="text-xs text-stone-500">{t.desc}</p>
                  </div>
                  <input
                    type="radio"
                    name="responsibility"
                    checked={responsibilityLevel === t.id}
                    onChange={() => setResponsibilityLevel(t.id)}
                    className="border-stone-600"
                  />
                </div>
              ))}
            </div>
            {responsibilityLevel !== "guarantee" && (
              <Link
                href="/dashboard/continue-protection"
                className="text-amber-400 hover:text-amber-300 text-sm font-medium"
              >
                Increase responsibility coverage →
              </Link>
            )}
          </section>

          <section className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Protection continuity</h2>
            <p className="text-stone-300 text-sm mb-2">
              Keep conversations protected. Protection continues automatically after trial.
            </p>
            <p className="text-stone-500 text-xs mb-3">
              Pause protection anytime — no need to cancel a subscription.
            </p>
            <Link
              href="/dashboard/continue-protection"
              className="inline-block px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-sm"
            >
              Keep protection active
            </Link>
          </section>

          <section className="p-4 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="text-sm font-medium text-stone-400 mb-3">Connect lead source</h2>
            <p className="text-stone-300 text-sm mb-3">
              Your team will handle conversations once connected.
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
            <h2 className="text-sm font-medium text-stone-400 mb-3">Behaviour</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Communication style</label>
                <select
                  value={communicationStyle}
                  onChange={(e) => setCommunicationStyle(e.target.value as typeof communicationStyle)}
                  className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-200"
                >
                  <option value="direct">Direct — short, clear, to the point</option>
                  <option value="consultative">Consultative — warm, ask questions, suggest options</option>
                  <option value="high_urgency">High urgency — action-oriented, time-sensitive</option>
                </select>
                <p className="text-xs text-stone-500 mt-1">All messages follow this style consistently</p>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Risk level</label>
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
                  Preview — team drafts responses without sending
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
                  Ask for your approval before sending high-value or sensitive replies
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
                  Handle post-call follow-ups
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
