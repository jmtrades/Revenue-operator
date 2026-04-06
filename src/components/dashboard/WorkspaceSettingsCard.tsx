"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  Settings,
  Shield,
  Phone,
  Mic,
  Clock,
  Brain,
  Save,
  Loader2,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface WorkspaceSettings {
  recording_enabled: boolean;
  recording_disclaimer: string;
  tcpa_compliance: boolean;
  calling_hours_start: string;
  calling_hours_end: string;
  calling_days: number[];
  timezone: string;
  max_attempts_per_lead: number;
  retry_delay_minutes: number;
  voicemail_behavior: string;
  auto_dnc_on_request: boolean;
  sentiment_escalation_enabled: boolean;
  escalation_threshold: string;
  webhook_signing_enabled: boolean;
  ai_coaching_enabled: boolean;
  nps_survey_enabled: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 group"
      type="button"
    >
      {enabled ? (
        <ToggleRight className="w-8 h-5 text-emerald-500" />
      ) : (
        <ToggleLeft className="w-8 h-5 text-[var(--text-disabled)]" />
      )}
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
    </button>
  );
}

export function WorkspaceSettingsCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/settings/workspace?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setSettings(json.settings ?? null);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const update = (key: keyof WorkspaceSettings, value: unknown) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setDirty(true);
    setSaved(false);
  };

  const toggleDay = (day: number) => {
    if (!settings) return;
    const days = settings.calling_days.includes(day)
      ? settings.calling_days.filter(d => d !== day)
      : [...settings.calling_days, day].sort();
    update("calling_days", days);
  };

  const saveSettings = async () => {
    if (!workspaceId || !settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/workspace", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, settings }),
      });
      if (res.ok) {
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-[var(--text-disabled)]" />
          <div className="h-4 w-32 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-[var(--text-disabled)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Workspace Settings</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">Unable to load settings</p>
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Workspace Settings</h2>
        </div>
        <button
          onClick={saveSettings}
          disabled={!dirty || saving}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
            saved
              ? "bg-emerald-500/10 text-emerald-500"
              : dirty
                ? "bg-[var(--accent-primary)] text-white hover:opacity-90"
                : "bg-[var(--bg-hover)] text-[var(--text-disabled)]"
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
          {saved ? "Saved" : "Save changes"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Recording & Compliance */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Recording & Compliance</h3>
          </div>
          <div className="space-y-3 pl-5">
            <Toggle enabled={settings.recording_enabled} onChange={(v) => update("recording_enabled", v)} label="Enable call recording" />
            {settings.recording_enabled && (
              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Recording disclaimer</label>
                <input
                  type="text"
                  value={settings.recording_disclaimer}
                  onChange={(e) => update("recording_disclaimer", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                />
              </div>
            )}
            <Toggle enabled={settings.tcpa_compliance} onChange={(v) => update("tcpa_compliance", v)} label="TCPA compliance mode" />
            <Toggle enabled={settings.auto_dnc_on_request} onChange={(v) => update("auto_dnc_on_request", v)} label="Auto-add to DNC on request" />
          </div>
        </div>

        {/* Calling Hours */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Calling Hours</h3>
          </div>
          <div className="space-y-3 pl-5">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Start</label>
                <input
                  type="time"
                  value={settings.calling_hours_start}
                  onChange={(e) => update("calling_hours_start", e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                />
              </div>
              <span className="text-[var(--text-disabled)] mt-4">→</span>
              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">End</label>
                <input
                  type="time"
                  value={settings.calling_hours_end}
                  onChange={(e) => update("calling_hours_end", e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-tertiary)] block mb-2">Active days</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                      settings.calling_days.includes(idx)
                        ? "bg-[var(--accent-primary)] text-white"
                        : "bg-[var(--bg-hover)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => update("timezone", e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
              >
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="America/Anchorage">Alaska (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii (HT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Central Europe (CET)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dialer Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Dialer Settings</h3>
          </div>
          <div className="space-y-3 pl-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Max attempts per lead</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.max_attempts_per_lead}
                  onChange={(e) => update("max_attempts_per_lead", parseInt(e.target.value, 10) || 3)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Retry delay (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={settings.retry_delay_minutes}
                  onChange={(e) => update("retry_delay_minutes", parseInt(e.target.value, 10) || 60)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Voicemail behavior</label>
              <select
                value={settings.voicemail_behavior}
                onChange={(e) => update("voicemail_behavior", e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
              >
                <option value="drop">Drop pre-recorded message</option>
                <option value="skip">Skip (no voicemail)</option>
                <option value="ai_message">AI-generated message</option>
              </select>
            </div>
          </div>
        </div>

        {/* Intelligence & Coaching */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Intelligence & Coaching</h3>
          </div>
          <div className="space-y-3 pl-5">
            <Toggle enabled={settings.ai_coaching_enabled} onChange={(v) => update("ai_coaching_enabled", v)} label="AI coaching reports" />
            <Toggle enabled={settings.sentiment_escalation_enabled} onChange={(v) => update("sentiment_escalation_enabled", v)} label="Sentiment escalation alerts" />
            {settings.sentiment_escalation_enabled && (
              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Escalation threshold</label>
                <select
                  value={settings.escalation_threshold}
                  onChange={(e) => update("escalation_threshold", e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                >
                  <option value="watch">Watch (low sensitivity)</option>
                  <option value="warning">Warning (medium)</option>
                  <option value="critical">Critical (high sensitivity)</option>
                </select>
              </div>
            )}
            <Toggle enabled={settings.nps_survey_enabled} onChange={(v) => update("nps_survey_enabled", v)} label="Post-call NPS survey" />
          </div>
        </div>

        {/* Security */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Security</h3>
          </div>
          <div className="space-y-3 pl-5">
            <Toggle enabled={settings.webhook_signing_enabled} onChange={(v) => update("webhook_signing_enabled", v)} label="HMAC webhook signing" />
          </div>
        </div>
      </div>
    </div>
  );
}
