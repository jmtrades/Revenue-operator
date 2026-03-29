"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReadinessChecklist } from "@/components/settings/ReadinessChecklist";
import { ActivityLog } from "@/components/settings/ActivityLog";
import { useWorkspace } from "@/components/WorkspaceContext";
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronRight,
  Circle,
  Code,
  CreditCard,
  History,
  Link2,
  Mic2,
  Monitor,
  Moon,
  Phone,
  PhoneCall,
  Shield,
  SlidersHorizontal,
  Sun,
  Target,
  Users,
} from "lucide-react";

const SETTINGS_LINKS: { href: string; linkKey: string; icon: typeof Building2 }[] = [
  { href: "/app/settings/business", linkKey: "business", icon: Building2 },
  { href: "/app/settings/phone", linkKey: "phone", icon: Phone },
  { href: "/app/settings/agent", linkKey: "agent", icon: Mic2 },
  { href: "/app/settings/call-rules", linkKey: "callRules", icon: SlidersHorizontal },
  { href: "/app/settings/outbound", linkKey: "outbound", icon: PhoneCall },
  { href: "/app/settings/team", linkKey: "team", icon: Users },
  { href: "/app/settings/notifications", linkKey: "notifications", icon: Bell },
  { href: "/app/settings/lead-scoring", linkKey: "leadScoring", icon: Target },
  { href: "/app/settings/integrations", linkKey: "integrations", icon: Link2 },
  { href: "/app/settings/billing", linkKey: "billing", icon: CreditCard },
  { href: "/app/settings/compliance", linkKey: "compliance", icon: Shield },
  { href: "/app/settings/activity", linkKey: "activity", icon: History },
  { href: "/app/settings/errors", linkKey: "errors", icon: AlertTriangle },
  { href: "/app/developer", linkKey: "developer", icon: Code },
];

type ConfirmType = "data" | "account" | null;

