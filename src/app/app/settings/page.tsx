"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Link2,
  Mic2,
  Phone,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const SETTINGS_LINKS = [
  { href: "/app/settings/business", label: "Business", desc: "Name, address, website, timezone, industry", icon: Building2 },
  { href: "/app/settings/agent", label: "Agent", desc: "Voice, greeting, knowledge, language", icon: Mic2 },
  { href: "/app/settings/phone", label: "Phone", desc: "Numbers, forwarding status, add number", icon: Phone },
  { href: "/app/settings/call-rules", label: "Call rules", desc: "Hours, after-hours, emergency, transfer", icon: SlidersHorizontal },
  { href: "/app/settings/team", label: "Team", desc: "Members, invite, roles, escalation", icon: Users },
  { href: "/app/settings/notifications", label: "Notifications", desc: "Alerts for calls, leads, appointments", icon: Bell },
  { href: "/app/settings/integrations", label: "Integrations", desc: "Calendar, contacts, Zapier, Slack", icon: Link2 },
  { href: "/app/settings/compliance", label: "Compliance", desc: "Recording, HIPAA, retention, export", icon: Shield },
  { href: "/app/settings/billing", label: "Billing", desc: "Plan, payment, invoices, cancel", icon: CreditCard },
];

export default function AppSettingsPage() {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
      window.location.href = "/sign-in";
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Settings</h1>
      <p className="text-sm text-zinc-500 mb-6">Preferences and configuration</p>
      <div className="grid gap-3">
        {SETTINGS_LINKS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-colors group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-300">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white group-hover:text-white">{s.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
          </Link>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">← Activity</Link>
      </p>
    </div>
  );
}
