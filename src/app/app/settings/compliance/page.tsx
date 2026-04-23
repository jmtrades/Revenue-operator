"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getDefaultTwoPartyAnnouncement } from "@/lib/compliance/recording-consent";
import type { RecordingConsentMode } from "@/lib/compliance/recording-consent";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function AppSettingsCompliancePage() {
  const tSettings = useTranslations("settings");
  const tBreadcrumbs = useTranslations("breadcrumbs");
  const [recording, setRecording] = useState(true);
  const [hipaa, setHipaa] = useState(false);
  const [retention, setRetention] = useState("90");
  const [recordingConsentMode, setRecordingConsentMode] = useState<RecordingConsentMode>("one_party");
  const [announcementText, setAnnouncementText] = useState<string>("");
  const [pauseOnSensitive, setPauseOnSensitive] = useState(false);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const lastConsentRef = useRef({ mode: recordingConsentMode, announcementText, pauseOnSensitive });
  const isDirty =
    recordingConsentMode !== lastConsentRef.current.mode ||
    announcementText !== lastConsentRef.current.announcementText ||
    pauseOnSensitive !== lastConsentRef.current.pauseOnSensitive;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    document.title = `${tSettings("compliance.title", { defaultValue: "Compliance" })} — Revenue Operator`;
  }, [tSettings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspace/recording-consent", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          mode?: RecordingConsentMode;
          announcementText?: string | null;
          pauseOnSensitive?: boolean;
        };
        if (!cancelled) {
          const mode = data.mode ?? "one_party";
          const text = data.announcementText ?? "";
          const pause = data.pauseOnSensitive ?? false;
          setRecordingConsentMode(mode);
          setAnnouncementText(text);
          setPauseOnSensitive(pause);
          lastConsentRef.current = { mode, announcementText: text, pauseOnSensitive: pause };
        }
      } catch {
        if (!cancelled) toast.error(tSettings("compliance.loadFailed"));
      } finally {
        if (!cancelled) setConsentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tSettings]);

  const handleSaveConsent = async () => {
    setConsentSaving(true);
    try {
      const res = await fetch("/api/workspace/recording-consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode: recordingConsentMode,
          announcementText: announcementText.trim() || null,
          pauseOnSensitive,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? tSettings("compliance.saveFailed"));
        return;
      }
      lastConsentRef.current = { mode: recordingConsentMode, announcementText, pauseOnSensitive };
      toast.success(tSettings("compliance.recordingSaved"));
    } catch {
      toast.error(tSettings("compliance.saveFailed"));
    } finally {
      setConsentSaving(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/compliance-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recording, hipaa, retention }),
      });
      if (!res.ok) {
        const _err = (await res.json()).error ?? tSettings("compliance.saveFailed");
        toast.error(tSettings("compliance.saveFailed"));
        return;
      }
      toast.success(tSettings("compliance.saved"));
    } catch {
      toast.error(tSettings("compliance.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/workspace/recording-consent", { credentials: "include" });
      const _data = res.ok ? await res.json() : {};
      const rows = [
        [tSettings("compliance.csvExport.setting"), tSettings("compliance.csvExport.value")],
        [tSettings("compliance.csvExport.callRecording"), recording ? tSettings("compliance.csvExport.enabled") : tSettings("compliance.csvExport.disabled")],
        [tSettings("compliance.csvExport.hipaaMode"), hipaa ? tSettings("compliance.csvExport.enabled") : tSettings("compliance.csvExport.disabled")],
        [tSettings("compliance.csvExport.dataRetention"), retention],
        [tSettings("compliance.csvExport.recordingConsentMode"), recordingConsentMode],
        [tSettings("compliance.csvExport.announcementText"), announcementText || tSettings("compliance.csvExport.default")],
        [tSettings("compliance.csvExport.pauseOnSensitive"), pauseOnSensitive ? tSettings("compliance.csvExport.yes") : tSettings("compliance.csvExport.no")],
        [tSettings("compliance.csvExport.exportedAt"), new Date().toISOString()],
      ];
      const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue-operator-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(tSettings("compliance.exportRequested"));
    } catch {
      toast.error(tSettings("compliance.saveFailed"));
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[
        { label: tBreadcrumbs("home"), href: "/app" },
        { label: tBreadcrumbs("settings"), href: "/app/settings" },
        { label: tBreadcrumbs("compliance") }
      ]} />
      <h1 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-2">{tSettings("compliance.title")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tSettings("compliance.subtitle")}</p>

      <div className="space-y-4 mb-6">
        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{tSettings("compliance.recordingConsent")}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mb-3">
            {tSettings("compliance.consentDescription")}
          </p>
          {consentLoading ? (
            <div className="h-20 rounded-xl bg-[var(--bg-inset)] skeleton-shimmer" />
          ) : (
            <>
              <div className="space-y-2 mb-3">
                <label className="block text-[11px] text-[var(--text-tertiary)]">{tSettings("compliance.consentMode")}</label>
                <select
                  value={recordingConsentMode}
                  onChange={(e) => setRecordingConsentMode(e.target.value as RecordingConsentMode)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                >
                  <option value="one_party">{tSettings("compliance.oneParty")}</option>
                  <option value="two_party">{tSettings("compliance.twoParty")}</option>
                  <option value="none">{tSettings("compliance.doNotRecord")}</option>
                </select>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {tSettings("compliance.twoPartyStatesHint")}
                </p>
              </div>
              {recordingConsentMode === "two_party" && (
                <div className="mb-3">
                  <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{tSettings("compliance.announcementLabel")}</label>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder={getDefaultTwoPartyAnnouncement()}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:border-[var(--border-medium)] focus:outline-none resize-none"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">{tSettings("compliance.pauseSensitive")}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{tSettings("compliance.pauseSensitiveHelp")}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pauseOnSensitive}
                  onClick={() => setPauseOnSensitive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${pauseOnSensitive ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] ${pauseOnSensitive ? "translate-x-6 bg-[var(--text-primary)]" : "translate-x-1 bg-[var(--text-tertiary)]"}`} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveConsent}
                disabled={consentSaving}
                className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {consentSaving ? tSettings("compliance.savingConsent") : tSettings("compliance.saveConsent")}
              </button>
            </>
          )}
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{tSettings("compliance.callRecording")}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{tSettings("compliance.callRecordingHelp")}</p>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] cursor-pointer ${recording ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"}`} onClick={() => setRecording(!recording)}>
              <span className={`inline-block h-4 w-4 transform rounded-full transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] ${recording ? "translate-x-6 bg-[var(--text-primary)]" : "translate-x-1 bg-[var(--text-tertiary)]"}`} />
            </div>
          </label>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{tSettings("compliance.hipaaMode")}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{tSettings("compliance.hipaaModeHelp")}</p>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] cursor-pointer ${hipaa ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"}`} onClick={() => setHipaa(!hipaa)}>
              <span className={`inline-block h-4 w-4 transform rounded-full transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] ${hipaa ? "translate-x-6 bg-[var(--text-primary)]" : "translate-x-1 bg-[var(--text-tertiary)]"}`} />
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="retention" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("compliance.dataRetention")}</label>
          <select id="retention" value={retention} onChange={(e) => setRetention(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none">
            <option value="30">{tSettings("compliance.retention30")}</option>
            <option value="90">{tSettings("compliance.retention90")}</option>
            <option value="180">{tSettings("compliance.retention180")}</option>
            <option value="365">{tSettings("compliance.retention365")}</option>
          </select>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{tSettings("compliance.retentionHelp")}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{saving ? tSettings("compliance.saving") : tSettings("compliance.saveChanges")}</button>
        <button type="button" onClick={handleExport} className="px-4 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] transition-[border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tSettings("compliance.exportData")}</button>
      </div>

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tSettings("compliance.backToSettings")}</Link></p>
    </div>
  );
}