export default function AppSettingsPage() {
  const tSettings = useTranslations("settings");
  const tToast = useTranslations("toast");
  const { workspaceId } = useWorkspace();
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
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [systemHealthData, setSystemHealthData] = useState<{ passed: number; total: number } | null>(null);

  // Initialize theme from DOM/localStorage
  useEffect(() => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) setTheme("dark");
    else if (html.classList.contains("light")) setTheme("light");
    else setTheme("system");
  }, []);

  const applyTheme = (newTheme: "system" | "light" | "dark") => {
    setTheme(newTheme);
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    if (newTheme === "light") {
      html.classList.add("light");
      localStorage.setItem("theme", "light");
    } else if (newTheme === "dark") {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      localStorage.removeItem("theme");
      // Apply system preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        html.classList.add("dark");
      }
    }
  };

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

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/readiness?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.checks) {
          const total = data.checks.length;
          const passed = data.checks.filter((c: { passed: boolean }) => c.passed).length;
          setSystemHealthData({ passed, total });
        }
      })
      .catch(() => {});
  }, [workspaceId]);

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
        const errorMsg = body.error ?? tSettings("profile.saveFailed");
        toast.error(errorMsg, { icon: "❌" });
        return;
      }
      toast.success(tSettings("profile.saved"), { icon: "✓" });
    } catch {
      toast.error(tToast("error.generic"), { icon: "❌" });
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
    <div className="max-w-[600px] mx-auto">
      {/* Settings Header */}
      <div className="relative bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-hover)] border-b border-[var(--border-default)] px-4 md:px-6 py-8 md:py-10 overflow-hidden">
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/50 via-violet-500/50 to-transparent" />

        {/* Ambient background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-1">{tSettings("title")}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{tSettings("pageSubtitle")}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 mb-6">
          <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">{tSettings("profileTitle")}</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{tSettings("emailLabel")}</label>
              <p className="text-sm text-[var(--text-secondary)]">{email ?? "—"}</p>
            </div>
          <div>
            <label className="text-xs text-[var(--text-tertiary)] mb-1 block">
              {tSettings("displayNameLabel")}
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={tSettings("displayNamePlaceholder")}
              className="w-full max-w-sm bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-default)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{tSettings("timezoneLabel")}</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-default)] focus:outline-none max-w-sm"
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
            className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-lg text-sm hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-60"
          >
            {savingProfile ? tSettings("savingProfile") : tSettings("saveProfile")}
          </button>
        </div>
        </div>
        {/* Appearance */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 mb-6">
        <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">{tSettings("appearance.title")}</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">{tSettings("appearance.description")}</p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { id: "system" as const, icon: Monitor, labelKey: "appearance.system" },
            { id: "light" as const, icon: Sun, labelKey: "appearance.light" },
            { id: "dark" as const, icon: Moon, labelKey: "appearance.dark" },
          ]).map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => applyTheme(id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${
                theme === id
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]"
                  : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
              }`}
            >
              <Icon className="w-5 h-5" />
              {tSettings(labelKey)}
            </button>
          ))}
        </div>
        </div>

        <div className="mb-6">
          <ReadinessChecklist />
        </div>

        {/* Recent Activity */}
        {workspaceId && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 mb-6">
            <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">Recent Activity</h2>
            <ActivityLog workspaceId={workspaceId} />
          </div>
        )}

        {/* System Health Indicator */}
        {systemHealthData && (
          <div className="mb-6 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemHealthData.passed === systemHealthData.total ? "bg-green-500" : "bg-amber-500"}`} />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {systemHealthData.passed === systemHealthData.total ? "All systems operational" : "Setup incomplete"}
            </span>
          </div>
        )}

        {/* Core Configuration */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] px-1 mb-3">{tSettings("nav.sectionBusiness")}</p>
          <div className="grid gap-3">
            {SETTINGS_LINKS.filter((s) => ["business", "phone", "agent", "callRules", "outbound"].includes(s.linkKey)).map((s) => {
            const isPhoneSettings = s.linkKey === "phone";
            const isAgentSettings = s.linkKey === "agent";
            const showIndicator = isPhoneSettings || isAgentSettings;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-medium)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] group focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)]">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                    {tSettings(`links.${s.linkKey}.label`)}
                    {showIndicator && (
                      <span className="ml-2 text-xs text-[var(--text-secondary)]">
                        {isPhoneSettings && tSettings("links.phone.required")}
                        {isAgentSettings && tSettings("links.agent.required")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{tSettings(`links.${s.linkKey}.desc`)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-tertiary)]" />
              </Link>
            );
            })}
          </div>
        </div>

        {/* Intelligence & Automation */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] px-1 mb-3">Intelligence & Automation</p>
          <div className="grid gap-3">
            {SETTINGS_LINKS.filter((s) => ["leadScoring", "notifications", "integrations"].includes(s.linkKey)).map((s) => {
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-medium)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] group focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)]">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                    {tSettings(`links.${s.linkKey}.label`)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{tSettings(`links.${s.linkKey}.desc`)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-tertiary)]" />
              </Link>
            );
            })}
          </div>
        </div>

        {/* Account & Compliance */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] px-1 mb-3">Account & Compliance</p>
          <div className="grid gap-3">
            {SETTINGS_LINKS.filter((s) => ["billing", "team", "compliance", "activity", "developer", "errors"].includes(s.linkKey)).map((s) => {
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-medium)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] group focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)]">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                    {tSettings(`links.${s.linkKey}.label`)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{tSettings(`links.${s.linkKey}.desc`)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-tertiary)]" />
              </Link>
            );
            })}
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex items-center justify-between gap-4">
          <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {tSettings("revisitOnboarding")}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {tSettings("revisitOnboardingDesc")}
          </p>
          </div>
          <Link
            href="/activate"
            className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl text-xs hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] whitespace-nowrap"
          >
            {tSettings("openSetup")}
          </Link>
        </div>
        <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400/90 mb-3">{tSettings("dangerZone")}</p>
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 space-y-3">
          <Link
            href="/app/settings/billing"
            className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded"
          >
            {tSettings("cancelSubscription")}
          </Link>
          <button
            type="button"
            onClick={() => setConfirm("data")}
            className="block text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded text-left"
          >
            {tSettings("requestDeleteData")}
          </button>
          <button
            type="button"
            onClick={() => setConfirm("account")}
            className="block text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded text-left"
          >
            {tSettings("requestDeleteAccount")}
          </button>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-[background-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
          >
            {signingOut ? tSettings("signingOut") : tSettings("signOut")}
          </button>
        </div>
        <p className="mt-6">
          <Link href="/app/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded">{tSettings("backToDashboard")}</Link>
        </p>
      </div>
      {confirm === "data" && (
        <ConfirmDialog
          open
          title={tSettings("deleteAllDataTitle")}
          message={tSettings("deleteAllDataMessage")}
          confirmLabel={tSettings("deleteAllDataConfirmLabel")}
          variant="danger"
          onConfirm={async () => {
            try {
              const res = await fetch("/api/support/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  type: "delete_data",
                  email,
                }),
              });
              if (res.ok) {
                toast.success(tSettings("support.requestSubmitted"));
                setConfirm(null);
              } else {
                toast.error(tSettings("support.requestFailed"));
              }
            } catch {
              toast.error(tSettings("support.requestFailed"));
            }
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "account" && (
        <ConfirmDialog
          open
          title={tSettings("deleteAccountTitle")}
          message={tSettings("deleteAccountMessage")}
          confirmLabel={tSettings("deleteAccountConfirmLabel")}
          variant="danger"
          onConfirm={async () => {
            try {
              const res = await fetch("/api/support/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  type: "delete_account",
                  email,
                }),
              });
              if (res.ok) {
                toast.success(tSettings("support.requestSubmitted"));
                setConfirm(null);
              } else {
                toast.error(tSettings("support.requestFailed"));
              }
            } catch {
              toast.error(tSettings("support.requestFailed"));
            }
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
