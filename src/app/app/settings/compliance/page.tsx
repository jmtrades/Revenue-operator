"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getDefaultTwoPartyAnnouncement,
  TWO_PARTY_STATES_US,
} from "@/lib/compliance/recording-consent";
import type { RecordingConsentMode } from "@/lib/compliance/recording-consent";

export default function AppSettingsCompliancePage() {
  const tSettings = useTranslations("settings");
  const [recording, setRecording] = useState(true);
  const [hipaa, setHipaa] = useState(false);
  const [retention, setRetention] = useState("90");
  const [recordingConsentMode, setRecordingConsentMode] = useState<RecordingConsentMode>("one_party");
  const [announcementText, setAnnouncementText] = useState<string>("");
  const [pauseOnSensitive, setPauseOnSensitive] = useState(false);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
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
          setRecordingConsentMode(data.mode ?? "one_party");
          setAnnouncementText(data.announcementText ?? "");
          setPauseOnSensitive(data.pauseOnSensitive ?? false);
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
      toast.success(tSettings("compliance.recordingSaved"));
    } catch {
      toast.error(tSettings("compliance.saveFailed"));
    } finally {
      setConsentSaving(false);
    }
  };

  const handleSave = () => {
    toast.success(tSettings("compliance.saved"));
  };

  const handleExport = () => {
    toast.info(tSettings("compliance.exportRequested"));
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Compliance</h1>
      <p className="text-sm text-zinc-500 mb-6">Recording, privacy, and data retention settings.</p>

      <div className="space-y-4 mb-6">
        {/* Recording consent */}
        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <p className="text-sm font-medium text-white mb-1">Recording consent</p>
          <p className="text-[11px] text-zinc-500 mb-3">
            Choose consent model for your jurisdiction. Two-party requires playing an announcement at call start.
          </p>
          {consentLoading ? (
            <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ) : (
            <>
              <div className="space-y-2 mb-3">
                <label className="block text-[11px] text-zinc-400">Consent mode</label>
                <select
                  value={recordingConsentMode}
                  onChange={(e) => setRecordingConsentMode(e.target.value as RecordingConsentMode)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:outline-none"
                >
                  <option value="one_party">One-party (e.g. most US states)</option>
                  <option value="two_party">Two-party (play announcement at call start)</option>
                  <option value="none">Do not record</option>
                </select>
                <p className="text-[11px] text-zinc-500">
                  Some states ({TWO_PARTY_STATES_US.slice(0, 5).join(", ")}…) require two-party consent.
                </p>
              </div>
              {recordingConsentMode === "two_party" && (
                <div className="mb-3">
                  <label className="block text-[11px] text-zinc-400 mb-1">Consent announcement (played at call start)</label>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder={getDefaultTwoPartyAnnouncement()}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none resize-none"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-zinc-400">Pause recording during sensitive info</p>
                  <p className="text-[10px] text-zinc-500">Best-effort; agent may pause when payment or PII is discussed</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pauseOnSensitive}
                  onClick={() => setPauseOnSensitive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pauseOnSensitive ? "bg-white" : "bg-zinc-700"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${pauseOnSensitive ? "translate-x-6 bg-black" : "translate-x-1 bg-zinc-400"}`} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveConsent}
                disabled={consentSaving}
                className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-100 disabled:opacity-50"
              >
                {consentSaving ? "Saving…" : "Save recording consent"}
              </button>
            </>
          )}
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Call recording</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">All AI calls are recorded for quality and compliance</p>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${recording ? "bg-white" : "bg-zinc-700"}`} onClick={() => setRecording(!recording)}>
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${recording ? "translate-x-6 bg-black" : "translate-x-1 bg-zinc-400"}`} />
            </div>
          </label>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">HIPAA mode</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Encrypt PHI, BAA required (+$99/mo on Scale plan)</p>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hipaa ? "bg-white" : "bg-zinc-700"}`} onClick={() => setHipaa(!hipaa)}>
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${hipaa ? "translate-x-6 bg-black" : "translate-x-1 bg-zinc-400"}`} />
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="retention" className="block text-xs font-medium text-zinc-400 mb-1">Data retention</label>
          <select id="retention" value={retention} onChange={(e) => setRetention(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:outline-none">
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </select>
          <p className="mt-1 text-[11px] text-zinc-500">Recordings and transcripts older than this are deleted automatically.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors">Save changes</button>
        <button type="button" onClick={handleExport} className="px-4 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] transition-colors">Export all data</button>
      </div>

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
