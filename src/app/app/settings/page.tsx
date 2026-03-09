"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Code,
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
  { href: "/app/settings/billing", label: "Billing", desc: "Plan, payment, invoices, cancel", icon: CreditCard },
  { href: "/app/settings/compliance", label: "Compliance", desc: "Consent, recording, do-not-call", icon: Shield },
  { href: "/app/developer", label: "Developer", desc: "API keys, webhooks, documentation", icon: Code },
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
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Settings</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">Preferences and configuration</p>
      <div className="grid gap-3">
        {SETTINGS_LINKS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-medium)] transition-colors group focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)]">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">{s.label}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
          </Link>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-400/90 mb-3">Danger zone</p>
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 space-y-3">
          <Link
            href="/app/settings/billing"
            className="block text-sm text-zinc-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded"
          >
            Cancel subscription →
          </Link>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.confirm("Delete all workspace data (calls, leads, agents)? This cannot be undone. Contact support to complete.")) {
                toast.info("Contact support to permanently delete your data.");
              }
            }}
            className="block text-sm text-red-300 hover:text-red-200 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded text-left"
          >
            Delete all data
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.confirm("Permanently delete your account and all associated data? This cannot be undone. Contact support to complete.")) {
                toast.info("Contact support to permanently delete your account.");
              }
            }}
            className="block text-sm text-red-300 hover:text-red-200 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded text-left"
          >
            Delete account
          </button>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded">← Dashboard</Link>
      </p>
    </div>
  );
}
