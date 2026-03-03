"use client";

import Link from "next/link";

export default function AppSettingsNotificationsPage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-4">Notifications</h1>
      <p className="text-sm text-zinc-400 mb-4">Call received, Lead captured, Appointment booked — Push, SMS, Email.</p>
      <div className="space-y-3">
        {["Call received", "Lead captured", "Appointment booked"].map((event) => (
          <div key={event} className="flex items-center justify-between p-3 rounded-xl border border-zinc-800">
            <span className="text-sm text-white">{event}</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" className="rounded" /> Push</label>
              <label className="flex items-center gap-1 text-xs text-zinc-400"><input type="checkbox" className="rounded" /> Email</label>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
