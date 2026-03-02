"use client";

import Link from "next/link";

const SETTINGS_LINKS = [
  { href: "/app/settings/business", label: "Business", desc: "Name, address, website, timezone, industry" },
  { href: "/app/settings/phone", label: "Phone", desc: "Numbers, forwarding status, add number" },
  { href: "/app/settings/call-rules", label: "Call rules", desc: "Hours, after-hours, emergency, transfer" },
  { href: "/app/settings/team", label: "Team", desc: "Members, invite, roles, escalation" },
  { href: "/app/settings/notifications", label: "Notifications", desc: "Alerts for calls, leads, appointments" },
  { href: "/app/settings/integrations", label: "Integrations", desc: "Calendar, Outlook, Zapier" },
  { href: "/app/settings/compliance", label: "Compliance", desc: "Recording, HIPAA, retention, export" },
  { href: "/app/settings/billing", label: "Billing", desc: "Plan, payment, invoices, cancel" },
];

export default function AppSettingsPage() {
  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Settings</h1>
      <p className="text-sm text-zinc-500 mb-6">Preferences and configuration</p>
      <div className="grid gap-3">
        {SETTINGS_LINKS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
          >
            <p className="font-medium text-white">{s.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
          </Link>
        ))}
      </div>
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-blue-400 hover:underline">← Activity</Link>
      </p>
    </div>
  );
}
