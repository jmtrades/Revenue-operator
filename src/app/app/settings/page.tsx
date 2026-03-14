"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronRight,
  Code,
  CreditCard,
  History,
  Link2,
  Mic2,
  Phone,
  Shield,
  SlidersHorizontal,
  Target,
  Users,
} from "lucide-react";

const SETTINGS_LINKS = [
  {
    href: "/app/settings/business",
    label: "Business settings",
    desc: "Business name, address, website, timezone, industry",
    icon: Building2,
  },
  {
    href: "/app/settings/phone",
    label: "Phone & numbers",
    desc: "Buy numbers, forwarding status, caller ID, routing",
    icon: Phone,
  },
  {
    href: "/app/settings/agent",
    label: "AI agent configuration",
    desc: "Voice, greeting, behavior, knowledge, languages",
    icon: Mic2,
  },
  {
    href: "/app/settings/call-rules",
    label: "Call rules",
    desc: "Hours, after-hours behavior, emergency, transfer logic",
    icon: SlidersHorizontal,
  },
  {
    href: "/app/settings/team",
    label: "Team & permissions",
    desc: "Members, roles, escalation contacts, login access",
    icon: Users,
  },
  {
    href: "/app/settings/notifications",
    label: "Notifications",
    desc: "Alerts for new calls, leads, appointments, missed calls",
    icon: Bell,
  },
  {
    href: "/app/settings/lead-scoring",
    label: "Lead scoring",
    desc: "Weights for scoring leads from calls and interactions",
    icon: Target,
  },
  {
    href: "/app/settings/integrations",
    label: "Integrations",
    desc: "Calendar, CRM, webhooks, Slack, Zapier",
    icon: Link2,
  },
  {
    href: "/app/settings/billing",
    label: "Billing & plans",
    desc: "Current plan, usage, invoices, cancellation",
    icon: CreditCard,
  },
  {
    href: "/app/settings/compliance",
    label: "Compliance",
    desc: "Recording consent, do-not-call, regional rules",
    icon: Shield,
  },
  {
    href: "/app/settings/activity",
    label: "Activity log",
    desc: "Recent settings and workspace changes",
    icon: History,
  },
  {
    href: "/app/settings/errors",
    label: "Error reports",
    desc: "Client errors and reports from this workspace",
    icon: AlertTriangle,
  },
  {
    href: "/app/developer",
    label: "Developer",
    desc: "API keys, webhooks, technical documentation",
    icon: Code,
  },
];

type ConfirmType = "data" | "account" | null;

export default function AppSettingsPage() {
  const tSettings = useTranslations("settings");
  const tToast = useTranslations("toast");
  const [signingOut, setSigningOut] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmType>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState(
    () =>
      (typeof Intl !== "undefined" &&
        Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "America/Los_Angeles",
  );
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { session?: { userId?: string | null; email?: string | null; displayName?: string | null; timezone?: string | null } } | null) => {
          if (cancelled || !data?.session) return;
          setEmail(data.session.email ?? null);
          setDisplayName(data.session.displayName ?? "");
          if (data.session.timezone?.trim()) {
            setTimezone(data.session.timezone.trim());
          }
        },
      )
      .catch(() => {
        // ignore; profile is optional
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          timezone: timezone.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? tSettings("profile.saveFailed"));
        return;
      }
      toast.success(tSettings("profile.saved"));
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setSavingProfile(false);
    }
  };

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
      <div className="bg-[#161B22] border border-white/[0.08] rounded-xl p-6 mb-6">
        <h2 className="text-base font-medium text-white/90 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Email</label>
            <p className="text-sm text-white/60">{email ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">
              {tSettings("displayNameLabel")}
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={tSettings("displayNamePlaceholder")}
              className="w-full max-w-sm bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">{tSettings("timezoneLabel")}</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none max-w-sm"
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
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-4 py-2 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            {savingProfile ? tSettings("savingProfile") : tSettings("saveProfile")}
          </button>
        </div>
      </div>
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
      <div className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Need to revisit onboarding?
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Run the 5-step setup again to tune your AI agent and phone settings.
          </p>
        </div>
        <Link
          href="/app/onboarding"
          className="px-4 py-2 bg-white text-black font-semibold rounded-xl text-xs hover:bg-zinc-100 transition-colors whitespace-nowrap"
        >
          Open setup
        </Link>
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
            onClick={() => setConfirm("data")}
            className="block text-sm text-red-300 hover:text-red-200 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded text-left"
          >
            Delete all data
          </button>
          <button
            type="button"
            onClick={() => setConfirm("account")}
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
      {confirm === "data" && (
        <ConfirmDialog
          open
          title="Delete all data"
          message="Delete all workspace data (calls, leads, agents)? This cannot be undone. Contact support to complete."
          confirmLabel="Delete all data"
          variant="danger"
          onConfirm={() => toast.info(tSettings("deleteDataInfo"))}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "account" && (
        <ConfirmDialog
          open
          title="Delete account"
          message="Permanently delete your account and all associated data? This cannot be undone. Contact support to complete."
          confirmLabel="Delete account"
          variant="danger"
          onConfirm={() => toast.info(tSettings("deleteAccountInfo"))}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
