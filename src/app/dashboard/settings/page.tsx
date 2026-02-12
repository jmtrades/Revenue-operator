"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

const TEAM_ROLES = [
  { id: "qualifier", label: "Qualifier", desc: "Replies and qualifies" },
  { id: "setter", label: "Setter", desc: "Schedules calls" },
  { id: "show_manager", label: "Show Manager", desc: "Reminders and no-shows" },
  { id: "follow_up_manager", label: "Follow-up Manager", desc: "Keeps conversations engaged" },
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
  const [coverageFlags, setCoverageFlags] = useState({
    continuity_messaging: true,
    booking_protection: true,
    attendance_protection: true,
    post_call_continuity: true,
    notifications: true,
  });

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
        const cf = d.coverage_flags;
        if (cf && typeof cf === "object") {
          setCoverageFlags({
            continuity_messaging: cf.continuity_messaging !== false,
            booking_protection: cf.booking_protection !== false,
            attendance_protection: cf.attendance_protection !== false,
            post_call_continuity: cf.post_call_continuity !== false,
            notifications: cf.notifications !== false,
          });
        }
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
        coverage_flags: coverageFlags,
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
    <div className="p-8 max-w-xl mx-auto" style={{ color: "var(--text-primary)" }}>
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>How we work for you</p>
      {!workspaceId ? (
        <p style={{ color: "var(--text-muted)" }}>Select an account.</p>
      ) : (
        <div className="space-y-6">
          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>How we sound</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Tone when we maintain continuity</p>
            <select
              value={communicationStyle}
              onChange={(e) => setCommunicationStyle(e.target.value as typeof communicationStyle)}
              className="w-full px-3 py-2 rounded text-sm"
              style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
            >
              <option value="direct">Direct — short and clear</option>
              <option value="consultative">Consultative — warm, asks questions</option>
              <option value="high_urgency">Action-oriented — time-sensitive</option>
            </select>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Coverage scope</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Select what we&apos;re responsible for</p>
            <div className="space-y-3 mb-4">
              {[
                { key: "continuity_messaging" as const, label: "Continuity messaging", desc: "Replies, follow-ups, recoveries" },
                { key: "booking_protection" as const, label: "Booking protection", desc: "Qualification to booking routing" },
                { key: "attendance_protection" as const, label: "Attendance protection", desc: "Confirmations, reminders, rescue" },
                { key: "post_call_continuity" as const, label: "Post-call continuity", desc: "Call-aware follow-ups, hesitation monitor" },
                { key: "notifications" as const, label: "Notifications", desc: "Outbound webhooks" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--surface)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={coverageFlags[key]}
                    onClick={() => setCoverageFlags((f) => ({ ...f, [key]: !f[key] }))}
                    className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                    style={{ background: coverageFlags[key] ? "var(--meaning-green)" : "var(--border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: coverageFlags[key] ? "22px" : "2px" }}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCoverageFlags({ continuity_messaging: true, booking_protection: false, attendance_protection: true, post_call_continuity: true, notifications: true })}
                className="px-2 py-1 rounded text-xs"
                style={{ background: "var(--surface)", color: "var(--text-muted)" }}
              >
                Solo closer
              </button>
              <button
                type="button"
                onClick={() => setCoverageFlags({ continuity_messaging: true, booking_protection: true, attendance_protection: true, post_call_continuity: true, notifications: true })}
                className="px-2 py-1 rounded text-xs"
                style={{ background: "var(--surface)", color: "var(--text-muted)" }}
              >
                Agency
              </button>
              <button
                type="button"
                onClick={() => setCoverageFlags({ continuity_messaging: true, booking_protection: true, attendance_protection: true, post_call_continuity: false, notifications: true })}
                className="px-2 py-1 rounded text-xs"
                style={{ background: "var(--surface)", color: "var(--text-muted)" }}
              >
                SaaS
              </button>
            </div>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Protection scope</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>What we are responsible for</p>
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
              className="text-sm font-medium"
              style={{ color: "var(--meaning-blue)" }}
            >
              Increase coverage →
            </Link>
            )}
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Coverage</h2>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
              Coverage continues automatically. Pause protection anytime. Resume when ready.
            </p>
            <div className="flex gap-2">
              <Link
                href="/dashboard/continue-protection"
                className="inline-block px-4 py-2 rounded-lg font-medium text-sm"
                style={{ background: "var(--meaning-green)", color: "#0E1116" }}
              >
                Continue coverage
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (!workspaceId || !confirm("Pause protection? Coverage runs until period end. Resume anytime.")) return;
                  await fetch("/api/billing/pause-coverage", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ workspace_id: workspaceId }),
                  });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{ borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-secondary)" }}
              >
                Pause coverage
              </button>
            </div>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Connect your calendar</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              We handle conversations once connected.
            </p>
            {zoomHealth?.connected && (
              <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
                <p className="font-medium" style={{ color: "var(--meaning-green)" }}>Connected</p>
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
                  className="mt-2 text-xs hover:underline disabled:opacity-50"
                  style={{ color: "var(--meaning-red)" }}
                >
                  Disconnect Zoom
                </button>
              </div>
            )}
            <Link
              href="/dashboard/activation"
              className="inline-block px-4 py-2 rounded-lg font-medium text-sm"
              style={{ background: "var(--meaning-green)", color: "#0E1116" }}
            >
              Connect
            </Link>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>When we ask before acting</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="preview"
                  checked={previewMode}
                  onChange={(e) => setPreviewMode(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "var(--meaning-blue)" }}
                />
                <label htmlFor="preview" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Draft only — we prepare but do not send
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="escalation"
                  checked={escalationEnabled}
                  onChange={(e) => setEscalationEnabled(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "var(--meaning-blue)" }}
                />
                <label htmlFor="escalation" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Ask before we act on high-value conversations
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="callAware"
                  checked={callAwareEnabled}
                  onChange={(e) => setCallAwareEnabled(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "var(--meaning-blue)" }}
                />
                <label htmlFor="callAware" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Maintain continuity after calls
                </label>
              </div>
            </div>
          </section>

          <button
            onClick={save}
            className="px-4 py-2 rounded-lg font-medium"
            style={{ background: "var(--meaning-green)", color: "#0E1116" }}
          >
            Save
          </button>
          {saved && <p className="text-sm" style={{ color: "var(--meaning-green)" }}>Saved</p>}

          <div className="pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {showAdvanced ? "−" : "+"} Webhooks
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Event notification URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
