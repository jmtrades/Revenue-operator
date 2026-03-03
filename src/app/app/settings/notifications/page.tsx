"use client";

import { useState } from "react";
import Link from "next/link";

const EVENTS = [
  { key: "call_received", label: "Call received", desc: "Every time your AI answers a call" },
  { key: "lead_captured", label: "Lead captured", desc: "When a caller is identified as a new lead" },
  { key: "appointment_booked", label: "Appointment booked", desc: "When your AI books an appointment" },
  { key: "urgent_call", label: "Urgent call", desc: "Emergency or high-priority calls" },
  { key: "voicemail", label: "Voicemail left", desc: "When a caller leaves a voicemail" },
];

type Channel = "push" | "sms" | "email";

export default function AppSettingsNotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, Set<Channel>>>(() => {
    const defaults: Record<string, Set<Channel>> = {};
    EVENTS.forEach((e) => { defaults[e.key] = new Set(["push"] as Channel[]); });
    defaults["urgent_call"] = new Set(["push", "sms"] as Channel[]);
    return defaults;
  });
  const [toast, setToast] = useState<string | null>(null);

  const toggle = (event: string, channel: Channel) => {
    setPrefs((p) => {
      const next = { ...p };
      const set = new Set(next[event]);
      if (set.has(channel)) set.delete(channel); else set.add(channel);
      next[event] = set;
      return next;
    });
  };

  const handleSave = () => {
    setToast("Notification preferences saved");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Notifications</h1>
      <p className="text-sm text-zinc-500 mb-6">Choose how and when you want to be notified.</p>

      <div className="space-y-3 mb-6">
        {EVENTS.map((event) => (
          <div key={event.key} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{event.label}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{event.desc}</p>
              </div>
              <div className="flex gap-3 shrink-0">
                {(["push", "sms", "email"] as Channel[]).map((ch) => (
                  <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={prefs[event.key]?.has(ch) ?? false} onChange={() => toggle(event.key, ch)} className="rounded accent-white" />
                    <span className="text-[11px] text-zinc-400 capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors">Save preferences</button>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
