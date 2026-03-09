"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceProvider } from "@/components/WorkspaceContext";
import { WorkspaceName } from "@/components/WorkspaceName";
import { fetchWorkspaceMeCached, primeWorkspaceMeCache } from "@/lib/client/workspace-me";
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
  Menu,
  X,
  Lightbulb,
  Bot,
  type LucideIcon,
} from "lucide-react";
import {
  OnboardingStepProvider,
  useOnboardingStep,
  ONBOARDING_STEP_LABELS,
} from "./OnboardingStepContext";

const SIDEBAR_GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Main",
    items: [
      { href: "/app/activity", label: "Dashboard", icon: LayoutList },
      { href: "/app/agents", label: "Agents", icon: Bot },
      { href: "/app/calls", label: "Calls", icon: PhoneCall },
      { href: "/app/leads", label: "Leads", icon: Users },
      { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
      { href: "/app/appointments", label: "Appointments", icon: Calendar },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/app/call-intelligence", label: "Call Intelligence", icon: Lightbulb },
      { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/app/team", label: "Team", icon: Users },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const MOBILE_TABS = [
  { href: "/app/activity", label: "Dashboard", icon: LayoutList },
  { href: "/app/calls", label: "Calls", icon: PhoneCall },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
] as const;

const MOBILE_MORE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/agents", label: "Agents", icon: Bot },
  { href: "/app/appointments", label: "Appointments", icon: Calendar },
  { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/app/call-intelligence", label: "Call Intelligence", icon: Lightbulb },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

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
  const [workspaceMeta, setWorkspaceMeta] = useState<AppShellWorkspaceMeta>(initialWorkspaceMeta ?? null);
  const [workspaceMetaLoaded, setWorkspaceMetaLoaded] = useState(Boolean(initialWorkspaceMeta));
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const inboxUnread = 0;

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
      const localOnboarded = localStorage.getItem("rt_onboarded") === "true";
      if (!serverOnboarded && !localOnboarded) {
        router.replace("/app/onboarding");
      }
    } catch {
      // ignore
    }
  }, [workspaceMetaLoaded, pathname, router, workspaceMeta?.onboardingCompletedAt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      if (!isMeta) return;
      const key = event.key.toLowerCase();

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
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMoreOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/app/activity" && pathname.startsWith(href));

  const isMoreActive = MOBILE_MORE_LINKS.some(({ href }) => isActive(href));
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
              aria-label="Workspace status"
            >
              <span>{workspaceMeta.banner.text}</span>
              <Link
                href={workspaceMeta.banner.href || "/app/settings/phone"}
                className="font-medium text-white underline underline-offset-2 hover:no-underline"
              >
                {workspaceMeta.banner.cta || "Set up →"}
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
                className={`fixed inset-y-0 left-0 z-40 w-[220px] flex flex-col shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-default)] transform transition-transform duration-200 ease-out ${
                  mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                } md:relative md:translate-x-0`}
                aria-label="App navigation"
              >
                <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-black font-bold text-sm">RT</span>
                    </div>
                    <WorkspaceName
                      initialName={initialWorkspaceName}
                      className="truncate block text-[15px] font-semibold text-[var(--text-primary)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="flex-1 p-3 space-y-4 overflow-y-auto" aria-label="App navigation">
                  {SIDEBAR_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map(({ href, label, icon: Icon }) => {
                          const effectiveLabel =
                            href === "/app/inbox" && inboxUnread > 0 ? `Inbox (${inboxUnread})` : label;
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`flex items-center gap-2.5 border-l-2 py-2.5 px-3 rounded-r-xl text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none ${
                                isActive(href)
                                  ? "border-l-[var(--accent-blue)] bg-white/[0.08] text-[var(--text-primary)]"
                                  : "border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                              {effectiveLabel}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
                <div className="p-3 border-t border-[var(--border-default)] space-y-2">
                  <div className="rounded-lg bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 px-3 py-2">
                    <span className="block text-xs font-medium text-[var(--text-primary)]">Starter · Trial</span>
                    <span className="block text-[12px] text-[var(--text-secondary)]">
                      12 days left
                      {(workspaceMeta?.stats?.calls ?? 0) > 0
                        ? ` · ${workspaceMeta?.stats?.calls ?? 0} calls answered`
                        : ""}
                    </span>
                  </div>
                </div>
              </aside>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                aria-label="Open menu"
                aria-expanded={mobileSidebarOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
              </>
            )}
            <main
              id="main"
              className="flex-1 overflow-auto min-w-0 bg-[var(--bg-base)]"
              tabIndex={-1}
              role="main"
            >
              {children}
            </main>
          </div>
          {!isOnboarding && (
            <>
              <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-[var(--bg-surface)] border-t border-[var(--border-default)] safe-area-pb"
                aria-label="Mobile navigation"
              >
                {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:ring-inset focus-visible:outline-none rounded-lg ${
                    isActive(href) ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                    aria-current={isActive(href) ? "page" : undefined}
                  >
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden />
                    <span className="text-[10px] font-medium">{label}</span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(true)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:ring-inset focus-visible:outline-none rounded-lg ${
                    isMoreActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                  aria-label="More menu"
                  aria-expanded={mobileMoreOpen}
                >
                  <Menu className="w-5 h-5 shrink-0 mx-auto" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-medium">More</span>
                </button>
              </nav>
              {mobileMoreOpen && (
                <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="More menu">
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
className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                                        aria-label="Close more menu"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <nav className="p-2" aria-label="More pages">
                      {MOBILE_MORE_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileMoreOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none ${
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
            </>
          )}
        </div>
        {commandPaletteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-label="Quick navigation"
            onClick={() => setCommandPaletteOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card-elevated)] shadow-2xl p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Quick navigation
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Press ⌘ + 1–4 to jump between core views.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {[
                  { href: "/app/activity", label: "Dashboard", shortcut: "⌘1" },
                  { href: "/app/agents", label: "Agents", shortcut: "⌘2" },
                  { href: "/app/calls", label: "Calls", shortcut: "⌘3" },
                  { href: "/app/leads", label: "Leads", shortcut: "⌘4" },
                ].map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      setCommandPaletteOpen(false);
                      router.push(item.href);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-tertiary)]">
                      {item.shortcut}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </OnboardingStepProvider>
    </WorkspaceProvider>
  );
}

function OnboardingSidebar({ initialWorkspaceName }: { initialWorkspaceName?: string }) {
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
      <nav className="flex-1" aria-label="Onboarding steps">
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
                className="flex items-center gap-3 w-full text-left rounded-lg py-1 -ml-1 pl-1 hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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
