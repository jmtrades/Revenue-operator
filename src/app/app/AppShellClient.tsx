"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { WorkspaceProvider } from "@/components/WorkspaceContext";
import { WorkspaceName } from "@/components/WorkspaceName";
import { fetchWorkspaceMeCached, primeWorkspaceMeCache } from "@/lib/client/workspace-me";
import { safeGetItem, safeSetItem } from "@/lib/client/safe-storage";
import {
  LayoutList,
  PhoneCall,
  Users,
  Megaphone,
  MessageSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Command as CommandIcon,
  Check,
  BookOpen,
  Clock,
  CreditCard,
  LogOut,
  Bot,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PageTransition } from "@/components/ui/PageTransition";
import { LanguageSwitcher as _LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { TranslatedErrorBoundary } from "@/components/ErrorBoundary";
import { initErrorReporting } from "@/lib/error-reporting";
import { initPostHogClient, track } from "@/lib/analytics/posthog";
import { getClientOrNull } from "@/lib/supabase/client";
import {
  OnboardingStepProvider,
  useOnboardingStep,
  ONBOARDING_STEP_LABELS,
} from "./OnboardingStepContext";

const CommandPalette = dynamic(
  () => import("@/components/ui/CommandPalette").then((mod) => mod.CommandPalette),
  { ssr: false },
);

export type AppShellWorkspaceMeta = {
  banner?: { show?: boolean; text?: string | null; href?: string; cta?: string };
  onboardingCompletedAt?: string | null;
  stats?: { calls?: number };
  progress?: { items?: Array<{ key: string; completed: boolean }> };
} | null;

export default function AppShellClient({
  children,
  initialWorkspaceId,
  initialWorkspaceName,
  initialWorkspaceMeta,
}: {
  children: ReactNode;
  initialWorkspaceId?: string;
  initialWorkspaceName?: string;
  initialWorkspaceMeta?: AppShellWorkspaceMeta;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const sidebarGroups = useMemo(
    () => [
      {
        label: t("nav.sectionMain"),
        items: [
          { href: "/app/dashboard", label: t("nav.dashboard"), icon: LayoutList },
          { href: "/app/agents", label: t("nav.agents"), icon: Bot },
          { href: "/app/calls", label: t("nav.calls"), icon: PhoneCall },
          { href: "/app/contacts", label: t("nav.contacts"), icon: Users },
          { href: "/app/inbox", label: t("nav.inbox"), icon: MessageSquare },
        ],
      },
      {
        label: "Recovery & Growth",
        items: [
          { href: "/app/campaigns", label: t("nav.campaigns"), icon: Megaphone },
          { href: "/app/follow-ups", label: t("nav.followUps"), icon: Clock },
          { href: "/app/appointments", label: t("nav.appointments"), icon: CalendarCheck },
          { href: "/app/analytics", label: t("nav.analytics"), icon: BarChart3 },
          { href: "/app/knowledge", label: t("nav.knowledge"), icon: BookOpen },
        ],
      },
      {
        label: t("nav.sectionWorkspace"),
        items: [
          { href: "/app/settings", label: t("nav.settings"), icon: Settings },
          { href: "/app/billing", label: t("nav.billing"), icon: CreditCard },
        ],
      },
    ],
    [t]
  );
  const mobileTabs = useMemo(
    () => [
      { href: "/app/dashboard", label: t("nav.dashboard"), icon: LayoutList },
      { href: "/app/calls", label: t("nav.calls"), icon: PhoneCall },
      { href: "/app/inbox", label: t("nav.inbox"), icon: MessageSquare },
    ],
    [t]
  );
  const mobileMoreLinks = useMemo(
    () => [
      { href: "/app/agents", label: t("nav.agents"), icon: Bot },
      { href: "/app/contacts", label: t("nav.contacts"), icon: Users },
      { href: "/app/campaigns", label: t("nav.campaigns"), icon: Megaphone },
      { href: "/app/follow-ups", label: t("nav.followUps"), icon: Clock },
      { href: "/app/appointments", label: t("nav.appointments"), icon: CalendarCheck },
      { href: "/app/analytics", label: t("nav.analytics"), icon: BarChart3 },
      { href: "/app/knowledge", label: t("nav.knowledge"), icon: BookOpen },
      { href: "/app/settings", label: t("nav.settings"), icon: Settings },
      { href: "/app/billing", label: t("nav.billing"), icon: CreditCard },
    ],
    [t]
  );
  const [workspaceMeta, setWorkspaceMeta] = useState<AppShellWorkspaceMeta>(
    initialWorkspaceMeta ?? null,
  );
  const [workspaceMetaLoaded, setWorkspaceMetaLoaded] = useState(Boolean(initialWorkspaceMeta));
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeCalls, setActiveCalls] = useState(0);
  const [minutesUsage, setMinutesUsage] = useState<{ used: number; limit: number } | null>(null);
  const [billingInfo, setBillingInfo] = useState<{ billing_status?: string; billing_tier?: string; renewal_at?: string | null } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return safeGetItem("rt_sidebar") === "collapsed"; } catch { return false; }
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [nowMs] = useState(() => Date.now());
  const [showNotifications, setShowNotifications] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      safeSetItem("rt_sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };

  const handleSignOut = async () => {
    const client = getClientOrNull();
    if (client) {
      await client.auth.signOut();
    }
    router.push("/sign-in");
  };

  useEffect(() => {
    initErrorReporting();
    initPostHogClient();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === "/app/dashboard") track("dashboard_visited");
    if (pathname.startsWith("/app/analytics")) track("analytics_viewed");
    if (pathname.startsWith("/app/campaigns")) track("campaigns_viewed");

    if (pathname.startsWith("/app/campaigns")) {
      const firstUseKey = "rt_feature_first_use_campaigns";
      if (!safeGetItem(firstUseKey)) {
        track("feature_first_use", { feature: "campaigns" });
        safeSetItem(firstUseKey, "1");
      }
    }

    if (pathname.startsWith("/app/follow-ups")) {
      const firstUseKey = "rt_feature_first_use_follow_ups";
      if (!safeGetItem(firstUseKey)) {
        track("feature_first_use", { feature: "follow_ups" });
        safeSetItem(firstUseKey, "1");
      }
    }

    if (pathname.startsWith("/app/analytics")) {
      const firstUseKey = "rt_feature_first_use_analytics";
      if (!safeGetItem(firstUseKey)) {
        track("feature_first_use", { feature: "analytics" });
        safeSetItem(firstUseKey, "1");
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (initialWorkspaceMeta) {
      primeWorkspaceMeCache(initialWorkspaceMeta);
    }
  }, [initialWorkspaceMeta]);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceMeCached()
      .then((data) => {
        if (cancelled) return;
        setWorkspaceMeta(data as AppShellWorkspaceMeta);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setWorkspaceMetaLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspaceMetaLoaded || pathname === "/activate") return;
    try {
      const serverOnboarded = Boolean(workspaceMeta?.onboardingCompletedAt);
      const localOnboarded = safeGetItem("rt_onboarded") === "true";
      if (!serverOnboarded && !localOnboarded) {
        router.replace("/activate");
      }
    } catch {
      // ignore
    }
  }, [workspaceMetaLoaded, pathname, router, workspaceMeta?.onboardingCompletedAt]);

  useEffect(() => {
    const client = getClientOrNull();
    if (!client) return;
    const fetchActive = () =>
      client
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .is("call_ended_at", null)
        .then((res: { count: number | null }) => {
          setActiveCalls(res.count ?? 0);
        })
        .catch(() => {});

    void fetchActive();

    const channel = client
      .channel("active-calls")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions" },
        () => {
          void fetchActive();
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: { id?: string | null } | null) => {
        const wid = data?.id;
        if (!wid) return;
        fetch(`/api/billing/status?workspace_id=${encodeURIComponent(wid)}`, { credentials: "include" })
          .then((res) => (res.ok ? res.json() : null))
          .then((billing: { minutes_used?: number; minutes_limit?: number; billing_status?: string; billing_tier?: string; renewal_at?: string | null } | null) => {
            if (billing && typeof billing.minutes_used === "number") {
              setMinutesUsage({ used: billing.minutes_used, limit: billing.minutes_limit ?? 400 });
            }
            if (billing) {
              setBillingInfo({ billing_status: billing.billing_status, billing_tier: billing.billing_tier, renewal_at: billing.renewal_at });
            }
          })
          .catch(() => {});
        // Fetch unread inbox count
        fetch(`/api/inbox/unread?workspace_id=${encodeURIComponent(wid)}`, { credentials: "include" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { count?: number } | null) => {
            if (data && typeof data.count === "number") setInboxUnread(data.count);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isMeta) {
        if (key === "k") {
          event.preventDefault();
          setCommandPaletteOpen((prev) => !prev);
          return;
        }

        if (key === "1") {
          event.preventDefault();
          router.push("/app/activity");
          return;
        }
        if (key === "2") {
          event.preventDefault();
          router.push("/app/agents");
          return;
        }
        if (key === "3") {
          event.preventDefault();
          router.push("/app/calls");
          return;
        }
        if (key === "4") {
          event.preventDefault();
          router.push("/app/leads");
          return;
        }
        if (key === "5") {
          event.preventDefault();
          router.push("/app/campaigns");
          return;
        }
        if (key === "6") {
          event.preventDefault();
          router.push("/app/inbox");
          return;
        }
      } else {
        if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const active = document.activeElement;
          if (
            active &&
            (active.tagName === "INPUT" ||
              active.tagName === "TEXTAREA" ||
              (active as HTMLElement).isContentEditable)
          ) {
            return;
          }
          event.preventDefault();
          setShowShortcuts((s) => !s);
          return;
        }
        if (event.key === "Escape") {
          if (showShortcuts) {
            setShowShortcuts(false);
            return;
          }
          if (showNotifications) {
            setShowNotifications(false);
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, showShortcuts, showNotifications]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMoreOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCommandPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandPaletteOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/app/activity" && pathname.startsWith(href));

  const isMoreActive = mobileMoreLinks.some(({ href }) => isActive(href));
  const isOnboarding = pathname === "/activate";

  return (
    <WorkspaceProvider
      initialWorkspaceId={initialWorkspaceId}
      initialWorkspaceName={initialWorkspaceName}
    >
      <OnboardingStepProvider>
        <div className="min-h-screen flex flex-col pb-20 md:pb-0 bg-[var(--bg-base)]">
          {workspaceMeta?.banner?.show && workspaceMeta.banner.text && (
            <div
              className="shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-center text-[13px] text-[var(--text-secondary)]"
              role="status"
              aria-label={t("accessibility.workspaceStatus")}
            >
              <span>{workspaceMeta.banner.text}</span>
              <Link
                href={workspaceMeta.banner.href || "/app/settings/phone"}
                className="font-medium text-[var(--text-primary)] underline underline-offset-2 hover:no-underline"
              >
                {workspaceMeta.banner.cta || t("nav.setupCta")}
              </Link>
            </div>
          )}
          {mobileSidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-[var(--bg-hover)] md:hidden"
                onClick={() => setMobileSidebarOpen(false)}
                aria-hidden
              />
            )}
            <div className="flex flex-1 min-h-0">
            {isOnboarding ? (
              <OnboardingSidebar initialWorkspaceName={initialWorkspaceName} />
            ) : (
              <>
              <aside
                className={cn(
                  "fixed inset-y-0 left-0 z-40 flex flex-col shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-default)] transform transition-[transform,width] duration-250 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                  mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
                  "md:relative md:translate-x-0",
                  sidebarCollapsed ? "md:w-[60px]" : "md:w-[232px]",
                  "w-[260px]"
                )}
                data-product-tour="sidebarNav"
                aria-label={t("accessibility.appNav")}
              >
                {/* Brand header */}
                <div className={cn(
                  "border-b border-[var(--border-default)] flex items-center gap-2.5 shrink-0 transition-all duration-250",
                  sidebarCollapsed ? "md:justify-center md:px-0 px-5 py-4 md:py-4" : "px-5 py-4 justify-between"
                )}>
                  <div className={cn("flex items-center min-w-0", sidebarCollapsed && "md:justify-center")}>
                    <div className="w-8 h-8 bg-[var(--accent-primary)] rounded-[var(--radius-btn)] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
                      <span className="text-[var(--text-on-accent)] font-bold text-sm leading-none">RT</span>
                    </div>
                    {!sidebarCollapsed && (
                      <WorkspaceName
                        initialName={initialWorkspaceName}
                        className="truncate block text-[14px] font-semibold text-[var(--text-primary)] ml-2.5 tracking-[-0.01em]"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="md:hidden p-1.5 rounded-[var(--radius-btn)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none"
                    aria-label={t("common.close")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation groups */}
                <nav className="flex-1 px-3 py-2 overflow-y-auto" aria-label={t("nav.appNavigation")}>
                  {sidebarGroups.map((group, groupIdx) => (
                    <div key={group.label} className={groupIdx > 0 ? "mt-5" : "mt-2"}>
                      {!sidebarCollapsed && (
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] px-3 pb-1.5 font-semibold select-none">
                          {group.label}
                        </p>
                      )}
                      {sidebarCollapsed && groupIdx > 0 && (
                        <div className="mx-3 mb-2 border-t border-[var(--border-default)]" />
                      )}
                      <div className="space-y-px">
                        {group.items.map(({ href, label, icon: Icon }) => {
                          const effectiveLabel =
                            href === "/app/inbox" && inboxUnread > 0 ? `Inbox (${inboxUnread})` : label;
                          const active = isActive(href);
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setMobileSidebarOpen(false)}
                              data-product-tour={
                                href === "/app/campaigns"
                                  ? "sidebarCampaigns"
                                  : href === "/app/settings"
                                    ? "sidebarSettings"
                                    : undefined
                              }
                              className={cn(
                                "group relative flex items-center rounded-[var(--radius-btn)] text-[13px] font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none",
                                sidebarCollapsed ? "md:justify-center md:px-0 px-3 py-2" : "gap-2.5 px-3 py-[7px]",
                                active
                                  ? "bg-[var(--accent-primary)]/[0.08] text-[var(--accent-primary)]"
                                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                              )}
                              aria-current={active ? "page" : undefined}
                            >
                              {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-primary)]" />
                              )}
                              <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-colors duration-150", active ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]")} strokeWidth={1.75} />
                              {!sidebarCollapsed && (
                                <span className="truncate">{effectiveLabel}</span>
                              )}
                              {!sidebarCollapsed && href === "/app/inbox" && inboxUnread > 0 && (
                                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1.5 text-[10px] font-semibold text-white">
                                  {inboxUnread}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                {/* Sidebar footer */}
                <div className="px-3 py-3 border-t border-[var(--border-default)] space-y-2">
                  {!sidebarCollapsed && (
                    <>
                      <div className="rounded-[var(--radius-btn)] bg-[var(--bg-inset)]/60 border border-[var(--border-default)] px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
                            {billingInfo?.billing_tier
                              ? `${billingInfo.billing_tier.charAt(0).toUpperCase()}${billingInfo.billing_tier.slice(1)}`
                              : t("sidebar.tier", { defaultValue: "Starter" })}
                          </span>
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            billingInfo?.billing_status === "active"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]"
                          )}>
                            {billingInfo?.billing_status === "trial" ? "Trial" : billingInfo?.billing_status === "active" ? "Active" : billingInfo?.billing_status ? billingInfo.billing_status.charAt(0).toUpperCase() + billingInfo.billing_status.slice(1) : "Trial"}
                          </span>
                        </div>
                        <span className="block text-[11px] text-[var(--text-tertiary)] mt-1">
                          {billingInfo?.billing_status === "trial" && billingInfo?.renewal_at
                            ? `${Math.max(0, Math.ceil((new Date(billingInfo.renewal_at).getTime() - nowMs) / 86400000))} days left`
                            : billingInfo?.billing_status === "active"
                            ? t("sidebar.activeSubscription", { defaultValue: "Active subscription" })
                            : ""}
                          {(workspaceMeta?.stats?.calls ?? 0) > 0
                            ? ` · ${workspaceMeta?.stats?.calls ?? 0} ${t("sidebar.callsAnswered", { defaultValue: "calls" })}`
                            : ""}
                        </span>
                        {minutesUsage && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
                              <span>{minutesUsage.used}/{minutesUsage.limit} {t("sidebar.minUsed", { defaultValue: "min" })}</span>
                              <span>{Math.round((minutesUsage.used / minutesUsage.limit) * 100)}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-[var(--border-default)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                                style={{ width: `${Math.min(100, (minutesUsage.used / minutesUsage.limit) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none"
                        aria-label={t("nav.signOut")}
                      >
                        <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                        <span>{t("nav.signOut")}</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={toggleSidebarCollapse}
                    className={cn(
                      "hidden md:flex w-full items-center justify-center gap-2 py-1.5 rounded-[var(--radius-btn)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none",
                      sidebarCollapsed && "md:justify-center"
                    )}
                    aria-label={sidebarCollapsed ? t("accessibility.expandSidebar") : t("accessibility.collapseSidebar")}
                  >
                    {sidebarCollapsed ? (
                      <PanelLeftOpen className="w-4 h-4" />
                    ) : (
                      <>
                        <PanelLeftClose className="w-4 h-4" />
                        <span className="text-[11px]">{t("nav.collapse")}</span>
                      </>
                    )}
                  </button>
                </div>
              </aside>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none"
                aria-label={t("accessibility.openMenu")}
                aria-expanded={mobileSidebarOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
              </>
            )}
            <main
              id="main"
              className="flex-1 overflow-auto overflow-x-hidden min-w-0 bg-[var(--bg-base)] flex flex-col"
              tabIndex={-1}
              role="main"
            >
              {!isOnboarding && (
                <div className="sticky top-0 z-10 shrink-0 flex items-center justify-end gap-1.5 px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)]/80 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setCommandPaletteOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-btn)] text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none"
                    aria-label={t("nav.shortcutCommandPalette")}
                  >
                    <CommandIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-medium">⌘K</span>
                  </button>
                  <NotificationCenter
                    open={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    onToggle={() => setShowNotifications((s) => !s)}
                  />
                </div>
              )}
              <div className="flex-1 min-h-0">
                <TranslatedErrorBoundary>
                  <PageTransition>{children}</PageTransition>
                </TranslatedErrorBoundary>
              </div>
            </main>
          </div>
          {!isOnboarding && (
            <>
              <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-default)] safe-area-pb"
                aria-label={t("accessibility.mobileNav")}
              >
                {mobileTabs.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-inset focus-visible:outline-none rounded-lg transition-colors duration-150",
                        active ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {active && (
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-[var(--accent-primary)]" />
                      )}
                      <div className="relative">
                        <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2 : 1.5} aria-hidden />
                        {href === "/app/calls" && activeCalls > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[var(--accent-secondary)] opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent-secondary)]" />
                          </span>
                        )}
                      </div>
                      <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                        {label}
                        {href === "/app/calls" && activeCalls > 0 ? ` · ${activeCalls}` : ""}
                      </span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(true)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-inset focus-visible:outline-none rounded-lg transition-colors duration-150",
                    isMoreActive ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]"
                  )}
                  aria-label={t("accessibility.moreMenu")}
                  aria-expanded={mobileMoreOpen}
                >
                  {isMoreActive && (
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-[var(--accent-primary)]" />
                  )}
                  <Menu className="w-5 h-5 shrink-0 mx-auto" strokeWidth={isMoreActive ? 2 : 1.5} aria-hidden />
                  <span className={cn("text-[10px]", isMoreActive ? "font-semibold" : "font-medium")}>{t("nav.more")}</span>
                </button>
              </nav>
              {/* ⌘K hint removed — already shown in sidebar footer and top bar */}
              {mobileMoreOpen && (
                <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("accessibility.moreMenu")}>
                  <div
                    className="absolute inset-0 bg-[var(--bg-hover)]"
                    onClick={() => setMobileMoreOpen(false)}
                    onKeyDown={(e) => e.key === "Escape" && setMobileMoreOpen(false)}
                  />
                  <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl">
                    <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                      <span className="text-sm font-medium text-[var(--text-primary)]">More</span>
                      <button
                        type="button"
                        onClick={() => setMobileMoreOpen(false)}
className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none"
                                        aria-label={t("accessibility.closeMoreMenu")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <nav className="p-2" aria-label={t("accessibility.morePages")}>
                      {mobileMoreLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileMoreOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none ${
                            isActive(href) ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                          {href === "/app/inbox" && inboxUnread > 0 ? `Inbox (${inboxUnread})` : label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              )}
              {showShortcuts && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-hover)] backdrop-blur-sm"
                  onClick={() => setShowShortcuts(false)}
                >
                  <div
                    className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                        {t("nav.shortcutsHeading")}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowShortcuts(false)}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-muted)]"
                        aria-label={t("accessibility.closeShortcutsHelp")}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {[
                        { id: "palette", keys: ["⌘", "K"], labelKey: "nav.shortcutCommandPalette" as const },
                        { id: "dashboard", keys: ["⌘", "1"], labelKey: "nav.shortcutDashboard" as const },
                        { id: "agents", keys: ["⌘", "2"], labelKey: "nav.shortcutAgents" as const },
                        { id: "calls", keys: ["⌘", "3"], labelKey: "nav.shortcutCalls" as const },
                        { id: "leads", keys: ["⌘", "4"], labelKey: "nav.shortcutLeads" as const },
                        { id: "campaigns", keys: ["⌘", "5"], labelKey: "nav.shortcutCampaigns" as const },
                        { id: "inbox", keys: ["⌘", "6"], labelKey: "nav.shortcutInbox" as const },
                        { id: "help", keys: ["?"], labelKey: "nav.shortcutHelp" as const },
                      ].map((shortcut) => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between py-1.5"
                        >
                          <span className="text-sm text-[var(--text-muted)]">
                            {t(shortcut.labelKey)}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key) => (
                              <kbd
                                key={key}
                                className="bg-[var(--bg-inset)] border border-[var(--border-default)] px-2 py-1 rounded-lg text-xs text-[var(--text-primary)] font-mono min-w-[28px] text-center"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-5 pt-4 border-t border-[var(--border-default)]">
                      Press{" "}
                      <kbd className="bg-[var(--bg-inset)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)]">
                        Esc
                      </kbd>{" "}
                      or{" "}
                      <kbd className="bg-[var(--bg-inset)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)]">
                        ?
                      </kbd>{" "}
                      to close
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
      </OnboardingStepProvider>
    </WorkspaceProvider>
  );
}

function OnboardingSidebar({ initialWorkspaceName }: { initialWorkspaceName?: string }) {
  const t = useTranslations();
  const ctx = useOnboardingStep();
  const step = ctx?.step ?? 1;
  const setStep = ctx?.setStep;

  return (
    <aside className="hidden md:flex md:w-52 flex-col shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-default)] py-5 px-4">
      <Link href="/" className="flex flex-col items-center gap-1 mb-6">
        <div className="w-10 h-10 bg-[var(--accent-primary)] rounded-lg flex items-center justify-center">
          <span className="text-[var(--text-on-accent)] font-bold text-sm">RT</span>
        </div>
        <WorkspaceName initialName={initialWorkspaceName} className="text-[10px] text-[var(--text-secondary)] text-center block" />
      </Link>
      <nav className="flex-1" aria-label={t("accessibility.onboardingSteps")}>
        <div className="flex flex-col gap-0">
          {ONBOARDING_STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isComplete = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => setStep?.(stepNum)}
                className="flex items-center gap-3 w-full text-left rounded-lg py-1 -ml-1 pl-1 hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${stepNum}: ${label}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isComplete
                        ? "bg-green-500 text-[var(--text-primary)]"
                        : isCurrent
                          ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                          : "bg-[var(--bg-input)] text-[var(--text-tertiary)]"
                    } ${isCurrent ? "ring-2 ring-white/50" : ""}`}
                  >
                    {isComplete ? <Check className="w-3 h-3" /> : stepNum}
                  </div>
                  {i < ONBOARDING_STEP_LABELS.length - 1 && (
                    <div className={`w-0.5 min-h-[14px] ${step > stepNum ? "bg-green-500/50" : "bg-[var(--border-default)]"}`} />
                  )}
                </div>
                <span
                  className={`text-sm py-1 ${
                    isComplete ? "text-[var(--text-primary)]" : isCurrent ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-2">
        <div className="px-3 py-2 rounded-lg bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20">
          <span className="block text-xs font-medium text-[var(--text-primary)]">Starter · Free Trial</span>
          <span className="block text-[10px] text-[var(--text-secondary)]">14-day trial</span>
        </div>
      </div>
    </aside>
  );
}
