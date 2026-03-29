"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { cn } from "@/lib/cn";
import { ArrowLeft, PhoneCall, Voicemail, ShieldAlert } from "lucide-react";

type OutboundConfig = {
  callingHours: {
    start: string; // "09:00"
    end: string; // "20:00"
    timezone: string;
    respectRecipientTimezone: boolean;
  };
  voicemailBehavior: "leave_message" | "hang_up_silently" | "ai_generated";
  voicemailScript: string;
  dailyOutboundLimit: number;
  suppression: {
    maxCallsPerContactPerDay: number;
    maxCallsPerContactPerWeek: number;
    maxSmsPerContactPerDay: number;
    cooldownAfterDeclineDays: number;
    cooldownAfterConversionDays: number;
  };
  dncCompliance: {
    enabled: boolean;
  };
};

const DEFAULT_CONFIG: OutboundConfig = {
  callingHours: {
    start: "09:00",
    end: "20:00",
    timezone:
      (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "America/New_York",
    respectRecipientTimezone: true,
  },
  voicemailBehavior: "leave_message",
  voicemailScript: "Hi — this is {businessName}. We’re following up on your request. Call us back at {businessPhone}.",
  dailyOutboundLimit: 50,
  suppression: {
    maxCallsPerContactPerDay: 1,
    maxCallsPerContactPerWeek: 3,
    maxSmsPerContactPerDay: 2,
    cooldownAfterDeclineDays: 7,
    cooldownAfterConversionDays: 30,
  },
  dncCompliance: { enabled: true },
};

export default function OutboundSettingsPage() {
  const t = useTranslations("settings.outbound");
  const tToast = useTranslations("toast");
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const effectiveWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || null;

  const [config, setConfig] = useState<OutboundConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/settings/workspace", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { settings?: { outbound_config?: OutboundConfig } | null } | null) => {
        if (cancelled) return;
        const oc = data?.settings?.outbound_config;
        if (oc && typeof oc === "object") setConfig({ ...DEFAULT_CONFIG, ...oc });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoading(false);
          toast.error(t("loadFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = useMemo(() => {
    if (!effectiveWorkspaceId) return false;
    return Boolean(config.callingHours.start && config.callingHours.end);
  }, [config.callingHours.end, config.callingHours.start, effectiveWorkspaceId]);

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/workspace", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outbound_config: config }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(tToast("error.generic"));
        return;
      }
      toast.success(t("toast.saved"));
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave || saving}
          className={cn(
            "px-5 py-2 rounded-xl text-sm font-semibold",
            canSave ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90" : "bg-[var(--bg-input)] text-[var(--text-tertiary)]",
            saving ? "opacity-60 cursor-not-allowed" : "",
          )}
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <PhoneCall className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("callingHours.heading")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("callingHours.start")}</label>
              <input
                type="time"
                value={config.callingHours.start}
                onChange={(e) => setConfig((c) => ({ ...c, callingHours: { ...c.callingHours, start: e.target.value } }))}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("callingHours.end")}</label>
              <input
                type="time"
                value={config.callingHours.end}
                onChange={(e) => setConfig((c) => ({ ...c, callingHours: { ...c.callingHours, end: e.target.value } }))}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("callingHours.timezone")}</label>
              <select
                value={config.callingHours.timezone}
                onChange={(e) => setConfig((c) => ({ ...c, callingHours: { ...c.callingHours, timezone: e.target.value } }))}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              >
                {typeof Intl !== "undefined" &&
                  Intl.supportedValuesOf("timeZone")
                    .filter((tz) => tz.includes("/"))
                    .map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </option>
                    ))}
              </select>
            </div>
            <label className="flex items-center gap-3 pt-7 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={config.callingHours.respectRecipientTimezone}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    callingHours: { ...c.callingHours, respectRecipientTimezone: e.target.checked },
                  }))
                }
                className="h-4 w-4"
              />
              {t("callingHours.respectRecipientTimezone")}
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Voicemail className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("voicemail.heading")}</h2>
          </div>
          <div className="grid gap-3">
            {(["leave_message", "hang_up_silently", "ai_generated"] as const).map((v) => (
              <label key={v} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <input
                  type="radio"
                  name="vm"
                  checked={config.voicemailBehavior === v}
                  onChange={() => setConfig((c) => ({ ...c, voicemailBehavior: v }))}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <div className="text-[var(--text-primary)] font-medium">{t(`voicemail.option.${v}.label`)}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{t(`voicemail.option.${v}.desc`)}</div>
                </div>
              </label>
            ))}
            {config.voicemailBehavior === "leave_message" && (
              <div className="mt-2">
                <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("voicemail.scriptLabel")}</label>
                <textarea
                  rows={3}
                  value={config.voicemailScript}
                  onChange={(e) => setConfig((c) => ({ ...c, voicemailScript: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] resize-none"
                />
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">{t("voicemail.scriptHint")}</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("limits.heading")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("limits.dailyOutboundLimit")}</label>
              <input
                type="number"
                min={0}
                value={config.dailyOutboundLimit}
                onChange={(e) => setConfig((c) => ({ ...c, dailyOutboundLimit: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
              <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">{t("limits.tierHint")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("suppression.heading")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("suppression.maxCallsPerDay")}</label>
              <input
                type="number"
                min={0}
                value={config.suppression.maxCallsPerContactPerDay}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    suppression: { ...c.suppression, maxCallsPerContactPerDay: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("suppression.maxCallsPerWeek")}</label>
              <input
                type="number"
                min={0}
                value={config.suppression.maxCallsPerContactPerWeek}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    suppression: { ...c.suppression, maxCallsPerContactPerWeek: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("suppression.maxSmsPerDay")}</label>
              <input
                type="number"
                min={0}
                value={config.suppression.maxSmsPerContactPerDay}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    suppression: { ...c.suppression, maxSmsPerContactPerDay: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("suppression.cooldownDecline")}</label>
              <input
                type="number"
                min={0}
                value={config.suppression.cooldownAfterDeclineDays}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    suppression: { ...c.suppression, cooldownAfterDeclineDays: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("suppression.cooldownConversion")}</label>
              <input
                type="number"
                min={0}
                value={config.suppression.cooldownAfterConversionDays}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    suppression: { ...c.suppression, cooldownAfterConversionDays: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("dnc.heading")}</h2>
          </div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={config.dncCompliance.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, dncCompliance: { enabled: e.target.checked } }))}
              className="mt-1 h-4 w-4"
            />
            <div>
              <div className="text-sm text-[var(--text-primary)] font-medium">{t("dnc.toggleLabel")}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">{t("dnc.disclaimer")}</div>
            </div>
          </label>
        </section>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-[var(--text-tertiary)]">{t("loading")}</p>
      ) : null}
    </div>
  );
}

