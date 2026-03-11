"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { toast } from "sonner";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";

const EVENTS = [
  { key: "call_received", label: "Call received", desc: "Every time your AI answers a call" },
  { key: "lead_captured", label: "Lead captured", desc: "When a caller is identified as a new lead" },
  { key: "appointment_booked", label: "Appointment booked", desc: "When your AI books an appointment" },
  { key: "urgent_call", label: "Urgent call", desc: "Emergency or high-priority calls" },
  { key: "voicemail", label: "Voicemail left", desc: "When a caller leaves a voicemail" },
];

type Channel = "push" | "sms" | "email";

export default function AppSettingsNotificationsPage() {
  const snapshot = getWorkspaceMeSnapshotSync() as { notification_preferences?: Record<string, Channel[]> } | null;
  const [loading, setLoading] = useState(!snapshot);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, Set<Channel>>>(() => {
    const raw = snapshot?.notification_preferences ?? {};
    const fromSnapshot: Record<string, Set<Channel>> = {};
    EVENTS.forEach((e) => {
      const channels = raw[e.key] ?? (e.key === "urgent_call" ? ["push", "sms"] : ["push"]);
      fromSnapshot[e.key] = new Set(channels as Channel[]);
    });
    return fromSnapshot;
  });

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
          EVENTS.forEach((e) => {
            const channels = raw[e.key] ?? (e.key === "urgent_call" ? ["push", "sms"] : ["push"]);
            next[e.key] = new Set(channels as Channel[]);
          });
          return next;
        });
      } catch {
        // fall back to defaults; surface error via toast
        toast.error("Could not load notification preferences. Using defaults.");
      } finally {
        setLoading(false);
      }
    })();
  }, [snapshot]);

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
    setSaving(true);
    try {
      const payload: Record<string, Channel[]> = {};
      EVENTS.forEach((e) => {
        payload[e.key] = Array.from(prefs[e.key] ?? []);
      });
      const res = await fetch("/api/workspace/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_preferences: payload }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: "Settings", href: "/app/settings" }, { label: "Notifications" }]} />
      <h1 className="text-lg font-semibold text-white mb-2">Notifications</h1>
      <p className="text-sm text-zinc-500 mb-6">Choose how and when you want to be notified.</p>

      {loading ? (
        <p className="text-sm text-zinc-500 mb-6">Loading notification preferences…</p>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {EVENTS.map((event) => (
              <div
                key={event.key}
                className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{event.label}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{event.desc}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    {(["push", "sms", "email"] as Channel[]).map((ch) => (
                      <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefs[event.key]?.has(ch) ?? false}
                          onChange={() => toggle(event.key, ch)}
                          className="rounded accent-white"
                        />
                        <span className="text-[11px] text-zinc-400 capitalize">{ch}</span>
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
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
