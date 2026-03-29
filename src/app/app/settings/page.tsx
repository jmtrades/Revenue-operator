"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
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
  AudioLines,
  Link2,
  MessageSquare,
  Mic2,
  Monitor,
  Moon,
  Palette,
  Phone,
  PhoneCall,
  Radio,
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
  { href: "/app/settings/voices", linkKey: "voices", icon: AudioLines },
  { href: "/app/settings/compliance", linkKey: "compliance", icon: Shield },
  { href: "/app/settings/industry-templates", linkKey: "industryTemplates", icon: Monitor },
  { href: "/app/settings/chat-widget", linkKey: "chatWidget", icon: MessageSquare },
  { href: "/app/settings/communication", linkKey: "communication", icon: Radio },
  { href: "/app/settings/white-label", linkKey: "whiteLabel", icon: Palette },
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    document.title = `${tSettings("pageTitle", { defaultValue: "Settings — Revenue Operator" })}`;
  }, [tSettings]);

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

    // Load from cache first for instant UI
    try {
      const cached = localStorage.getItem("rt_profile_cache");
      if (cached) {
        const { displayName: cachedName, timezone: cachedTz } = JSON.parse(cached) as { displayName?: string; timezone?: string };
        if (cachedName) setDisplayName(cachedName);
        if (cachedTz) setTimezone(cachedTz);
      }
    } catch {
      // ignore cache errors
    }

    // Fetch fresh data in background
    setSyncing(true);
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
          if ((data.session.timezone ?? "").trim()) {
            setTimezone((data.session.timezone ?? "").trim());
          }
        },
      )
      .catch(() => {
        // ignore; profile is optional
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
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

    // Validate form
    if (displayName.trim().length > 100) {
      toast.error("Display name must be 100 characters or less", { icon: "❌" });
      return;
    }
    if (!timezone.trim()) {
      toast.error("Timezone is required", { icon: "❌" });
      return;
    }

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

      // Cache the profile data
      try {
        localStorage.setItem(
          "rt_profile_cache",
          JSON.stringify({
            displayName: displayName.trim(),
            timezone: timezone.trim(),
          })
        );
      } catch {
        // ignore cache errors
      }

      setLastSaved(new Date());
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
          <div className="mb-4">
            <Breadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Settings" }]} />
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-1">{tSettings("title")}</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{tSettings("pageSubtitle")}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-[var(--text-primary)]">{tSettings("profileTitle")}</h2>
            {lastSaved && (
              <span className="text-xs text-[var(--text-tertiary)]">
                Last saved: {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          {syncing && (
            <div className="mb-4 text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
              <div className="inline-block w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-pulse" />
              Syncing...
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{tSettings("emailLabel")}</label>
              <p className="text-sm text-[var(--text-secondary)]">{email ?? "—"}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Contact support to change your email</p>
            </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">
                {tSettings("displayNameLabel")}
              </label>
              <span className="text-xs text-[var(--text-tertiary)]">
                {displayName.length}/100
              </span>
            </div>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 100))}
              placeholder={tSettings("displayNamePlaceholder")}
              maxLength={100}
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
            <div className={`w-2 h-2 rounded-full ${systemHealthData.passed === systemHealthData.total ? "bg-[var(--accent-primary)]" : "bg-[var(--accent-warning,#f59e0b)]"}`} />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {systemHealthData.passed === systemHealthData.total ? "All systems operational" : `Setup incomplete — ${systemHealthData.passed} of ${systemHealthData.total} checks passing`}
            </span>
            {systemHealthData.passed !== systemHealthData.total && (
              <Link href="/app/dashboard" className="text-[11px] text-[var(--accent-primary)] hover:underline ml-2">View details →</Link>
            )}
          </div>
        )}

        {/* Core Configuration */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] px-1 mb-3">{tSettings("nav.sectionBusiness")}</p>
          <div className="grid gap-3">
            {SETTINGS_LINKS.filter((s) => ["business", "phone", "agent", "voices", "callRules", "outbound"].includes(s.linkKey)).map((s) => {
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
            {SETTINGS_LINKS.filter((s) => ["leadScoring", "industryTemplates", "notifications", "integrations", "chatWidget", "communication"].includes(s.linkKey)).map((s) => {
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
            {SETTINGS_LINKS.filter((s) => ["billing", "team", "compliance", "whiteLabel", "activity", "developer", "errors"].includes(s.linkKey)).map((s) => {
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
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-danger,#ef4444)]/90 mb-3">{tSettings("dangerZone")}</p>
          <div className="rounded-xl border border-[var(--accent-danger,#ef4444)]/30 bg-[var(--accent-danger,#ef4444)]/10 p-4 space-y-3">
          <Link
            href="/app/settings/billing"
            className="block text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded"
          >
            {tSettings("cancelSubscription")}
          </Link>
          <button
            type="button"
            onClick={() => setConfirm("data")}
            className="block text-sm text-[var(--accent-danger,#ef4444)] dark:text-[var(--accent-danger,#ef4444)] hover:text-[var(--accent-danger,#ef4444)] dark:hover:text-[var(--accent-danger,#ef4444)]/80 transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded text-left"
          >
            {tSettings("requestDeleteData")}
          </button>
          <button
            type="button"
            onClick={() => setConfirm("account")}
            className="block text-sm text-[var(--accent-danger,#ef4444)] dark:text-[var(--accent-danger,#ef4444)] hover:text-[var(--accent-danger,#ef4444)] dark:hover:text-[var(--accent-danger,#ef4444)]/80 transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none rounded text-left"
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
        {/* Security trust note */}
        <div className="flex items-center gap-3 mt-6 py-3 border-t border-[var(--border-default)] text-[10px] text-[var(--text-tertiary)]">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Your data is protected with 256-bit encryption and SOC 2 Type II controls.</span>
        </div>
        <p className="mt-3">
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
