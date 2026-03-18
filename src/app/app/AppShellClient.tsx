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
  Calendar,
  BarChart3,
  BookOpen,
  Settings,
  Building2,
  Menu,
  X,
  Lightbulb,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Command as CommandIcon,
  HelpCircle,
  ListOrdered,
  } from "lucide-react";
import { cn } from "@/lib/cn";
import { PageTransition } from "@/components/ui/PageTransition";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { TranslatedErrorBoundary } from "@/components/ErrorBoundary";
import { initErrorReporting } from "@/lib/error-reporting";
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
          { href: "/app/calls", label: t("nav.calls"), icon: PhoneCall },
          { href: "/app/contacts", label: t("nav.contacts"), icon: Users },
          { href: "/app/inbox", label: t("nav.inbox"), icon: MessageSquare },
          { href: "/app/calendar", label: t("nav.calendar"), icon: Calendar },
          { href: "/app/follow-ups", label: "Follow-Ups", icon: ListOrdered },
          { href: "/app/campaigns", label: t("nav.campaigns"), icon: Megaphone },
          { href: "/app/analytics", label: t("nav.analytics"), icon: BarChart3 },
          { href: "/app/settings", label: t("nav.settings"), icon: Settings },
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
      { href: "/app/inbox", label: t("nav.inbox"), icon: MessageSquare },
    ],
    [t]
  );
  const mobileMoreLinks = useMemo(
    () => [
      { href: "/app/agents", label: t("nav.agents"), icon: Bot },
      { href: "/app/appointments", label: t("nav.appointments"), icon: Calendar },
      { href: "/app/campaigns", label: t("nav.campaigns"), icon: Megaphone },
      { href: "/app/analytics", label: t("nav.analytics"), icon: BarChart3 },
      { href: "/app/knowledge", label: t("nav.knowledge"), icon: BookOpen },
      { href: "/app/call-intelligence", label: t("nav.callIntelligence"), icon: Lightbulb },
      { href: "/app/team", label: t("nav.team"), icon: Users },
      { href: "/app/agency", label: t("nav.agency"), icon: Building2 },
      { href: "/app/settings", label: t("nav.settings"), icon: Settings },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = safeGetItem("rt_sidebar");
      return stored === "collapsed";
    } catch {
      return false;
    }
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const inboxUnread = 0;

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      safeSetItem("rt_sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };

  useEffect(() => {
    initErrorReporting();
  }, []);

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
    if (!workspaceMetaLoaded || pathname === "/app/onboarding") return;
    try {
      const serverOnboarded = Boolean(workspaceMeta?.onboardingCompletedAt);
      const localOnboarded = safeGetItem("rt_onboarded") === "true";
      if (!serverOnboarded && !localOnboarded) {
        router.replace("/app/onboarding");
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
          .then((billing: { minutes_used?: number; minutes_limit?: number } | null) => {
            if (billing && typeof billing.minutes_used === "number") {
              setMinutesUsage({ used: billing.minutes_used, limit: billing.minutes_limit ?? 400 });
            }
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
  const isOnboarding = pathname === "/app/onboarding";

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
                className="font-medium text-white underline underline-offset-2 hover:no-underline"
              >
                {workspaceMeta.banner.cta || t("nav.setupCta")}
              </Link>
            </div>
          )}
          {mobileSidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/50 md:hidden"
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
                  "fixed inset-y-0 left-0 z-40 flex flex-col shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-default)] transform transition-all duration-200 ease-out",
                  mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
                  "md:relative md:translate-x-0",
                  sidebarCollapsed ? "md:w-16" : "md:w-[220px]",
                  "w-[220px] md:transition-[width]"
                )}
                aria-label={t("accessibility.appNav")}
              >
                <div className={cn(
                  "border-b border-[var(--border-default)] flex items-center gap-2 shrink-0 transition-all duration-200",
                  sidebarCollapsed ? "md:justify-center md:px-0 p-5 md:p-3" : "p-5 justify-between"
                )}>
                  <div className={cn("flex items-center min-w-0", sidebarCollapsed && "md:justify-center")}>
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-black font-bold text-sm">RT</span>
                    </div>
                    {!sidebarCollapsed && (
                      <WorkspaceName
                        initialName={initialWorkspaceName}
                        className="truncate block text-[15px] font-semibold text-[var(--text-primary)] ml-2"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
                    aria-label={t("common.close")}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="flex-1 p-3 space-y-4 overflow-y-auto" aria-label={t("nav.appNavigation")}>
                  {sidebarGroups.map((group) => (
                    <div key={group.label}>
                      {!sidebarCollapsed && (
                        <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] px-4 pt-6 pb-1.5 font-medium">
                          {group.label}
                        </p>
                      )}
                      <div className="space-y-0.5">
                        {group.items.map(({ href, label, icon: Icon }) => {
                          const effectiveLabel =
                            href === "/app/inbox" && inboxUnread > 0 ? `Inbox (${inboxUnread})` : label;
                          const active = isActive(href);
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={cn(
                                "flex items-center border-l-2 py-2.5 rounded-r-xl text-[13px] font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none",
                                sidebarCollapsed ? "md:justify-center md:px-0 md:pl-0 md:pr-0 px-3" : "gap-2.5 px-3",
                                active
                                  ? "border-l-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                                  : "border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]"
                              )}
                              aria-current={active ? "page" : undefined}
                            >
                              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                              {!sidebarCollapsed && <span>{effectiveLabel}</span>}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
                <div className="p-3 border-t border-[var(--border-default)] space-y-2">
                  {!sidebarCollapsed && (
                    <>
                      <div className="rounded-lg bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 px-3 py-2">
                        <span className="block text-xs font-medium text-[var(--text-primary)]">Starter · Trial</span>
                        <span className="block text-[12px] text-[var(--text-secondary)]">
                          12 days left
                          {(workspaceMeta?.stats?.calls ?? 0) > 0
                            ? ` · ${workspaceMeta?.stats?.calls ?? 0} calls answered`
                            : ""}
                        </span>
                        {minutesUsage && (
                          <span className="block text-[11px] text-[var(--text-tertiary)] mt-1">
                            {minutesUsage.used}/{minutesUsage.limit} min used
                          </span>
                        )}
                      </div>
                      <a href="mailto:support@recall-touch.com" className="block text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-1">
                        support@recall-touch.com
                      </a>
                      <div className="px-1 pt-1 text-[10px] text-zinc-500">
                        <kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded text-zinc-400">
                          ⌘
                        </kbd>
                        <kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded text-zinc-400 ml-0.5">
                          K
                        </kbd>
                        <span className="ml-1.5">{t("accessibility.quickSearch")}</span>
                      </div>
                      <div className="pt-2">
                        <LanguageSwitcher className="w-full" />
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={toggleSidebarCollapse}
                    className={cn(
                      "hidden md:flex w-full items-center justify-center gap-2 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none",
                      sidebarCollapsed && "md:justify-center"
                    )}
                    aria-label={sidebarCollapsed ? t("accessibility.expandSidebar") : t("accessibility.collapseSidebar")}
                  >
                    {sidebarCollapsed ? (
                      <PanelLeftOpen className="w-4 h-4" />
                    ) : (
                      <>
                        <PanelLeftClose className="w-4 h-4" />
                        <span className="text-xs">{t("nav.collapse")}</span>
                      </>
                    )}
                  </button>
                </div>
              </aside>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
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
                <div className="sticky top-0 z-10 shrink-0 flex items-center justify-end gap-2 px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)]/80 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setCommandPaletteOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03] border border-[var(--border-default)] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none"
                    aria-label={t("nav.shortcutCommandPalette")}
                  >
                    <CommandIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">⌘K</span>
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
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-[var(--bg-surface)] border-t border-[var(--border-default)] safe-area-pb"
                aria-label={t("accessibility.mobileNav")}
              >
                {mobileTabs.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-inset focus-visible:outline-none rounded-lg ${
                    isActive(href) ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                    aria-current={isActive(href) ? "page" : undefined}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden />
                      {href === "/app/calls" && activeCalls > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[var(--accent-secondary)] opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent-secondary)]" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium">
                      {label}
                      {href === "/app/calls" && activeCalls > 0 ? ` · ${activeCalls}` : ""}
                    </span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(true)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-inset focus-visible:outline-none rounded-lg ${
                    isMoreActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                  aria-label={t("accessibility.moreMenu")}
                  aria-expanded={mobileMoreOpen}
                >
                  <Menu className="w-5 h-5 shrink-0 mx-auto" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-medium">{t("nav.more")}</span>
                </button>
              </nav>
              <div className="hidden md:block border-t border-[var(--border-default)] px-4 py-2 text-[10px] text-[var(--text-tertiary)]">
                <kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                  ⌘
                </kbd>
                <kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[var(--text-muted)] ml-0.5">
                  K
                </kbd>
                <span className="ml-1.5">{t("accessibility.quickSearch")}</span>
              </div>
              {mobileMoreOpen && (
                <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("accessibility.moreMenu")}>
                  <div
                    className="absolute inset-0 bg-black/60"
                    onClick={() => setMobileMoreOpen(false)}
                    onKeyDown={(e) => e.key === "Escape" && setMobileMoreOpen(false)}
                  />
                  <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl">
                    <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                      <span className="text-sm font-medium text-[var(--text-primary)]">More</span>
                      <button
                        type="button"
                        onClick={() => setMobileMoreOpen(false)}
className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
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
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none ${
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
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowShortcuts(false)}
                >
                  <div
                    className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md shadow-2xl"
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
                                className="bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg text-xs text-[var(--text-primary)] font-mono min-w-[28px] text-center"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-5 pt-4 border-t border-white/[0.06]">
                      Press{" "}
                      <kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                        Esc
                      </kbd>{" "}
                      or{" "}
                      <kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
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
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <span className="text-black font-bold text-sm">RT</span>
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
                className="flex items-center gap-3 w-full text-left rounded-lg py-1 -ml-1 pl-1 hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${stepNum}: ${label}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-white text-black"
                          : "bg-[var(--bg-input)] text-[var(--text-tertiary)]"
                    } ${isCurrent ? "ring-2 ring-white/50" : ""}`}
                  >
                    {isComplete ? "✓" : stepNum}
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
          <span className="block text-xs font-medium text-[var(--text-primary)]">Starter · Trial</span>
          <span className="block text-[10px] text-[var(--text-secondary)]">14 days left</span>
        </div>
      </div>
    </aside>
  );
}
