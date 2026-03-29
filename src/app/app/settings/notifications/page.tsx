"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getWorkspaceMeSnapshotSync, invalidateWorkspaceMeCache } from "@/lib/client/workspace-me";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

const NOTIFICATION_EVENT_KEYS = [
  "call_received",
  "missed_call",
  "appointment_booked",
  "campaign_completed",
  "weekly_digest",
  "billing_alerts",
] as const;

type Channel = "push" | "sms" | "email";

function defaultChannelsForEvent(key: (typeof NOTIFICATION_EVENT_KEYS)[number]): Channel[] {
  switch (key) {
    case "call_received":
      return ["push", "email"];
    case "missed_call":
      return ["push", "sms", "email"];
    case "appointment_booked":
      return ["email", "push"];
    case "campaign_completed":
      return ["email"];
    case "weekly_digest":
      return ["email"];
    case "billing_alerts":
      return ["email", "push"];
    default:
      return ["push"];
  }
}

export default function AppSettingsNotificationsPage() {
  const tSettings = useTranslations("settings");
  const tToast = useTranslations("toast");
  const snapshot = getWorkspaceMeSnapshotSync() as { notification_preferences?: Record<string, Channel[]> } | null;
  const [loading, setLoading] = useState(!snapshot);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, Set<Channel>>>(() => {
    const raw = snapshot?.notification_preferences ?? {};
    const fromSnapshot: Record<string, Set<Channel>> = {};
    NOTIFICATION_EVENT_KEYS.forEach((key) => {
      const channels = raw[key] ?? defaultChannelsForEvent(key);
      fromSnapshot[key] = new Set((channels as Channel[]) ?? []);
    });
    return fromSnapshot;
  });
  const lastSavedRef = useRef<string>("");
  const prefsSerialized = JSON.stringify(
    NOTIFICATION_EVENT_KEYS.map((k) => [k, [...(prefs[k] ?? [])].sort()].flat()),
  );
  const isDirty = lastSavedRef.current !== prefsSerialized;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (snapshot && lastSavedRef.current === "") lastSavedRef.current = prefsSerialized;
  }, [snapshot, prefsSerialized]);

  useEffect(() => {
    if (snapshot) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/workspace/me", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as { notification_preferences?: Record<string, Channel[]> } | null;
        const raw = data?.notification_preferences ?? {};
        setPrefs(() => {
          const next: Record<string, Set<Channel>> = {};
          NOTIFICATION_EVENT_KEYS.forEach((key) => {
            const channels = raw[key] ?? defaultChannelsForEvent(key);
            next[key] = new Set((channels as Channel[]) ?? []);
          });
          return next;
        });
      } catch {
        // fall back to defaults; surface error via toast
        toast.error(tSettings("notifications.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [snapshot, tSettings]);

  const toggle = (event: string, channel: Channel) => {
    setPrefs((p) => {
      const next = { ...p };
      const set = new Set(next[event]);
      if (set.has(channel)) set.delete(channel); else set.add(channel);
      next[event] = set;
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload: Record<string, Channel[]> = {};
      NOTIFICATION_EVENT_KEYS.forEach((key) => {
        payload[key] = Array.from(prefs[key] ?? []);
      });
      const res = await fetch("/api/workspace/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_preferences: payload }),
      });
      if (!res.ok) throw new Error("Failed to save");
      lastSavedRef.current = prefsSerialized;
      toast.success(tSettings("notifications.saved"));
      invalidateWorkspaceMeCache();
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: tSettings("integrations.breadcrumbSettings"), href: "/app/settings" }, { label: tSettings("nav.notifications") }]} />
      <h1 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-2">{tSettings("notifications.heading")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tSettings("notifications.description")}</p>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)] mb-6">{tSettings("notifications.loadingPrefs")}</p>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {NOTIFICATION_EVENT_KEYS.map((key) => (
              <div
                key={key}
                className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{tSettings(`notifications.events.${key}`)}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{tSettings(`notifications.events.${key}Desc`)}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    {(["push", "sms", "email"] as Channel[]).map((ch) => (
                      <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefs[key]?.has(ch) ?? false}
                          onChange={() => toggle(key, ch)}
                          className="rounded accent-[var(--accent-primary)]"
                        />
                        <span className="text-[11px] text-[var(--text-tertiary)]">{tSettings(`notifications.channels.${ch}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition-colors disabled:opacity-60"
          >
            {saving ? tSettings("notifications.saving") : tSettings("notifications.savePreferences")}
          </button>
        </>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tSettings("notifications.backToSettings")}</Link></p>
    </div>
  );
}
